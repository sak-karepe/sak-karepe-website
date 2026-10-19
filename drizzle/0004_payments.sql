CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`invoice_number` text NOT NULL,
	`amount` integer NOT NULL,
	`url` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_invoice_number_unique` ON `payments` (`invoice_number`);--> statement-breakpoint
ALTER TABLE `orders` ADD `shipping_cost` integer;