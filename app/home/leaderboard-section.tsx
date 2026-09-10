import styles from "./home.module.css";
import PurpleAvatar from "./purple-avatar";

const ranking = [
  { rank: 1, name: "Ari", level: 18, answers: 42, variant: "sprout" as const },
  { rank: 2, name: "Mia", level: 16, answers: 35, variant: "round" as const },
  { rank: 3, name: "Leo", level: 15, answers: 29, variant: "drop" as const },
];

export default function LeaderboardSection() {
  return (
    <section className={styles.leaderSection} aria-labelledby="leader-title">
      <div className={styles.storyCopy}>
        <span className={styles.kicker}>Recognition</span>
        <h2 id="leader-title">Stand out by helping others.</h2>
        <p>Earn XP, level up and become one of the most valuable members of your Community.</p>
        <div className={styles.progressMini}>
          <div><strong>Level 7</strong><span>→</span><strong>Level 8</strong></div>
          <div className={styles.levelTrack}><span /></div>
          <small>Everyone can make progress through useful participation.</small>
        </div>
      </div>

      <div className={styles.leaderScene} role="group" aria-label="Community reputation preview">
        <div className={styles.podium}>
          <div className={`${styles.podiumPlace} ${styles.placeTwo}`}><PurpleAvatar variant="round" expression="happy" /><b>2</b></div>
          <div className={`${styles.podiumPlace} ${styles.placeOne}`}><span className={styles.crown} aria-hidden="true">♛</span><PurpleAvatar variant="sprout" expression="proud" /><b>1</b></div>
          <div className={`${styles.podiumPlace} ${styles.placeThree}`}><PurpleAvatar variant="drop" expression="calm" /><b>3</b></div>
        </div>
        <div className={styles.rankingCard}>
          <span className={styles.demoLabel}>Demo leaderboard</span>
          {ranking.map((member) => (
            <div className={styles.rankRow} key={member.rank}>
              <b>#{member.rank}</b>
              <PurpleAvatar variant={member.variant} expression={member.rank === 1 ? "proud" : "happy"} />
              <span><strong>{member.name}</strong><small>Level {member.level}</small></span>
              <em>{member.answers} Best Answers</em>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
