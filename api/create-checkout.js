const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  // Allow CORS for same-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { user_id, user_email } = req.body;

  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const origin = req.headers.origin || 'https://final-zero-to-shipped.vercel.app';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID || 'price_1TCVlwRd9CH6pmHOiKuhGWIq',
          quantity: 1
        }
      ],
      customer_email: user_email || undefined,
      metadata: { user_id },
      subscription_data: { metadata: { user_id } },
      success_url: `${origin}/web-apps.html?payment=success`,
      cancel_url: `${origin}/web-apps.html?payment=cancelled`
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message });
  }
};
