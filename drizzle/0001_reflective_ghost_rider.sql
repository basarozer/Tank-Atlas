CREATE TABLE `atlas_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`tank_id` text NOT NULL,
	`text` text NOT NULL,
	`note_date` text NOT NULL,
	`created_at` text NOT NULL,
	`author` text NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `atlas_records` ADD `record_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `atlas_records_record_key_unique` ON `atlas_records` (`record_key`);