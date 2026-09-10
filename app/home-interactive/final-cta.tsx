import Link from "next/link";
import styles from "./home.module.css";

export default function FinalCta() {
  return (
    <section className={styles.finalCta} id="coming-soon" aria-labelledby="final-title">
      <img className={styles.finalAvatarA} src="/home/avatars/avatar-fantasma.png" alt="" />
      <img className={styles.finalAvatarB} src="/home/avatars/avatar-bolla.png" alt="" />
      <img className={styles.finalAvatarC} src="/home/avatars/avatar-nano.png" alt="" />
      <div>
        <span className={styles.kicker}>One app · Two ways to connect</span>
        <h2 id="final-title">Your people are <span>out there.</span></h2>
        <p>Create your Private Gub with the people closest to you, or find a Community built around what you love.</p>
        <div className={styles.ctaRow}>
          <Link className={styles.primaryCta} href="/pre-register">Create your Private Gub</Link>
          <Link className={styles.secondaryCta} href="/communities">Explore Communities</Link>
        </div>
      </div>
      <div className={styles.finalClouds} aria-hidden="true" />
    </section>
  );
}
