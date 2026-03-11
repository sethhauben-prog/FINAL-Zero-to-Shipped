const SUPABASE_URL = 'https://acpzzaikuoyjyfayqxic.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjcHp6YWlrdW95anlmYXlxeGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMTI1ODcsImV4cCI6MjA4ODY4ODU4N30.HS52IlfdSJiCVt6jOhHVc1-qOpmx-1wadmurT5_hrRg';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { flowType: 'implicit' }
});
