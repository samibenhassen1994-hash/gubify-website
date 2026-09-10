import styles from "./home.module.css";
import PurpleAvatar from "./purple-avatar";

const privateFeatures = ["Chat", "Tasks", "Proposals", "Shared Budget"];
const communityFeatures = ["Discover", "Ask", "Best Answer", "Level Up"];

export default function TwoWaysSection() {
  return (
    <section className={styles.twoWays} id="two-ways" aria-labelledby="two-ways-title">
      <div className={styles.sectionHeading}>
        <span className={styles.kicker}>Two sides of Gubify</span>
        <h2 id="two-ways-title">Close with your people. <span>Open to your passions.</span></h2>
        <p>Keep your private circle organized, or step into Communities built around what you love.</p>
      </div>
      <div className={styles.twoWaysGrid}>
        <article className={`${styles.worldCard} ${styles.privateWorld}`}>
          <div className={styles.worldAvatarCluster} aria-hidden="true">
            <PurpleAvatar variant="round" />
            <PurpleAvatar variant="blob" expression="calm" />
            <PurpleAvatar variant="tall" expression="curious" />
          </div>
          <span className={styles.worldLabel}>Private Gubs</span>
          <h3>Keep your circle close.</h3>
          <p>Private spaces for friends, families and small groups who want to chat, plan and decide together.</p>
          <div className={styles.featurePills}>
            {privateFeatures.map((feature) => <span key={feature}>{feature}</span>)}
          </div>
        </article>
        <article className={`${styles.worldCard} ${styles.communityWorld}`}>
          <div className={styles.worldAvatarCluster} aria-hidden="true">
            <PurpleAvatar variant="drop" expression="happy" />
            <PurpleAvatar variant="arch" expression="proud" />
            <PurpleAvatar variant="sprout" expression="happy" />
          </div>
          <span className={styles.worldLabel}>Communities</span>
          <h3>Find people who get it.</h3>
          <p>Public spaces around shared interests where questions, helpful answers and contribution matter.</p>
          <div className={styles.featurePills}>
            {communityFeatures.map((feature) => <span key={feature}>{feature}</span>)}
          </div>
        </article>
      </div>
    </section>
  );
}
