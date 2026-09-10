import Link from "next/link";
import styles from "./home.module.css";
import PurpleAvatar from "./purple-avatar";

const interests = ["Gaming", "Tech", "Music", "Fitness", "Travel", "Anime"];

export default function CommunitiesSection() {
  return (
    <section className={`${styles.storySection} ${styles.communityStory}`} aria-labelledby="communities-title">
      <div className={styles.communityVisual}>
        <div className={styles.searchMock}><span>⌕</span><strong>What are you into?</strong><em>Search Communities</em></div>
        <div className={styles.interestCloud}>
          {interests.map((interest) => <span key={interest}>{interest}</span>)}
        </div>
        <div className={styles.communityDemoCard}>
          <div className={styles.communityDemoTop}><PurpleAvatar variant="sprout" expression="happy" /><div><strong>Creative Tech</strong><span>Demo Community</span></div></div>
          <p>Ask, share ideas and meet people who care about the same things.</p>
          <div className={styles.communityDemoMeta}><span>Open</span><span>English</span><span>Community</span></div>
        </div>
        <div className={styles.communityAvatarOne}><PurpleAvatar variant="drop" expression="curious" /></div>
        <div className={styles.communityAvatarTwo}><PurpleAvatar variant="arch" expression="happy" /></div>
        <div className={styles.communityAvatarThree}><PurpleAvatar variant="blob" expression="calm" /></div>
      </div>

      <div className={styles.storyCopy}>
        <span className={styles.kicker}>Communities</span>
        <h2 id="communities-title">Find your people.</h2>
        <p>Discover Communities built around the things you care about. Join conversations, ask questions and meet people who share your interests.</p>
        <div className={styles.flowRow} aria-label="Community discovery flow">
          {['Search', 'Discover', 'Join', 'Participate'].map((item, index) => <span key={item}><b>{index + 1}</b>{item}</span>)}
        </div>
        <div className={styles.discoveryNote}>
          <strong>Communities can be discovered beyond the app.</strong>
          <span>Public Community pages can help people find the right space from the web, then continue in Gubify.</span>
        </div>
        <Link className={styles.primaryButton} href="/communities">Explore Communities</Link>
      </div>
    </section>
  );
}
