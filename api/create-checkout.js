module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { user_id, user_email } = req.body;
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

  const origin = req.headers.origin || 'https://final-zero-to-shipped.vercel.app';
  const priceId = process.env.STRIPE_PRICE_ID || 'price_1TCVlwRd9CH6pmHOiKuhGWIq';

  const params = new URLSearchParams({
    mode: 'subscription',
    'payment_method_types[]': 'card',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'metadata[user_id]': user_id,
    'subscription_data[metadata][user_id]': user_id,
    success_url: `${origin}/web-apps.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/web-apps.html?payment=cancelled`,
  });

  if (user_email) params.set('customer_email', user_email);

  try {
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();
    if (session.error) throw new Error(session.error.message);

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
