const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).end();

  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid' || session.status === 'complete') {
      const user_id = session.metadata?.user_id;
      const customer_id = session.customer;

      if (user_id) {
        // Update plan — do this first, separately, so it always succeeds
        await supabase
          .from('profiles')
          .update({ plan: 'paid' })
          .eq('id', user_id);

        // Best-effort: store stripe customer id (column may not exist yet)
        if (customer_id) {
          await supabase
            .from('profiles')
            .update({ stripe_customer_id: customer_id })
            .eq('id', user_id);
        }
      }

      return res.status(200).json({ paid: true });
    }

    return res.status(200).json({ paid: false });
  } catch (err) {
    console.error('Verify payment error:', err);
    return res.status(500).json({ error: err.message });
  }
};
