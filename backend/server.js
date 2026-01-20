import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY not found in .env file');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Create Payment Intent
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, userId, userName, userEmail } = req.body;

    if (!amount || amount < 50) {
      return res.status(400).json({ 
        error: 'Amount must be at least ₹50' 
      });
    }

    const amountInPaise = Math.round(amount * 100);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPaise,
      currency: 'inr',
      metadata: {
        userId: userId || 'guest',
        userName: userName || 'Anonymous',
        userEmail: userEmail || 'no-email'
      },
      payment_method_types: ['card'],
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Payment Intent Error:', error.message);
    res.status(500).json({ 
      error: error.message
    });
  }
});

// Verify Payment Status
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment Intent ID required' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    res.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata
    });

  } catch (error) {
    console.error('Verification Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint for Stripe events
app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    let event;

    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = req.body;
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        // Handle successful payment
        break;
      case 'payment_intent.payment_failed':
        // Handle failed payment
        break;
    }

    res.json({received: true});
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});