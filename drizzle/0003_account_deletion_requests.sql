CREATE TABLE `account_deletion_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`notes` text,
	`confirmation` integer NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`notification_status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "account_deletion_requests_status_check" CHECK("account_deletion_requests"."status" in ('new', 'verifying', 'approved', 'completed', 'rejected', 'closed')),
	CONSTRAINT "account_deletion_requests_notification_status_check" CHECK("account_deletion_requests"."notification_status" in ('pending', 'sent', 'failed', 'not_configured'))
);
--> statement-breakpoint
CREATE INDEX `account_deletion_requests_email_idx` ON `account_deletion_requests` (`email`);--> statement-breakpoint
CREATE INDEX `account_deletion_requests_status_idx` ON `account_deletion_requests` (`status`);--> statement-breakpoint
CREATE INDEX `account_deletion_requests_created_at_idx` ON `account_deletion_requests` (`created_at`);--> statement-breakpoint
PRAGMA optimize;
