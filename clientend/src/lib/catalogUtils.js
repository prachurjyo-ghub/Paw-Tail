export const slugifyCategory = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

export function getAnimalGroupKeys(name = "") {
  const base = name.toString().trim().toLowerCase();
  if (!base) return [];

  const keys = new Set([base]);
  if (base.endsWith("s")) keys.add(base.slice(0, -1));
  else keys.add(`${base}s`);

  return [...keys];
}

export function getSubcategoryBySlug(animal, subcategorySlug) {
  if (!animal?.categories?.length) return "";
  if (!subcategorySlug) return animal.categories[0];

  return (
    animal.categories.find((category) => slugifyCategory(category) === subcategorySlug) ||
    animal.categories[0]
  );
}
