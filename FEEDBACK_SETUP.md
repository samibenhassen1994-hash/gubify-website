# Gubify feedback setup

The feedback feature uses the existing Cloudflare D1 database and the existing `COUNT` binding. No additional Cloudflare resource is required.

## 1. Apply the migration manually

Review `drizzle/0002_brave_nightshade.sql`, then apply pending migrations to the existing production database:

```bash
npx wrangler d1 migrations apply gubify-pre-registrations --remote
```

Do not run this command until the migration has been reviewed and the intended Cloudflare account is selected.

## 2. Verify the table and indexes

```bash
npx wrangler d1 execute gubify-pre-registrations --remote --command "SELECT name, type, sql FROM sqlite_schema WHERE name = 'feedback_reports' OR name LIKE 'feedback_reports_%' ORDER BY type, name;"
```

## 3. Test the endpoint

Use the public `/feedback` page so Cloudflare Turnstile supplies a valid token. A direct API request without a valid token must be rejected. The endpoint accepts only `POST /api/feedback`; there is no public feedback-reading endpoint.

## 4. Administrative queries

Recent bug reports:

```sql
SELECT id, title, status, created_at, contact_email
FROM feedback_reports
WHERE type = 'bug'
ORDER BY created_at DESC;
```

Recent feature suggestions:

```sql
SELECT id, title, usefulness, beneficiary, status, created_at, contact_email
FROM feedback_reports
WHERE type = 'feature'
ORDER BY created_at DESC;
```

Run a reviewed query with:

```bash
npx wrangler d1 execute gubify-pre-registrations --remote --command "SELECT id, type, title, status, created_at FROM feedback_reports ORDER BY created_at DESC LIMIT 50;"
```

## 5. Update report status

Allowed statuses are `new`, `reviewing`, `planned`, `resolved`, and `closed`.

```bash
npx wrangler d1 execute gubify-pre-registrations --remote --command "UPDATE feedback_reports SET status = 'reviewing', updated_at = unixepoch() * 1000 WHERE id = 'REPORT_ID';"
```

## 6. Delete a report

Confirm the exact report ID before deletion:

```bash
npx wrangler d1 execute gubify-pre-registrations --remote --command "DELETE FROM feedback_reports WHERE id = 'REPORT_ID';"
```

## 7. Attachments

Feedback attachments are not supported. The feature does not create or use R2 buckets and stores no uploaded files.
