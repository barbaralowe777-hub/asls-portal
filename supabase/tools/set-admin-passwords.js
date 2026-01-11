// One-time helper to set temporary passwords for existing users (admins).
// Run locally with SERVICE_ROLE_KEY in the environment; do NOT commit the key.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ktdxqyhklnsahjsgrhud.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY; // optional: set to test login

// List the admins you want to unlock with a temporary password.
// Update this array before running.
const admins = [
  { email: "admin@asls.net.au", password: "TempPass123!" },
  { email: "john@asls.net.au", password: "TempPass123!" },
  // Add more as needed
];

async function main() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const supabaseAnon = ANON_KEY
    ? createClient(SUPABASE_URL, ANON_KEY)
    : null;

  // Fetch up to 1000 users; adjust paging if you have more.
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw error;

  for (const { email, password } of admins) {
    const user = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!user) {
      console.log(`Not found: ${email}`);
      continue;
    }
    const { error: updErr } = await supabase.auth.admin.updateUserById(
      user.id,
      { password }
    );
    if (updErr) {
      console.error(`Failed ${email}: ${updErr.message}`);
    } else {
      console.log(`Set temp password for ${email}`);
      // Optional: verify the password works via the public/anon client
      if (supabaseAnon) {
        const { data: login, error: loginErr } =
          await supabaseAnon.auth.signInWithPassword({ email, password });
        if (loginErr) {
          console.error(`Login test failed for ${email}: ${loginErr.message}`);
        } else {
          console.log(`Login test OK for ${email}, got session:`, !!login.session);
        }
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
