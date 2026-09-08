"use client";

import { useEffect, useMemo, useRef } from "react";

import {
  ANDROID_STORE_URL,
  APP_DEEP_LINK,
  IOS_STORE_URL,
} from "../../../lib/gubify-app-links";

import styles from "./community.module.css";

type CommunityCtaProps = {
  slug: string;
};

const COMMUNITY_SLUG_PLACEHOLDER = "{slug}";

function storeFallback() {
  const userAgent = window.navigator.userAgent;
  if (/android/i.test(userAgent)) return ANDROID_STORE_URL;
  if (/iPad|iPhone|iPod/i.test(userAgent)) return IOS_STORE_URL;
  return "";
}

export default function CommunityCta({ slug }: CommunityCtaProps) {
  const fallbackTimer = useRef<number | null>(null);
  const deepLink = useMemo(
    () =>
      APP_DEEP_LINK.includes(COMMUNITY_SLUG_PLACEHOLDER)
        ? APP_DEEP_LINK.replace(
            COMMUNITY_SLUG_PLACEHOLDER,
            encodeURIComponent(slug),
          )
        : "",
    [slug],
  );
  const disabled = deepLink.length === 0;

  useEffect(
    () => () => {
      if (fallbackTimer.current !== null) {
        window.clearTimeout(fallbackTimer.current);
      }
    },
    [],
  );

  function openCommunity() {
    if (disabled) return;
    const fallback = storeFallback();
    window.location.assign(deepLink);
    if (fallback) {
      fallbackTimer.current = window.setTimeout(() => {
        if (document.visibilityState === "visible") {
          window.location.assign(fallback);
        }
      }, 1500);
    }
  }

  return (
    <button
      className={styles.cta}
      type="button"
      disabled={disabled}
      aria-disabled={disabled}
      onClick={openCommunity}
    >
      Entra nella community
    </button>
  );
}
