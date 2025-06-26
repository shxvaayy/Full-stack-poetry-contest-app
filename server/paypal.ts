import { Router } from 'express';

const router = Router();

// PayPal configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.paypal.com' 
  : 'https://api.sandbox.paypal.com';

console.log('🔧 PayPal Configuration Check:');
console.log('- Client ID exists:', !!PAYPAL_CLIENT_ID);
console.log('- Client Secret exists:', !!PAYPAL_CLIENT_SECRET);
console.log('- Base URL:', PAYPAL_BASE_URL);
console.log('- Environment:', process.env.NODE_ENV);

// Get PayPal access token
async function getPayPalAccessToken() {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error('PayPal credentials not configured properly');
    }

    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    
    console.log('🔑 Requesting PayPal access token...');
    
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
      },
      body: 'grant_type=client_credentials'
    });

    const responseText = await response.text();
    console.log('PayPal token response status:', response.status);

    if (!response.ok) {
      console.error('PayPal token error response:', responseText);
      throw new Error(`PayPal token request failed: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log('✅ PayPal access token obtained successfully');
    return data.access_token;
  } catch (error) {
    console.error('❌ Error getting PayPal access token:', error);
    throw error;
  }
}

// Create PayPal order
router.post('/api/create-paypal-order', async (req, res) => {
  try {
    console.log('📥 PayPal order creation request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers host:', req.get('host'));
    console.log('Request protocol:', req.protocol);

    const { amount, tier, currency = 'USD' } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      console.error('❌ Invalid amount:', amount);
      return res.status(400).json({ 
        success: false, 
        error: 'Valid amount is required' 
      });
    }

    if (!tier) {
      console.error('❌ Missing tier');
      return res.status(400).json({ 
        success: false, 
        error: 'Tier is required' 
      });
    }

    // Check PayPal configuration
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      console.error('❌ PayPal not configured');
      return res.status(500).json({ 
        success: false, 
        error: 'PayPal payment system not configured' 
      });
    }

    let accessToken;
    try {
      accessToken = await getPayPalAccessToken();
    } catch (tokenError: any) {
      console.error('❌ Failed to get access token:', tokenError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to authenticate with PayPal',
        details: tokenError.message
      });
    }

    // Better INR to USD conversion with multiple tiers
    let usdAmount;
    if (currency === 'USD') {
      usdAmount = amount.toString();
    } else {
      // Convert INR to USD based on amount tiers
      if (amount <= 50) {
        usdAmount = '0.60'; // ₹50 = $0.60
      } else if (amount <= 100) {
        usdAmount = '1.20'; // ₹100 = $1.20
      } else if (amount <= 500) {
        usdAmount = (amount * 0.012).toFixed(2); // General conversion
      } else {
        usdAmount = (amount * 0.012).toFixed(2);
      }
    }
    
    console.log(`💰 Converting ₹${amount} to $${usdAmount} USD`);

    // Determine the correct base URL for callbacks
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://writory.onrender.com'
      : `${req.protocol}://${req.get('host')}`;

    console.log('🌐 Using base URL for callbacks:', baseUrl);

    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: usdAmount
        },
        description: `Writory Poetry Contest - ${tier} tier (₹${amount})`,
        custom_id: `${tier}_${Date.now()}`, // Add custom ID for tracking
        invoice_id: `writory_${Date.now()}` // Add invoice ID
      }],
      application_context: {
        return_url: `${baseUrl}/payment-success`,
        cancel_url: `${baseUrl}/payment-cancel`,
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        brand_name: 'Writory Poetry Contest',
        locale: 'en-US',
        landing_page: 'BILLING'
      }
    };

    console.log('🔄 Creating PayPal order with data:', JSON.stringify(orderData, null, 2));

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'PayPal-Request-Id': `writory-${Date.now()}`, // Add request ID for idempotency
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(orderData)
    });

    const responseText = await response.text();
    console.log('PayPal order response status:', response.status);
    console.log('PayPal order response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    console.log('PayPal order response body:', responseText);

    let order;
    try {
      order = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse PayPal response:', parseError);
      return res.status(500).json({ 
        success: false, 
        error: 'Invalid response from PayPal',
        details: responseText,
        responseStatus: response.status
      });
    }

    if (response.ok && order.id) {
      console.log('✅ PayPal order created successfully:', order.id);
      
      const approvalUrl = order.links?.find((link: any) => link.rel === 'approve')?.href;
      
      if (!approvalUrl) {
        console.error('❌ No approval URL found in PayPal response');
        console.log('Available links:', order.links);
        return res.status(500).json({ 
          success: false, 
          error: 'PayPal did not provide approval URL',
          orderDetails: order
        });
      }

      console.log('✅ PayPal approval URL:', approvalUrl);

      res.json({
        success: true,
        orderId: order.id,
        approvalUrl: approvalUrl,
        amount: {
          inr: amount,
          usd: usdAmount
        },
        status: order.status
      });
    } else {
      console.error('❌ PayPal order creation failed:', order);
      
      let errorMessage = 'Failed to create PayPal order';
      let errorDetails = order;

      if (order.details && Array.isArray(order.details)) {
        errorMessage = order.details.map((detail: any) => detail.description).join(', ');
        errorDetails = order.details;
      } else if (order.message) {
        errorMessage = order.message;
      }

      res.status(response.status || 400).json({ 
        success: false,
        error: errorMessage, 
        details: errorDetails,
        responseStatus: response.status
      });
    }

  } catch (error: any) {
    console.error('❌ Unexpected error creating PayPal order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create PayPal order',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Payment system error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Verify PayPal payment (new endpoint)
router.post('/api/verify-paypal-payment', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order ID is required' 
      });
    }

    const accessToken = await getPayPalAccessToken();

    console.log('🔍 Verifying PayPal order:', orderId);

    // Get order details
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const orderData = await response.json();
    console.log('PayPal order verification response:', orderData);

    if (response.ok && orderData.status === 'APPROVED') {
      console.log('✅ PayPal order verified and approved:', orderId);
      
      // Capture the payment
      console.log('🔄 Capturing PayPal payment...');
      const captureResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Prefer': 'return=representation'
        }
      });

      const captureData = await captureResponse.json();
      console.log('PayPal capture response:', captureData);

      if (captureResponse.ok && captureData.status === 'COMPLETED') {
        console.log('✅ PayPal payment captured successfully');
        res.json({
          success: true,
          orderId: orderId,
          captureId: captureData.purchase_units[0].payments.captures[0].id,
          amount: captureData.purchase_units[0].payments.captures[0].amount,
          status: captureData.status
        });
      } else {
        console.error('❌ PayPal payment capture failed:', captureData);
        throw new Error('Failed to capture PayPal payment');
      }
    } else {
      console.error('❌ PayPal order verification failed:', orderData);
      res.status(400).json({ 
        success: false,
        error: 'PayPal order verification failed', 
        details: orderData,
        orderStatus: orderData.status
      });
    }

  } catch (error: any) {
    console.error('❌ Error verifying PayPal payment:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to verify PayPal payment',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Payment system error'
    });
  }
});

// Capture PayPal payment
router.post('/api/capture-paypal-payment', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order ID is required' 
      });
    }

    const accessToken = await getPayPalAccessToken();

    console.log('🔄 Capturing PayPal payment:', orderId);

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Prefer': 'return=representation'
      }
    });

    const captureData = await response.json();
    console.log('PayPal capture response:', captureData);

    if (response.ok && captureData.status === 'COMPLETED') {
      console.log('✅ PayPal payment captured:', orderId);
      res.json({
        success: true,
        orderId: orderId,
        captureId: captureData.purchase_units[0].payments.captures[0].id,
        amount: captureData.purchase_units[0].payments.captures[0].amount,
        status: captureData.status
      });
    } else {
      console.error('❌ PayPal payment capture failed:', captureData);
      res.status(400).json({ 
        success: false,
        error: 'Failed to capture PayPal payment', 
        details: captureData 
      });
    }

  } catch (error: any) {
    console.error('❌ Error capturing PayPal payment:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to capture PayPal payment',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Payment system error'
    });
  }
});

// PayPal success/cancel routes
router.get('/payment-success', async (req, res) => {
  try {
    const { token, PayerID } = req.query;
    console.log('✅ PayPal payment success callback received');
    console.log('Query parameters:', { token, PayerID });
    console.log('Full query:', req.query);

    if (token) {
      const redirectUrl = `/submit?paypal_order_id=${token}&payment_success=true`;
      console.log('Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
    } else {
      console.error('❌ No token received in success callback');
      res.redirect(`/submit?payment_error=true&message=${encodeURIComponent('Invalid payment token')}`);
    }
  } catch (error: any) {
    console.error('❌ PayPal success callback error:', error);
    res.redirect(`/submit?payment_error=true&message=${encodeURIComponent('Payment processing error')}`);
  }
});

router.get('/payment-cancel', (req, res) => {
  console.log('❌ PayPal payment cancelled');
  console.log('Cancel query parameters:', req.query);
  res.redirect('/submit?payment_cancelled=true');
});

export { router as paypalRouter };