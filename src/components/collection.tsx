import { getCatalog } from "@/lib/catalog";
import { CollectionFilter } from "./collection-filter";
export async function Collection({ showAllCategories = false }: { showAllCategories?: boolean }) {
  const catalog = await getCatalog();
  const choices = (showAllCategories ? catalog : catalog.slice(0, 4)).map((category) => ({
    category: category.slug,
    title: category.title,
    subtitle: category.subtitle,
    src: category.coverImage,
    description: category.description,
    photoIndex: Math.max(0, category.photos.findIndex((photo) => photo.src === category.coverImage)),
  }));
  return <CollectionFilter choices={choices} />;
}
