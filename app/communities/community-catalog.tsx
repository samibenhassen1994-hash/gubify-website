"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { PublicCommunityCatalogItem } from "../../lib/community-catalog";
import {
  filterAndSortCommunities,
  getCatalogCategories,
  getCatalogLanguages,
  type CommunityCatalogFilters,
} from "../../lib/community-catalog-client";

import styles from "./communities.module.css";

const initialFilters: CommunityCatalogFilters = {
  search: "",
  category: "All",
  language: "All",
  access: "All",
  sort: "Popular",
};

function accessModeLabel(accessMode: PublicCommunityCatalogItem["accessMode"]) {
  return accessMode === "open" ? "Open" : "Approval";
}

export default function CommunityCatalog() {
  const [communities, setCommunities] = useState<PublicCommunityCatalogItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    let active = true;
    void fetch("/api/communities", {
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Community catalog unavailable");
        return response.json() as Promise<{ communities?: unknown }>;
      })
      .then((payload) => {
        if (!active || !Array.isArray(payload.communities)) {
          if (active) setLoadError(true);
          return;
        }
        setCommunities(payload.communities as PublicCommunityCatalogItem[]);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const languages = useMemo(
    () => (communities ? getCatalogLanguages(communities) : []),
    [communities],
  );
  const categories = useMemo(
    () => (communities ? getCatalogCategories(communities) : []),
    [communities],
  );
  const results = useMemo(
    () => (communities ? filterAndSortCommunities(communities, filters) : []),
    [communities, filters],
  );

  if (loadError) {
    return (
      <section className={styles.catalog} aria-labelledby="catalog-status">
        <p className={styles.error} id="catalog-status" role="alert">
          Communities are temporarily unavailable. Please try again later.
        </p>
      </section>
    );
  }

  if (!communities) {
    return (
      <section className={styles.catalog} aria-labelledby="catalog-status">
        <p className={styles.loading} id="catalog-status" role="status">
          Loading communities…
        </p>
      </section>
    );
  }

  return (
    <section className={styles.catalog} aria-labelledby="catalog-controls-title">
      <h2 className={styles.visuallyHidden} id="catalog-controls-title">
        Community catalog
      </h2>
      <div className={styles.controls}>
        <label className={styles.searchField}>
          <span>Search communities</span>
          <input
            type="search"
            value={filters.search}
            placeholder="Search by name or description"
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
        </label>
        <label>
          <span>Category</span>
          <select
            value={filters.category}
            onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
          >
            <option value="All">All categories</option>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
        <label>
          <span>Language</span>
          <select
            value={filters.language}
            onChange={(event) => setFilters((current) => ({ ...current, language: event.target.value }))}
          >
            <option value="All">All languages</option>
            {languages.map((language) => <option key={language}>{language}</option>)}
          </select>
        </label>
        <label>
          <span>Access</span>
          <select
            value={filters.access}
            onChange={(event) => setFilters((current) => ({
              ...current,
              access: event.target.value as CommunityCatalogFilters["access"],
            }))}
          >
            <option value="All">All access</option>
            <option value="Open">Open</option>
            <option value="Approval">Approval</option>
          </select>
        </label>
        <label>
          <span>Sort by</span>
          <select
            value={filters.sort}
            onChange={(event) => setFilters((current) => ({
              ...current,
              sort: event.target.value as CommunityCatalogFilters["sort"],
            }))}
          >
            <option value="Popular">Popular</option>
            <option value="Newest">Newest</option>
            <option value="A-Z">A–Z</option>
          </select>
        </label>
      </div>

      <p className={styles.resultCount} aria-live="polite">
        {results.length} {results.length === 1 ? "Community" : "Communities"}
      </p>

      {results.length === 0 ? (
        <p className={styles.empty}>No Communities match these filters yet.</p>
      ) : (
        <div className={styles.grid}>
          {results.map((community) => (
            <Link className={styles.card} href={`/community/${community.slug}`} key={community.slug}>
              {community.imageUrl ? (
                <img
                  className={styles.image}
                  src={community.imageUrl}
                  alt={`${community.name} Community`}
                  width={320}
                  height={180}
                />
              ) : null}
              <div className={styles.cardBody}>
                <div className={styles.cardMeta}>
                  {community.type ? <span>{community.type}</span> : null}
                  <span>{community.language}</span>
                  <span>{accessModeLabel(community.accessMode)}</span>
                </div>
                <h3>{community.name}</h3>
                <p>{community.description}</p>
                {community.memberCount !== undefined ? (
                  <small>{new Intl.NumberFormat().format(community.memberCount)} members</small>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
