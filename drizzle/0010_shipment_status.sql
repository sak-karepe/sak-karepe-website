ALTER TABLE `orders` ADD `shipment_status` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `tracking_url` text;--> statement-breakpoint
-- Pesanan yang resinya sudah dibuat sebelum status "dikirim" dipakai untuk masa menunggu kurir.
UPDATE `orders` SET `status` = 'dikirim' WHERE `status` = 'dibayar' AND `shipment_id` IS NOT NULL;