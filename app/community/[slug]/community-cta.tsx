"use client";

import { useSyncExternalStore } from "react";

import { communityLaunchTarget } from "../../../lib/gubify-app-links";

import styles from "./community.module.css";

type CommunityCtaProps = {
  slug: string;
};

const subscribeToClientEnvironment = () => () => {};

export default function CommunityCta({ slug }: CommunityCtaProps) {
  const target = useSyncExternalStore(
    subscribeToClientEnvironment,
    () => communityLaunchTarget(slug, window.navigator.userAgent),
    () => null,
  );

  if (!target) return null;

  function openCommunity() {
    window.location.assign(target);
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
