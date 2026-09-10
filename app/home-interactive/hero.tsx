import Link from "next/link";
import InteractivePhone from "./interactive-phone";
import SectionNav from "./section-nav";
import styles from "./home.module.css";
import refineStyles from "./refinement.module.css";

export default function Hero() {
  return (
    <section className={styles.hero} id="features" aria-labelledby="hero-title">
      <div className={styles.heroCopy}>
        <span className={styles.kicker}>Gubify · Private Gubs + Communities</span>
        <h1 id="hero-title">Build your world <span>together.</span></h1>
        <p>
          Create private spaces with the people you already know, or discover Communities built around what you love.
          Try the phone: every control in the demo works.
        </p>
        <div className={refineStyles.whiteInfoCard}>
          <h3>Private Gubs or Communities?</h3>
          <div className={refineStyles.infoColumns}>
            <div><strong>Private Gubs</strong><span>Chat, Tasks, Events, Proposals and Shared Budget with people you already know.</span></div>
            <div><strong>Communities</strong><span>Discover people by interest, Ask questions, earn XP and grow your reputation.</span></div>
          </div>
        </div>
        <div className={styles.ctaRow}>
          <a className={styles.primaryCta} href="#private-gubs">See Private Gubs</a>
          <Link className={styles.secondaryCta} href="/communities">Explore Communities</Link>
        </div>
      </div>

      <div className={styles.heroVisual}>
        <img className={`${styles.avatarArt} ${styles.avatarGhost} ${refineStyles.avatarClean}`} src="/home/avatars/avatar-fantasma.png" alt="" />
        <img className={`${styles.avatarArt} ${styles.avatarBubble} ${refineStyles.avatarClean}`} src="/home/avatars/avatar-bolla.png" alt="" />
        <img className={`${styles.avatarArt} ${styles.avatarNano} ${refineStyles.avatarClean}`} src="/home/avatars/avatar-nano.png" alt="" />
        <div className={refineStyles.phoneStage3d}>
          <InteractivePhone ariaLabel="Interactive Gubify demo with Private Gub and Community modes" />
        </div>
        <SectionNav />
      </div>
    </section>
  );
}
