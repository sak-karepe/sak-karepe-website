ALTER TABLE `orders` ADD `import_batch_id` text;--> statement-breakpoint
CREATE INDEX `orders_import_batch_idx` ON `orders` (`import_batch_id`);