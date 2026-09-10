import styles from "./home.module.css";
import refineStyles from "./refinement.module.css";

const podium = [
  { place: 2, name: "Maya", level: 16, answers: 35, image: "/home/avatars/avatar-bolla.png" },
  { place: 1, name: "Aisha", level: 18, answers: 42, image: "/home/avatars/avatar-fantasma.png" },
  { place: 3, name: "Leo", level: 15, answers: 29, image: "/home/avatars/avatar-nano.png" },
] as const;

export default function LeaderboardSection() {
  return (
    <section className={styles.section} id="leaderboard" aria-labelledby="leaderboard-title">
      <div className={`${styles.sectionGrid} ${styles.sectionGridReverse}`}>
        <div className={styles.podiumWrap} aria-label="Illustrative Community leaderboard">
          <div className={styles.podium}>
            {podium.map((member) => (
              <div className={styles.podiumPlace} key={member.place}>
                {member.place === 1 && <span className={styles.crown} aria-hidden="true">♛</span>}
                <img className={`${styles.podiumAvatar} ${refineStyles.avatarClean}`} src={member.image} alt="" />
                <b>{member.place}</b>
                <div className={styles.podiumMeta}>
                  <strong>{member.name}</strong>
                  <span>Level {member.level}</span>
                  <span>{member.answers} Best Answers</span>
                </div>
              </div>
            ))}
          </div>
          <span className={styles.kicker}>Illustrative leaderboard</span>
        </div>

        <div className={styles.sectionCopy}>
          <span className={styles.kicker}>Community Recognition</span>
          <h2 id="leaderboard-title">Become one of the <span>most valuable members.</span></h2>
          <p>
            Gubify makes helpful participation visible. Best Answers build XP, XP builds your level, and your level
            helps your contribution stand out inside the Community.
          </p>
          <div className={refineStyles.whiteInfoCard}>
            <h3>How members stand out</h3>
            <ul>
              <li>Help other people with useful participation.</li>
              <li>Best Answers reward quality contributions with XP.</li>
              <li>XP raises your level inside that Community.</li>
              <li>Levels and Best Answers make contribution visible in the leaderboard.</li>
            </ul>
          </div>
          <p className={styles.storyPath}>Helpful participation → Best Answers → XP → Level → Recognition</p>
          <div className={styles.featureLine}>
            <span>Help people</span><span>Earn XP</span><span>Build your level</span><span>Stand out</span>
          </div>
        </div>
      </div>
    </section>
  );
}
