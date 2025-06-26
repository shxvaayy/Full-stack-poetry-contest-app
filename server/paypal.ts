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
      },
      body: 'grant_type=client_credentials'
    });

    const responseText = await response.text();
    console.log('PayPal token response status:', response.status);
    console.log('PayPal token response body:', responseText);

    if (!response.ok) {
      throw new Error(`PayPal token request failed: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log('✅ PayPal access token obtained');
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

    // Convert INR to USD (rough conversion - you should use real exchange rates)
    const usdAmount = currency === 'USD' ? amount.toString() : (amount * 0.012).toFixed(2);
    
    console.log(`💰 Converting ₹${amount} to $${usdAmount}`);

    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: usdAmount
        },
        description: `Writory Contest - ${tier} tier submission`
      }],
      application_context: {
        return_url: `${req.protocol}://${req.get('host')}/payment-success`,
        cancel_url: `${req.protocol}://${req.get('host')}/payment-cancel`,
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW'
      }
    };

    console.log('🔄 Creating PayPal order with data:', JSON.stringify(orderData, null, 2));

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    });

    const responseText = await response.text();
    console.log('PayPal order response status:', response.status);
    console.log('PayPal order response body:', responseText);

    let order;
    try {
      order = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse PayPal response:', parseError);
      return res.status(500).json({ 
        success: false, 
        error: 'Invalid response from PayPal',
        details: responseText
      });
    }

    if (response.ok && order.id) {
      console.log('✅ PayPal order created successfully:', order.id);
      const approvalUrl = order.links?.find((link: any) => link.rel === 'approve')?.href;
      
      if (!approvalUrl) {
        console.error('❌ No approval URL found in PayPal response');
        return res.status(500).json({ 
          success: false, 
          error: 'PayPal did not provide approval URL' 
        });
      }

      res.json({
        success: true,
        orderId: order.id,
        approvalUrl: approvalUrl
      });
    } else {
      console.error('❌ PayPal order creation failed:', order);
      res.status(400).json({ 
        success: false,
        error: 'Failed to create PayPal order', 
        details: order.details || order.message || order
      });
    }

  } catch (error: any) {
    console.error('❌ Unexpected error creating PayPal order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create PayPal order',
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
      }
    });

    const captureData = await response.json();

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
    console.log('✅ PayPal payment success callback:', { token, PayerID });

    if (token) {
      res.redirect(`/submit?paypal_order_id=${token}&payment_success=true`);
    } else {
      res.redirect(`/submit?payment_error=true&message=${encodeURIComponent('Invalid payment token')}`);
    }
  } catch (error: any) {
    console.error('❌ PayPal success callback error:', error);
    res.redirect(`/submit?payment_error=true&message=${encodeURIComponent('Payment processing error')}`);
  }
});

router.get('/payment-cancel', (req, res) => {
  console.log('❌ PayPal payment cancelled');
  res.redirect('/submit?payment_cancelled=true');
});

export { router as paypalRouter };