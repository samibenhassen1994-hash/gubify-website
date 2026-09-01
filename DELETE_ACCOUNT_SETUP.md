# Gubify account deletion request setup

The public `/delete-account` page lets users request account deletion when they cannot use the in-app `Account → Delete account` flow.

Requests are protected by Cloudflare Turnstile, stored in the existing `COUNT` D1 database, and optionally emailed to the Gubify privacy inbox through Resend.

## 1. Apply the D1 schema change

Review `drizzle/0003_account_deletion_requests.sql`, then apply that exact file to the production D1 database:

```bash
npx wrangler d1 execute gubify-pre-registrations --remote --file drizzle/0003_account_deletion_requests.sql
```

Verify the table and indexes:

```bash
npx wrangler d1 execute gubify-pre-registrations --remote --command "SELECT name, type, sql FROM sqlite_schema WHERE name = 'account_deletion_requests' OR name LIKE 'account_deletion_requests_%' ORDER BY type, name;"
```

Do not apply the SQL file twice. Confirm the intended Cloudflare account/database before running the command.

## 2. Configure email notifications

Create a Resend account, verify a sender on `gubify.com`, then add the API key as a Cloudflare secret:

```bash
npx wrangler secret put RESEND_API_KEY
```

Configure these runtime values in the Cloudflare Worker/Pages environment:

```text
DELETE_REQUEST_FROM_EMAIL=Gubify <no-reply@gubify.com>
DELETE_REQUEST_TO_EMAIL=privacy@gubify.com
```

`DELETE_REQUEST_FROM_EMAIL` must use a sender/domain accepted by Resend.

The API always stores a valid request in D1 before attempting the email notification. If email is temporarily unavailable, the request remains stored and `notification_status` records that state.

## 3. Turnstile

The feature reuses the existing site Turnstile configuration:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` on the client
- `TURNSTILE_SECRET_KEY` on the Worker

Do not place the Turnstile secret or Resend API key in source control.

## 4. Review requests

Recent requests:

```sql
SELECT id, email, display_name, status, notification_status, created_at
FROM account_deletion_requests
ORDER BY created_at DESC;
```

Example command:

```bash
npx wrangler d1 execute gubify-pre-registrations --remote --command "SELECT id, email, status, notification_status, created_at FROM account_deletion_requests ORDER BY created_at DESC LIMIT 50;"
```

## 5. Manual handling

A web submission is a request, not immediate deletion. Before deleting an account:

1. verify that the requester controls the relevant Gubify account or can otherwise establish ownership;
2. identify the correct Gubify account;
3. perform the account/data deletion using the approved Gubify deletion process;
4. update the request status to `completed` only after deletion is complete;
5. keep only records that are still necessary for legal, security, fraud-prevention or dispute purposes.

Allowed statuses are `new`, `verifying`, `approved`, `completed`, `rejected`, and `closed`.

Example:

```bash
npx wrangler d1 execute gubify-pre-registrations --remote --command "UPDATE account_deletion_requests SET status = 'verifying', updated_at = unixepoch() * 1000 WHERE id = 'REQUEST_ID';"
```
