"use client";

import { communityLaunchTarget } from "../../../lib/gubify-app-links";

import styles from "./community.module.css";

type CommunityCtaProps = {
  slug: string;
};

export default function CommunityCta({ slug }: CommunityCtaProps) {
  function openCommunity() {
    const target = communityLaunchTarget(slug, window.navigator.userAgent);
    if (target) window.location.assign(target);
  }

  return (
    <button
      className={styles.cta}
      type="button"
      aria-disabled="false"
      onClick={openCommunity}
    >
      Entra nella community
    </button>
  );
}
