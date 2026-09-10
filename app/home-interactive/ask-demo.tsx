"use client";

import { useState } from "react";
import styles from "./home.module.css";

const answers = [
  ["Maya", "Start with Flutter's official codelabs and build one tiny project."],
  ["Aisha", "Learn widgets and state first, then rebuild a screen you already use every day."],
  ["Josh", "Pick a small idea and learn each concept when the project needs it."],
] as const;

export default function AskDemo() {
  const [best, setBest] = useState<number | null>(null);
  const progress = best === null ? 62 : 76;

  return (
    <div className={styles.bigAskCard} aria-label="Interactive Best Answer and XP demo">
      <span className={styles.kicker}>Community Ask · Demo</span>
      <strong>What is the best way to start learning Flutter?</strong>
      <p>Pick the reply that helped the most. The selected member receives XP and recognition inside the Community.</p>
      <div>
        {answers.map(([name, text], index) => {
          const selected = best === index;
          return (
            <div className={`${styles.bigAnswer} ${selected ? styles.best : ""}`} key={name}>
              <div><b>{name}</b>{selected && <span>★ Best Answer</span>}</div>
              <p>{text}</p>
              {best === null && <button type="button" onClick={() => setBest(index)}>Select best answer</button>}
            </div>
          );
        })}
      </div>
      <div className={styles.xpPanel} aria-live="polite">
        <div><span>Level 7</span><strong>{best === null ? "620 XP" : "+140 XP · 760 XP"}</strong></div>
        <div className={styles.xpTrack}><i style={{ width: `${progress}%` }} /></div>
        <p>{best === null ? "Choose the most helpful reply." : "Best Answer selected — contribution rewarded."}</p>
        {best !== null && <button type="button" onClick={() => setBest(null)}>Try again</button>}
      </div>
    </div>
  );
}
