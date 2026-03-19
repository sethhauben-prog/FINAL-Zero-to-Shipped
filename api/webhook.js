const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Disable body parsing so we get the raw bytes for signature verification
module.exports.config = {
  api: { bodyParser: false }
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ── Payment successful → upgrade user to paid
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const user_id = session.metadata?.user_id;
    const customer_id = session.customer;

    if (user_id) {
      const { error } = await supabase
        .from('profiles')
        .update({ plan: 'paid', stripe_customer_id: customer_id })
        .eq('id', user_id);

      if (error) console.error('Supabase update error:', error);
    }
  }

  // ── Subscription cancelled → downgrade to free
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const customer_id = sub.customer;

    if (customer_id) {
      const { error } = await supabase
        .from('profiles')
        .update({ plan: 'free' })
        .eq('stripe_customer_id', customer_id);

      if (error) console.error('Supabase update error:', error);
    }
  }

  // ── Payment failed → downgrade to free
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const customer_id = invoice.customer;

    if (customer_id) {
      const { error } = await supabase
        .from('profiles')
        .update({ plan: 'free' })
        .eq('stripe_customer_id', customer_id);

      if (error) console.error('Supabase update error:', error);
    }
  }

  res.status(200).json({ received: true });
};
