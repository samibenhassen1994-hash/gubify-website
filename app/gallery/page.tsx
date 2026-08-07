import type { Metadata } from "next";
import SiteHeader from "../site-header";
import LegalFooter from "../legal-footer";
import GalleryContent from "./gallery-content";
import styles from "./gallery.module.css";

export const metadata: Metadata = {
  title: "Gallery | Gubify",
  description:
    "See Gubify in action through app screenshots, feature artwork and product videos.",
  alternates: { canonical: "/gallery" },
  openGraph: {
    title: "Gallery | Gubify",
    description:
      "Explore Gubify screenshots, feature artwork and videos showing how groups turn conversations into action.",
    url: "https://gubify.com/gallery",
    siteName: "Gubify",
    type: "website",
  },
};

export default function GalleryPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Gubify Gallery</span>
          <h1>See Gubify in action.</h1>
          <p>
            Screens, feature previews and short videos that show how Gubify helps
            groups organise plans, tasks, budgets and everyday conversations.
          </p>
        </section>
        <GalleryContent />
      </main>
      <LegalFooter />
    </>
  );
}
