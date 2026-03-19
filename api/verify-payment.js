// Only verifies with Stripe — client handles the Supabase update
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).end();

  const { session_id } = req.query;
  if (!session_id) {
    return res.status(400).json({ paid: false, error: 'Missing session_id' });
  }

  console.log('verify-payment called, session_id:', session_id);
  console.log('STRIPE_SECRET_KEY present:', !!process.env.STRIPE_SECRET_KEY);

  try {
    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${session_id}`,
      { headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
    );

    const session = await stripeRes.json();
    console.log('Stripe session status:', session.status, 'payment_status:', session.payment_status);

    if (session.error) {
      console.error('Stripe error:', session.error.message);
      return res.status(200).json({ paid: false, error: session.error.message });
    }

    const paid = session.payment_status === 'paid' || session.status === 'complete';
    return res.status(200).json({ paid });

  } catch (err) {
    console.error('verify-payment error:', err.message);
    return res.status(500).json({ paid: false, error: err.message });
  }
};
