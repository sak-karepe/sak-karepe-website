CREATE TABLE `regions` (
	`code` text PRIMARY KEY NOT NULL,
	`parent_code` text,
	`level` integer NOT NULL,
	`name` text NOT NULL,
	`postal_code` text
);
--> statement-breakpoint
CREATE INDEX `regions_parent_idx` ON `regions` (`parent_code`);--> statement-breakpoint
ALTER TABLE `addresses` ADD `village` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `addresses` ADD `village_code` text;