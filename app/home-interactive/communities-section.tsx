import Link from "next/link";
import styles from "./home.module.css";
import refineStyles from "./refinement.module.css";

export default function CommunitiesSection() {
  return (
    <section className={styles.section} id="communities" aria-labelledby="communities-title">
      <span id="about" aria-hidden="true" />
      <div className={`${styles.sectionGrid} ${styles.sectionGridReverse}`}>
        <div className={`${styles.sectionVisual} ${styles.communityScene}`} aria-label="Community discovery world">
          <div className={styles.orbit} aria-hidden="true" />
          <img className={`${styles.sceneAvatar} ${refineStyles.avatarClean}`} src="/home/avatars/avatar-fantasma.png" alt="" />
          <img className={`${styles.sceneAvatar} ${refineStyles.avatarClean}`} src="/home/avatars/avatar-bolla.png" alt="" />
          <div className={styles.sceneBubble}><b>🎮</b>Gaming</div>
          <div className={styles.sceneBubble}><b>💻</b>Tech</div>
          <div className={styles.sceneBubble}><b>♫</b>Music</div>
          <div className={styles.sceneBubble}><b>✈</b>Travel</div>
          <div className={styles.sceneBubble}><b>✦</b>Anime</div>
          <div className={styles.sceneBubble}><b>♥</b>Fitness</div>
        </div>

        <div className={styles.sectionCopy}>
          <span className={styles.kicker}>Communities</span>
          <h2 id="communities-title">Find people who <span>love what you love.</span></h2>
          <p>
            Search by interest, open a Community, join the conversation and use Ask when you need a useful answer.
            Helpful members build XP, level up and become recognizable inside their Community.
          </p>
          <div className={refineStyles.whiteInfoCard}>
            <h3>Inside a Community</h3>
            <ul>
              <li>Discover spaces built around your interests.</li>
              <li>Join, chat and meet new people.</li>
              <li>Ask questions and help with useful answers.</li>
              <li>Earn XP, level up and build recognition.</li>
            </ul>
          </div>
          <p className={styles.storyPath}>Discover → Join → Chat → Ask → Help → Grow</p>
          <div className={styles.featureLine}>
            <span>Discover interests</span><span>Join Communities</span><span>Community chat</span><span>Ask questions</span><span>Level up</span>
          </div>
          <p>Public Communities can also be discovered on the web, so the right people can find them beyond the app.</p>
          <div className={styles.ctaRow}>
            <Link className={styles.primaryCta} href="/communities">Explore Communities</Link>
            <a className={styles.secondaryCta} href="#ask-best-answer">See Ask &amp; Best Answer</a>
          </div>
        </div>
      </div>
    </section>
  );
}
