// Stamp — site settings. This file is public: never put secret keys here.
window.STAMP_CONFIG = {
  // Supabase → Project Settings → API (or "API Keys").
  // The anon / publishable key is meant to be public: the database rules protect the data.
  // NEVER paste the service_role / secret key here.
  SUPABASE_URL: 'https://ejxwootgjwuynhsgvovw.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_tCyunVHlnzM_fRZHO5tv7g_haFP10M3',   // e.g. 'eyJhbGciOi...' or 'sb_publishable_...'

  // Must equal current_privacy_version() in supabase/schema.sql.
  PRIVACY_VERSION: '2026-10-04',
  PRIVACY_URL: 'privacy.html',

  // Shown in the footer. Use an inbox you actually read (privacy requests go here).
  CONTACT_EMAIL: 'contact.wizard.io@gmail.com',

  // Leave empty until payments are connected: the Pro button will say "launching soon".
  CHECKOUT_URL: '',
};
