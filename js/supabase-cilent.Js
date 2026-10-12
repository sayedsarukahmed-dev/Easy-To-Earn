/* ============================================================
   SUPABASE-CLIENT.JS
   Creates the shared Supabase client used by the whole app.
   Depends on the supabase-js library loaded via CDN in index.html,
   and on SUPABASE_URL / SUPABASE_ANON_KEY defined in config.js.
   ============================================================ */

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
