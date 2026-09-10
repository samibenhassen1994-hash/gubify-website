import Link from "next/link";
import styles from "./home.module.css";

export default function SectionNav() {
  return (
    <nav className={styles.bubbleNav} aria-label="Explore Gubify features">
      <a className={styles.bubblePrivate} href="#private-gubs">Private Gubs</a>
      <a className={styles.bubbleCommunity} href="#communities">Communities</a>
      <a className={styles.bubbleAsk} href="#ask-best-answer">Ask &amp; Best Answer</a>
      <a className={styles.bubbleLeaderboard} href="#leaderboard">Leaderboard</a>
      <Link className={styles.bubbleExplore} href="/communities">Explore Communities</Link>
    </nav>
  );
}
