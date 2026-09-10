import type { Metadata } from "next";

import LegalFooter from "../legal-footer";
import SiteHeader from "../site-header";

import CommunityCatalog from "./community-catalog";
import styles from "./communities.module.css";

export const metadata: Metadata = {
  title: "Explore Communities | Gubify",
  description:
    "Discover public Gubify Communities around the interests, ideas and people you care about.",
  alternates: { canonical: "/communities" },
};

export default function CommunitiesPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="communities-title">
          <span className={styles.eyebrow}>Public Communities</span>
          <h1 id="communities-title">Explore Communities</h1>
          <p>
            Find welcoming spaces around the interests, ideas and people that
            matter to you.
          </p>
        </section>
        <CommunityCatalog />
      </main>
      <LegalFooter />
    </>
  );
}
