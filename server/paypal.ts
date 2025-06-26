
import { Router } from 'express';

const router = Router();

// PayPal configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.paypal.com' 
  : 'https://api.sandbox.paypal.com';

// Get PayPal access token
async function getPayPalAccessToken() {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('❌ Error getting PayPal access token:', error);
    throw error;
  }
}

// Create PayPal order
router.post('/api/create-paypal-order', async (req, res) => {
  try {
    const { amount, tier, currency = 'USD' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    if (!tier) {
      return res.status(400).json({ error: 'Tier is required' });
    }

    const accessToken = await getPayPalAccessToken();

    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: amount.toString()
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

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    });

    const order = await response.json();

    if (response.ok) {
      console.log('✅ PayPal order created:', order.id);
      res.json({
        success: true,
        orderId: order.id,
        approvalUrl: order.links.find((link: any) => link.rel === 'approve')?.href
      });
    } else {
      console.error('❌ PayPal order creation failed:', order);
      res.status(400).json({ error: 'Failed to create PayPal order', details: order });
    }

  } catch (error: any) {
    console.error('❌ Error creating PayPal order:', error);
    res.status(500).json({ 
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
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const accessToken = await getPayPalAccessToken();

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
      res.status(400).json({ error: 'Failed to capture PayPal payment', details: captureData });
    }

  } catch (error: any) {
    console.error('❌ Error capturing PayPal payment:', error);
    res.status(500).json({ 
      error: 'Failed to capture PayPal payment',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Payment system error'
    });
  }
});

// Verify PayPal webhook (optional - for production)
router.post('/api/paypal-webhook', async (req, res) => {
  try {
    console.log('📥 PayPal webhook received:', req.body);
    
    // Handle different webhook events
    const { event_type, resource } = req.body;
    
    switch (event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        console.log('✅ Payment capture completed:', resource.id);
        // Handle successful payment
        break;
      case 'PAYMENT.CAPTURE.DENIED':
        console.log('❌ Payment capture denied:', resource.id);
        // Handle failed payment
        break;
      default:
        console.log('📝 Unhandled webhook event:', event_type);
    }

    res.status(200).json({ received: true });

  } catch (error: any) {
    console.error('❌ Error processing PayPal webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export { router as paypalRouter };
