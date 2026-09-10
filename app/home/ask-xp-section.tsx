import styles from "./home.module.css";
import PurpleAvatar from "./purple-avatar";

export default function AskXpSection() {
  return (
    <section className={styles.reputationSection} aria-labelledby="ask-xp-title">
      <div className={styles.sectionHeading}>
        <span className={styles.kicker}>Community reputation</span>
        <h2 id="ask-xp-title">Ask. Help. Level up.</h2>
        <p>Questions make Communities useful. Great answers make members stand out.</p>
      </div>

      <div className={styles.askScene}>
        <article className={`${styles.questionCard} ${styles.float}`}>
          <span>Ask</span>
          <strong>How do I start learning Flutter?</strong>
          <small>Asked in Creative Tech</small>
        </article>

        <article className={`${styles.answerCard} ${styles.answerOne}`}>
          <div><PurpleAvatar variant="round" expression="happy" /><b>Mia</b></div>
          <p>Start with widgets and layouts, then build one small project end to end.</p>
        </article>
        <article className={`${styles.answerCard} ${styles.answerTwo}`}>
          <div><PurpleAvatar variant="sprout" expression="curious" /><b>Leo</b></div>
          <p>Use the official docs alongside a tiny app so each concept becomes practical.</p>
        </article>
        <article className={`${styles.answerCard} ${styles.bestAnswerCard}`}>
          <span className={styles.bestBadge}>★ Best Answer</span>
          <div><PurpleAvatar variant="arch" expression="proud" /><b>Ari</b></div>
          <p>Learn Dart basics, rebuild one familiar screen, then connect navigation and state.</p>
        </article>

        <div className={`${styles.xpBurst} ${styles.pulse}`}>+120 XP</div>
        <div className={styles.levelCard}>
          <div><strong>Level 8</strong><span>Level Up</span></div>
          <div className={styles.levelTrack}><span /></div>
        </div>
      </div>

      <div className={styles.reputationSteps}>
        <article><strong>Ask</strong><span>Get help from people who share your interests.</span></article>
        <article><strong>Best Answer</strong><span>Highlight the reply that helped the most.</span></article>
        <article><strong>Earn XP</strong><span>Useful contributions build your Community level.</span></article>
      </div>
      <p className={styles.contributionLine}>Your contribution matters.</p>
    </section>
  );
}
