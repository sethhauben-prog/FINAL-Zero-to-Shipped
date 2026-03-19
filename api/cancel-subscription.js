module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

  try {
    // Look up user's stripe_customer_id and email from Supabase
    const profileRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/profiles?id=eq.${user_id}&select=stripe_customer_id,email`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );
    const profiles = await profileRes.json();
    const profile = profiles && profiles[0];
    if (!profile) return res.status(404).json({ error: 'User not found' });

    let customerId = profile.stripe_customer_id;

    // If no stored customer ID, search Stripe by email
    if (!customerId && profile.email) {
      const searchRes = await fetch(
        `https://api.stripe.com/v1/customers/search?query=email:'${profile.email}'`,
        { headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
      );
      const searchData = await searchRes.json();
      if (searchData.data && searchData.data[0]) {
        customerId = searchData.data[0].id;
      }
    }

    if (!customerId) {
      return res.status(404).json({ error: 'No Stripe customer found for this account' });
    }

    // List active subscriptions for this customer
    const subsRes = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active`,
      { headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
    );
    const subs = await subsRes.json();

    if (!subs.data || subs.data.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Cancel all active subscriptions
    for (const sub of subs.data) {
      await fetch(`https://api.stripe.com/v1/subscriptions/${sub.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
      });
    }

    return res.status(200).json({ cancelled: true });
  } catch (err) {
    console.error('Cancel subscription error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
