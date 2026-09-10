import styles from "./home.module.css";
import PurpleAvatar from "./purple-avatar";

type GubPhoneProps = {
  compact?: boolean;
};

export default function GubPhone({ compact = false }: GubPhoneProps) {
  return (
    <div
      className={`${styles.phoneWrap} ${compact ? styles.phoneCompact : ""}`.trim()}
      role="group"
      aria-label="Private Gub app preview"
    >
      <div className={styles.phoneShell}>
        <div className={styles.phoneTop} aria-hidden="true">
          <span>9:41</span>
          <span className={styles.phoneNotch} />
          <span>●●●</span>
        </div>
        <div className={styles.gubHeader}>
          <span className={styles.backGlyph} aria-hidden="true">‹</span>
          <div className={styles.gubAvatarStack} aria-hidden="true">
            <PurpleAvatar variant="round" expression="happy" />
            <PurpleAvatar variant="drop" expression="calm" />
            <PurpleAvatar variant="sprout" expression="curious" />
          </div>
          <div className={styles.gubHeaderCopy}>
            <strong>Weekend Crew</strong>
            <span>Private Gub · 8 members</span>
          </div>
          <span className={styles.moreGlyph} aria-hidden="true">•••</span>
        </div>
        <div className={styles.phoneChat}>
          <span className={styles.dayPill}>Today</span>
          <div className={styles.messageLine}>
            <PurpleAvatar variant="blob" expression="happy" />
            <div>
              <span className={styles.sender}>Maya</span>
              <div className={styles.messageBubble}>
                Who can book the restaurant for Saturday?
                <small>10:30</small>
              </div>
            </div>
          </div>
          <div className={styles.taskCard}>
            <div className={styles.taskIcon}>✓</div>
            <div>
              <span>Task created</span>
              <strong>Book the restaurant</strong>
              <small>Assigned to Aisha</small>
            </div>
          </div>
          <div className={styles.messageLineRight}>
            <div className={styles.messageBubbleAlt}>
              Done! I&apos;ll take care of it ✨
              <small>10:33</small>
            </div>
          </div>
        </div>
        <div className={styles.phoneComposer}>
          <span>Message your Gub…</span>
          <b aria-hidden="true">➤</b>
        </div>
      </div>
    </div>
  );
}
