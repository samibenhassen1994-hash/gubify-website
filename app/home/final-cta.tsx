import Link from "next/link";
import styles from "./home.module.css";
import PurpleAvatar from "./purple-avatar";

export default function FinalCta() {
  return (
    <section className={styles.finalCta} id="coming-soon" aria-labelledby="final-cta-title">
      <span className={styles.anchorTarget} id="about" aria-hidden="true" />
      <div className={styles.finalAvatarLeft}><PurpleAvatar variant="blob" expression="happy" /></div>
      <div className={styles.finalAvatarRight}><PurpleAvatar variant="sprout" expression="proud" /></div>
      <div>
        <span className={styles.kicker}>Ready when you are</span>
        <h2 id="final-cta-title">Your people are out there.</h2>
        <p>Create a Gub. Join a Community. Start connecting.</p>
        <div className={styles.heroActions}>
          <Link className={styles.primaryButton} href="/communities">Explore Communities</Link>
          <Link className={styles.secondaryButton} href="/pre-register">Pre-register</Link>
        </div>
      </div>
    </section>
  );
}
