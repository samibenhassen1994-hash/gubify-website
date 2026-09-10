import Link from "next/link";
import styles from "./home.module.css";
import refineStyles from "./refinement.module.css";

export default function FinalCta() {
  return (
    <section className={styles.finalCta} id="coming-soon" aria-labelledby="final-title">
      <img className={`${styles.finalAvatarA} ${refineStyles.avatarClean}`} src="/home/avatars/avatar-fantasma.png" alt="" />
      <img className={`${styles.finalAvatarB} ${refineStyles.avatarClean}`} src="/home/avatars/avatar-bolla.png" alt="" />
      <img className={`${styles.finalAvatarC} ${refineStyles.avatarClean}`} src="/home/avatars/avatar-nano.png" alt="" />
      <div>
        <span className={styles.kicker}>One app · Two ways to connect</span>
        <h2 id="final-title">Your people are <span>out there.</span></h2>
        <p>Create your Private Gub with the people closest to you, or find a Community built around what you love.</p>
        <div className={refineStyles.whiteInfoCard}>
          <h3>Choose your path</h3>
          <div className={refineStyles.pathChoices}>
            <div><strong>Private Gub</strong><span>Build a private space for friends, family or your closest group.</span></div>
            <div><strong>Community</strong><span>Find people who share your interests and grow together.</span></div>
          </div>
        </div>
        <div className={styles.ctaRow}>
          <Link className={styles.primaryCta} href="/pre-register">Create your Private Gub</Link>
          <Link className={styles.secondaryCta} href="/communities">Explore Communities</Link>
        </div>
      </div>
      <div className={styles.finalClouds} aria-hidden="true" />
    </section>
  );
}
