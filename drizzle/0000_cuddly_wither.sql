CREATE TABLE `pre_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`first_name` text,
	`device_interest` text NOT NULL,
	`consent_version` text NOT NULL,
	`consent_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`utm_content` text,
	`utm_term` text,
	`landing_path` text,
	`status` text DEFAULT 'active' NOT NULL,
	CONSTRAINT "pre_registrations_device_interest_check" CHECK("pre_registrations"."device_interest" in ('android', 'ios', 'both', 'other')),
	CONSTRAINT "pre_registrations_status_check" CHECK("pre_registrations"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pre_registrations_email_unique` ON `pre_registrations` (`email`);--> statement-breakpoint
CREATE INDEX `pre_registrations_status_idx` ON `pre_registrations` (`status`);--> statement-breakpoint
CREATE INDEX `pre_registrations_utm_source_idx` ON `pre_registrations` (`utm_source`);--> statement-breakpoint
CREATE INDEX `pre_registrations_utm_campaign_idx` ON `pre_registrations` (`utm_campaign`);