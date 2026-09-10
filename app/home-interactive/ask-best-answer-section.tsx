import AskDemo from "./ask-demo";
import styles from "./home.module.css";

export default function AskBestAnswerSection() {
  return (
    <section className={styles.section} id="ask-best-answer" aria-labelledby="ask-title">
      <div className={styles.sectionGrid}>
        <div className={styles.sectionCopy}>
          <span className={styles.kicker}>Ask · Best Answer · XP</span>
          <h2 id="ask-title">Ask. Help. <span>Level up.</span></h2>
          <p>
            Community questions are built for useful answers. Pick the reply that solves the problem best and that
            contribution becomes a Best Answer, rewarding the member with XP.
          </p>
          <div className={styles.whiteInfoCard}>
            <h3>How Best Answer works</h3>
            <ul>
              <li>A member asks a question.</li>
              <li>The Community replies with possible solutions.</li>
              <li>The most helpful reply is selected as Best Answer.</li>
              <li>The author earns XP and progresses toward the next level.</li>
            </ul>
          </div>
          <div className={styles.featureLine}>
            <span>Ask a question</span><span>Compare replies</span><span>Select Best Answer</span><span>Earn XP</span><span>Level up</span>
          </div>
          <p className={styles.storyPath}>Great answers stand out. Your contribution matters.</p>
        </div>
        <div className={styles.reputationDemo}>
          <img className={styles.sceneAvatar} src="/home/avatars/avatar-bolla.png" alt="" />
          <AskDemo />
        </div>
      </div>
    </section>
  );
}
