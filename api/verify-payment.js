module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).end();

  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

  try {
    // Retrieve session from Stripe REST API — no npm package needed
    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${session_id}`,
      { headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
    );
    const session = await stripeRes.json();

    if (session.error) throw new Error(session.error.message);

    const isPaid = session.payment_status === 'paid' || session.status === 'complete';
    if (!isPaid) return res.status(200).json({ paid: false });

    const user_id = session.metadata?.user_id;
    if (user_id) {
      // Update plan via Supabase REST API — no npm package needed
      await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/profiles?id=eq.${user_id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ plan: 'paid' }),
        }
      );
    }

    return res.status(200).json({ paid: true });
  } catch (err) {
    console.error('Verify payment error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
