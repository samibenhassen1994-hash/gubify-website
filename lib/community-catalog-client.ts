import type { PublicCommunityCatalogItem } from "./community-catalog";

export const COMMUNITY_CATEGORY_OPTIONS = [
  "General",
  "Gaming",
  "Sport",
  "Music",
  "Study",
  "Travel",
  "Show",
  "Work",
  "Social",
  "Events",
  "Hobbies & Interests",
  "Technology",
  "Art & Creativity",
  "Movies & TV",
  "Books & Reading",
  "Food & Cooking",
  "Fitness & Wellness",
  "Other",
] as const;

const LEGACY_CATEGORY_OPTIONS = ["Friends", "Local"] as const;
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export type CommunityCatalogFilters = {
  search: string;
  category: string;
  language: string;
  access: "All" | "Open" | "Approval";
  sort: "Popular" | "Newest" | "A-Z";
};

function compareNameAndSlug(
  first: PublicCommunityCatalogItem,
  second: PublicCommunityCatalogItem,
): number {
  return collator.compare(first.name, second.name) || collator.compare(first.slug, second.slug);
}

export function getCatalogLanguages(
  communities: PublicCommunityCatalogItem[],
): string[] {
  return [...new Set(communities.map((community) => community.language))].sort(
    collator.compare,
  );
}

export function getCatalogCategories(
  communities: PublicCommunityCatalogItem[],
): string[] {
  const presentTypes = new Set(communities.flatMap((community) => community.type ? [community.type] : []));
  return [
    ...COMMUNITY_CATEGORY_OPTIONS,
    ...LEGACY_CATEGORY_OPTIONS.filter((type) => presentTypes.has(type)),
  ];
}

export function filterAndSortCommunities(
  communities: PublicCommunityCatalogItem[],
  filters: CommunityCatalogFilters,
): PublicCommunityCatalogItem[] {
  const search = filters.search.trim().toLocaleLowerCase();
  const filtered = communities.filter((community) => {
    const matchesSearch =
      !search ||
      community.name.toLocaleLowerCase().includes(search) ||
      community.description.toLocaleLowerCase().includes(search);
    const matchesCategory = filters.category === "All" || community.type === filters.category;
    const matchesLanguage = filters.language === "All" || community.language === filters.language;
    const matchesAccess =
      filters.access === "All" ||
      (filters.access === "Open" && community.accessMode === "open") ||
      (filters.access === "Approval" && community.accessMode === "approval");
    return matchesSearch && matchesCategory && matchesLanguage && matchesAccess;
  });

  return [...filtered].sort((first, second) => {
    if (filters.sort === "A-Z") return compareNameAndSlug(first, second);
    if (filters.sort === "Newest") {
      return (
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime() ||
        compareNameAndSlug(first, second)
      );
    }

    const firstHasCount = first.memberCount !== undefined;
    const secondHasCount = second.memberCount !== undefined;
    if (firstHasCount !== secondHasCount) return firstHasCount ? -1 : 1;
    return (
      (second.memberCount ?? 0) - (first.memberCount ?? 0) ||
      compareNameAndSlug(first, second)
    );
  });
}
