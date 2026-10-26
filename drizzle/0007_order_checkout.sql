DROP INDEX "orders_code_unique";--> statement-breakpoint
DROP INDEX "payments_invoice_number_unique";--> statement-breakpoint
DROP INDEX "products_slug_unique";--> statement-breakpoint
DROP INDEX "regions_parent_idx";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
ALTER TABLE `orders` ALTER COLUMN "recipient_name" TO "recipient_name" text;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_code_unique` ON `orders` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_invoice_number_unique` ON `payments` (`invoice_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `regions_parent_idx` ON `regions` (`parent_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `orders` ALTER COLUMN "phone" TO "phone" text;--> statement-breakpoint
ALTER TABLE `orders` ALTER COLUMN "shipping_address" TO "shipping_address" text;--> statement-breakpoint
ALTER TABLE `orders` ALTER COLUMN "postal_code" TO "postal_code" text;