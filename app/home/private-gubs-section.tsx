import styles from "./home.module.css";
import GubPhone from "./gub-phone";
import PurpleAvatar from "./purple-avatar";

const actions = [
  ["Chat → Task", "Turn a message into something that actually gets done."],
  ["Events", "Keep important dates inside the group."],
  ["Proposals & Voting", "Put ideas to a vote and decide together."],
  ["Shared Budget", "Keep shared money goals visible to everyone."],
] as const;

export default function PrivateGubsSection() {
  return (
    <section className={styles.storySection} id="how-it-works" aria-labelledby="private-gubs-title">
      <div className={styles.storyCopy}>
        <span className={styles.kicker}>Private Gubs</span>
        <h2 id="private-gubs-title">Turn conversation into action.</h2>
        <p>Private Gubs keep your closest groups organized without leaving the conversation.</p>
        <div className={styles.storyFeatureGrid}>
          {actions.map(([title, copy]) => (
            <article className={styles.smallFeatureCard} key={title}>
              <strong>{title}</strong>
              <span>{copy}</span>
            </article>
          ))}
        </div>
      </div>
      <div className={styles.privateVisual}>
        <div className={styles.privateAvatarOne}><PurpleAvatar variant="tall" expression="curious" /></div>
        <div className={styles.privateAvatarTwo}><PurpleAvatar variant="blob" expression="happy" /></div>
        <div className={styles.privateAvatarThree}><PurpleAvatar variant="round" expression="proud" /></div>
        <div className={`${styles.actionFloat} ${styles.actionEvent}`}><span>📅</span><b>Event</b><small>Saturday · 20:30</small></div>
        <div className={`${styles.actionFloat} ${styles.actionProposal}`}><span>🗳️</span><b>Proposal</b><small>3 options · Vote now</small></div>
        <div className={`${styles.actionFloat} ${styles.actionBudget}`}><span>€</span><b>Shared Budget</b><small>€180 / €300</small></div>
        <GubPhone compact />
      </div>
    </section>
  );
}
