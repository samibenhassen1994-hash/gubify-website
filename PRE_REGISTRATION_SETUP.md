# Pre-registration setup

The application code and D1 migration are ready, but no Cloudflare resource or
secret is created by this repository change.

## Required values

Create a Turnstile widget for `gubify.com` in the Cloudflare dashboard. Keep its
secret server-side.

For local development, create ignored files with:

```text
# .env.local
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
```

```text
# .dev.vars
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

Do not commit either file.

## Create and initialize D1

Authenticate Wrangler, create the database, and apply the generated migration:

```bash
npx wrangler login
npx wrangler d1 create gubify-pre-registrations
npx wrangler d1 execute gubify-pre-registrations --remote --file=drizzle/0000_cuddly_wither.sql
```

The create command prints the real database ID. Do not add a fabricated ID to
the repository. Connect the created database to the deployed Sites project
using the logical binding `DB` declared in `.openai/hosting.json`.

For a local D1 instance:

```bash
npx wrangler d1 execute gubify-pre-registrations --local --file=drizzle/0000_cuddly_wither.sql
```

If the initial migration has already been applied, add the privacy consent
columns with the incremental migration:

```bash
npx wrangler d1 execute gubify-pre-registrations --remote --file=drizzle/0001_polite_wallop.sql
```

## Configure hosted values

Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` as a build-time public environment value
for the Sites project. Add the secret as a Worker secret:

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
```

Confirm that the deployed Worker has:

- D1 binding `DB`, connected to `gubify-pre-registrations`;
- secret `TURNSTILE_SECRET_KEY`;
- build-time value `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.

Then rebuild and deploy through the existing Sites workflow.

## Pre-campaign privacy review

The form contains a concise notice describing the current data use. Before
running paid campaigns, add and review a dedicated Privacy page covering the
controller identity, contact details, legal basis, retention, removal requests,
processors, international transfers where applicable, and data-subject rights.
This implementation does not itself guarantee legal compliance.
