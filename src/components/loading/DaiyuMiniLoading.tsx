import Image from "next/image";
import styles from "./DaiyuMiniLoading.module.css";

export function DaiyuMiniLoading({ label = "페이지를 불러오는 중" }: { label?: string }) {
  return (
    <div className={styles.layer} aria-busy="true">
      <section className={styles.popover} role="status" aria-label={label}>
        <span className={styles.avatarWrap} aria-hidden="true">
          <Image
            className={styles.avatar}
            src="/daiyu-profile.png"
            alt=""
            width={286}
            height={286}
            sizes="64px"
            priority
          />
        </span>
      </section>
    </div>
  );
}
