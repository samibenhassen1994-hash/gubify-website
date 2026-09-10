import styles from "./home.module.css";
import refineStyles from "./refinement.module.css";

const privateFeatures = ["Chat together", "Organize tasks", "Plan events", "Vote on proposals", "Manage a shared budget"];

export default function PrivateGubsSection() {
  return (
    <section className={styles.section} id="private-gubs" aria-labelledby="private-title">
      <span id="how-it-works" aria-hidden="true" />
      <div className={styles.sectionGrid}>
        <div className={styles.sectionCopy}>
          <span className={styles.kicker}>Private Gubs</span>
          <h2 id="private-title">Your private space. <span>More than a chat.</span></h2>
          <p>
            Keep your closest people in one private Gub. Talk naturally, then turn the things you decide into Tasks,
            Events, Proposals and Shared Budgets without losing the conversation around them.
          </p>
          <div className={refineStyles.whiteInfoCard}>
            <h3>Inside a Private Gub</h3>
            <ul>
              <li>Chat with the people closest to you.</li>
              <li>Turn decisions into Tasks and Events.</li>
              <li>Vote together with Proposals.</li>
              <li>Keep a Shared Budget visible to the group.</li>
            </ul>
          </div>
          <div className={styles.featureLine}>
            {privateFeatures.map((feature) => <span key={feature}>{feature}</span>)}
          </div>
          <p className={styles.storyPath}>Chat → decide → create an action → keep everyone aligned.</p>
        </div>

        <div className={`${styles.sectionVisual} ${styles.privateScene}`} aria-label="Private Gub feature world">
          <div className={styles.orbit} aria-hidden="true" />
          <div className={styles.sceneBubble}><b>💬</b>Chat</div>
          <div className={styles.sceneBubble}><b>✓</b>Tasks</div>
          <div className={styles.sceneBubble}><b>📅</b>Events</div>
          <div className={styles.sceneBubble}><b>◉</b>Voting</div>
          <div className={styles.sceneBubble}><b>€</b>Budget</div>
          <img className={`${styles.sceneAvatar} ${refineStyles.avatarClean}`} src="/home/avatars/avatar-nano.png" alt="" />
        </div>
      </div>
    </section>
  );
}
