import Link from "next/link";
import styles from "./home.module.css";
import GubPhone from "./gub-phone";
import PurpleAvatar from "./purple-avatar";

export default function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="home-hero-title">
      <div className={styles.heroGlowOne} aria-hidden="true" />
      <div className={styles.heroGlowTwo} aria-hidden="true" />
      <div className={styles.heroCopy}>
        <span className={styles.kicker}>One app. Two ways to connect.</span>
        <h1 id="home-hero-title">
          Find your people. <span>Build your space.</span>
        </h1>
        <p>
          Private Gubs for the people closest to you. Communities for everyone who shares what you love.
        </p>
        <div className={styles.heroActions}>
          <a className={styles.primaryButton} href="#two-ways">Explore Gubify</a>
          <Link className={styles.secondaryButton} href="/communities">Explore Communities</Link>
        </div>
        <Link className={styles.textLink} href="/pre-register">Pre-register for Gubify <span aria-hidden="true">→</span></Link>
      </div>

      <div className={styles.heroVisual}>
        <div className={`${styles.heroAvatar} ${styles.heroAvatarOne} ${styles.float}`}><PurpleAvatar variant="sprout" expression="curious" /></div>
        <div className={`${styles.heroAvatar} ${styles.heroAvatarTwo} ${styles.drift}`}><PurpleAvatar variant="arch" expression="happy" /></div>
        <div className={`${styles.heroAvatar} ${styles.heroAvatarThree} ${styles.float}`}><PurpleAvatar variant="drop" expression="proud" /></div>
        <div className={`${styles.floatingChip} ${styles.chipAsk}`}>Ask</div>
        <div className={`${styles.floatingChip} ${styles.chipBest}`}>★ Best Answer</div>
        <div className={`${styles.floatingChip} ${styles.chipXp}`}>+120 XP</div>
        <div className={`${styles.floatingChip} ${styles.chipDiscover}`}>⌕ Discover</div>
        <GubPhone />
      </div>
    </section>
  );
}
