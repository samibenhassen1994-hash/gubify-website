import styles from "./home.module.css";

export default function WorldBackground() {
  return (
    <div aria-hidden="true">
      <div className={styles.starLayer} />
      <div className={styles.nebula} />
      <div className={styles.cloudLayer} />
    </div>
  );
}
