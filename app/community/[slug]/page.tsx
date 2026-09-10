import type { Metadata } from "next";
import { notFound } from "next/navigation";

import LegalFooter from "../../legal-footer";
import SiteHeader from "../../site-header";
import { fetchPublicCommunityBySlug } from "../../../lib/community-public";
import { getCommunitySocialImage } from "../../../lib/community-social-image";

import styles from "./community.module.css";
import CommunityCta from "./community-cta";
import CommunityShare from "./community-share";

type CommunityPageProps = {
  params: Promise<{ slug: string }>;
};

function accessModeLabel(accessMode: string) {
  return accessMode === "open" ? "Open Community" : "Approval required";
}

export async function generateMetadata({
  params,
}: CommunityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await fetchPublicCommunityBySlug(slug);
  if (result.status === "not-found") notFound();
  if (result.status === "upstream-failure") {
    throw new Error("Unable to load the public Community.");
  }
  const community = result.community;
  const canonical = `/community/${community.slug}`;
  const title = `${community.name} | Gubify`;
  const socialImage = getCommunitySocialImage(community.imageUrl);
  const socialImageMetadata = socialImage
    ? {
        url: socialImage.url,
        alt: `${community.name} Community`,
        ...(socialImage.isCloudinary
          ? { width: 1200, height: 630, type: "image/jpeg" }
          : {}),
      }
    : null;

  return {
    title,
    description: community.description,
    alternates: { canonical },
    openGraph: {
      title,
      description: community.description,
      url: canonical,
      siteName: "Gubify",
      type: "website",
      images: socialImageMetadata ? [socialImageMetadata] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: community.description,
      images: socialImage ? [socialImage.url] : [],
    },
  };
}

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { slug } = await params;
  const result = await fetchPublicCommunityBySlug(slug);
  if (result.status === "not-found") notFound();
  if (result.status === "upstream-failure") {
    throw new Error("Unable to load the public Community.");
  }
  const community = result.community;

  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <article className={styles.card}>
          {community.imageUrl ? (
            <div className={styles.imageFrame}>
              <img
                src={community.imageUrl}
                alt={`${community.name} Community`}
                width={176}
                height={176}
              />
            </div>
          ) : null}
          <div className={styles.content}>
            <span className={styles.eyebrow}>Public Community</span>
            <h1>{community.name}</h1>
            {community.description ? (
              <p className={styles.description}>{community.description}</p>
            ) : null}
            <dl className={styles.details}>
              <div>
                <dt>Language</dt>
                <dd>{community.language}</dd>
              </div>
              <div>
                <dt>Access</dt>
                <dd>{accessModeLabel(community.accessMode)}</dd>
              </div>
            </dl>
            <CommunityCta slug={community.slug} />
            <CommunityShare
              slug={community.slug}
              communityName={community.name}
            />
          </div>
        </article>
      </main>
      <LegalFooter />
    </>
  );
}
