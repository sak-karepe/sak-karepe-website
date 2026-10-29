ALTER TABLE `orders` ADD `shipment_id` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `waybill_id` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `collection_method` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `delivered_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_shipment_id_unique` ON `orders` (`shipment_id`);