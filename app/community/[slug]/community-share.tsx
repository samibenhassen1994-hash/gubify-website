"use client";

import { useEffect, useRef, useState } from "react";

import {
  getCommunityShareFeedback,
  shareCommunity,
} from "../../../lib/community-share";

import styles from "./community.module.css";

type CommunityShareProps = {
  slug: string;
  communityName: string;
};

export default function CommunityShare({
  slug,
  communityName,
}: CommunityShareProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (feedbackTimer.current !== null) {
        window.clearTimeout(feedbackTimer.current);
      }
    },
    [],
  );

  function showFeedback(message: string) {
    setFeedback(message);
    if (feedbackTimer.current !== null) {
      window.clearTimeout(feedbackTimer.current);
    }
    feedbackTimer.current = window.setTimeout(() => {
      setFeedback(null);
      feedbackTimer.current = null;
    }, 3500);
  }

  async function handleShare() {
    setFeedback(null);
    const result = await shareCommunity({
      slug,
      communityName,
      navigatorLike: navigator,
    });
    const message = getCommunityShareFeedback(result);
    if (message) showFeedback(message);
  }

  return (
    <>
      <button
        className={styles.shareCta}
        type="button"
        onClick={() => void handleShare()}
      >
        Share Community
      </button>
      {feedback ? (
        <p className={styles.shareFeedback} role="status" aria-live="polite">
          {feedback}
        </p>
      ) : null}
    </>
  );
}
