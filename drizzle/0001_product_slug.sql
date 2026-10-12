ALTER TABLE `products` ADD `slug` text NOT NULL DEFAULT '';--> statement-breakpoint
-- Isi slug produk yang sudah ada dari namanya: huruf kecil, tanda baca dibuang, spasi jadi "-".
UPDATE `products` SET `slug` = trim(
  replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
    lower(trim(`name`)),
    '.', ''), ',', ''), '!', ''), '?', ''), ':', ''), ';', ''), '''', ''), '"', ''), '(', ''), ')', ''),
    '/', ' '), '&', ' '), ' ', '-'), '--', '-'),
  '-');--> statement-breakpoint
UPDATE `products` SET `slug` = 'produk-' || `id` WHERE `slug` = '';--> statement-breakpoint
-- Nama kembar diberi akhiran id agar slug tetap unik.
UPDATE `products` SET `slug` = `slug` || '-' || `id`
WHERE `slug` IN (SELECT `slug` FROM `products` GROUP BY `slug` HAVING count(*) > 1);--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);
