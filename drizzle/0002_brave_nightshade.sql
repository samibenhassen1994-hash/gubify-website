CREATE TABLE `feedback_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`usefulness` text,
	`steps_to_reproduce` text,
	`expected_behavior` text,
	`beneficiary` text,
	`contact_email` text,
	`app_version` text,
	`app_platform` text,
	`operating_system` text,
	`device_model` text,
	`browser` text,
	`browser_version` text,
	`language` text,
	`timezone` text,
	`viewport_width` integer,
	`viewport_height` integer,
	`page_url` text,
	`source_page` text,
	`origin` text DEFAULT 'web' NOT NULL,
	`site_build_identifier` text,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "feedback_reports_type_check" CHECK("feedback_reports"."type" in ('bug', 'feature')),
	CONSTRAINT "feedback_reports_origin_check" CHECK("feedback_reports"."origin" in ('web', 'app')),
	CONSTRAINT "feedback_reports_status_check" CHECK("feedback_reports"."status" in ('new', 'reviewing', 'planned', 'resolved', 'closed'))
);
--> statement-breakpoint
CREATE INDEX `feedback_reports_type_idx` ON `feedback_reports` (`type`);--> statement-breakpoint
CREATE INDEX `feedback_reports_status_idx` ON `feedback_reports` (`status`);--> statement-breakpoint
CREATE INDEX `feedback_reports_created_at_idx` ON `feedback_reports` (`created_at`);--> statement-breakpoint
PRAGMA optimize;
