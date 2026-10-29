CREATE TABLE `shipment_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`shipment_id` text NOT NULL,
	`waybill_id` text,
	`courier_name` text,
	`shipment_status` text,
	`note` text,
	`resend_paid_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `shipment_note` text;