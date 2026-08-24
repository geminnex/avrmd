#!/usr/bin/env node
/**
 * Grants a signed-in member posting rights over a catalog entity's group
 * (forum-as-the-org, blog, media) — the stand-in for claim review until that
 * has its own workflow. The user must already exist (have signed in once);
 * this script does not create accounts.
 *
 *   node --env-file=.env scripts/grant-membership.mjs <email> <entitySlug> [role]
 *
 * role defaults to "owner". Run again with a different role to change it —
 * the grant is idempotent per (entitySlug, user).
 */
import pg from "pg";

const [email, entitySlug, role = "owner"] = process.argv.slice(2);

if (!email || !entitySlug) {
  console.error("Usage: node --env-file=.env scripts/grant-membership.mjs <email> <entitySlug> [role]");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — pass --env-file=.env (or export it) before running this.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const { rows: users } = await pool.query(
    "select id, handle from users where email = $1",
    [email.toLowerCase().trim()],
  );

  if (users.length === 0) {
    console.error(`No account for ${email} — they need to sign in at least once first.`);
    process.exit(1);
  }

  const user = users[0];

  const { rows } = await pool.query(
    `insert into organization_memberships (entity_slug, user_id, role)
     values ($1, $2, $3)
     on conflict (entity_slug, user_id) do update set role = excluded.role
     returning id, role`,
    [entitySlug, user.id, role],
  );

  console.log(
    `Granted "${rows[0].role}" on ${entitySlug} to ${email} (@${user.handle ?? "no-handle"}).`,
  );
} finally {
  await pool.end();
}
