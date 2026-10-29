ALTER TABLE `orders` ADD `source` text DEFAULT 'online' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `customer_name` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `customer_phone` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `recorded_by` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `orders` ADD `external_ref` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `method` text DEFAULT 'doku' NOT NULL;--> statement-breakpoint
DROP INDEX "orders_code_unique";--> statement-breakpoint
DROP INDEX "orders_shipment_id_unique";--> statement-breakpoint
DROP INDEX "payments_invoice_number_unique";--> statement-breakpoint
DROP INDEX "products_slug_unique";--> statement-breakpoint
DROP INDEX "regions_parent_idx";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
ALTER TABLE `orders` ALTER COLUMN "user_id" TO "user_id" integer;--> statement-breakpoint
ALTER TABLE `payments` ALTER COLUMN "invoice_number" TO "invoice_number" text;--> statement-breakpoint
ALTER TABLE `payments` ALTER COLUMN "url" TO "url" text;--> statement-breakpoint
ALTER TABLE `payments` ALTER COLUMN "expires_at" TO "expires_at" integer;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_code_unique` ON `orders` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_shipment_id_unique` ON `orders` (`shipment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_source_external_ref_unique` ON `orders` (`source`,`external_ref`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_invoice_number_unique` ON `payments` (`invoice_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `regions_parent_idx` ON `regions` (`parent_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
