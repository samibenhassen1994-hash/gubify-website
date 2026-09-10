import styles from "./home.module.css";

export type AvatarVariant = "round" | "drop" | "tall" | "arch" | "blob" | "sprout";
export type AvatarExpression = "happy" | "curious" | "proud" | "calm";

type PurpleAvatarProps = {
  variant?: AvatarVariant;
  expression?: AvatarExpression;
  className?: string;
  label?: string;
};

export default function PurpleAvatar({
  variant = "round",
  expression = "happy",
  className = "",
  label,
}: PurpleAvatarProps) {
  return (
    <span
      className={`${styles.avatar} ${styles[`avatar_${variant}`]} ${styles[`avatar_${expression}`]} ${className}`.trim()}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <span className={styles.avatarGlow} />
      <span className={styles.avatarEyes}>
        <i />
        <i />
      </span>
      <span className={styles.avatarMouth} />
    </span>
  );
}
