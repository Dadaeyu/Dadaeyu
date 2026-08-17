import Image from "next/image";
import styles from "./DaiyuLoading.module.css";

type LoadingCopyProps = {
  title: string;
  detail: string;
  contained?: boolean;
};

export function DaiyuFullPageLoading() {
  return (
    <div
      className={styles.fullPage}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="페이지를 준비하는 중"
    >
      <div className={styles.cityBackground} aria-hidden="true">
        <span className={`${styles.citySlide} ${styles.cityHanbat}`} />
        <span className={`${styles.citySlide} ${styles.cityScience}`} />
        <span className={`${styles.citySlide} ${styles.cityMuseum}`} />
      </div>

      <header className={styles.fullHeader}>
        <div className={styles.brand} aria-label="다대유, 대전 무장애 여행">
          <span className={styles.brandMark} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 21.5s-6.6-5.6-6.6-10.8A6.6 6.6 0 0 1 12 4.1a6.6 6.6 0 0 1 6.6 6.6c0 5.2-6.6 10.8-6.6 10.8Z"
                fill="currentColor"
              />
              <path
                d="M12 13.9c-1.9-1.4-3.1-2.3-3.1-3.7 0-.95.74-1.7 1.68-1.7.55 0 1.07.27 1.42.69.35-.42.87-.69 1.42-.69.94 0 1.68.75 1.68 1.7 0 1.4-1.2 2.3-3.1 3.7Z"
                fill="#35a98e"
              />
            </svg>
          </span>
          <span>
            <span className={styles.brandName}>
              다대<strong>유</strong>
            </span>
            <span className={styles.brandTagline}>대전 무장애 여행</span>
          </span>
        </div>
      </header>

      <section className={styles.scene} aria-hidden="true">
        <svg className={styles.mapPath} viewBox="0 0 1000 560" preserveAspectRatio="none">
          <path
            className={styles.routeBase}
            d="M-20 370C125 452 220 370 304 292s135-131 237-105 85 129 183 140 149-78 310-43"
          />
          <path
            className={styles.routeActive}
            d="M-20 370C125 452 220 370 304 292s135-131 237-105 85 129 183 140 149-78 310-43"
          />
        </svg>

        <div className={styles.characterStage}>
          <span className={styles.groundShadow} />
          <Image
            className={styles.character}
            src="/daiyu-avatar.png"
            alt=""
            width={1254}
            height={1254}
            sizes="(max-width: 680px) 78vw, 35vw"
            priority
          />
          <span className={`${styles.spark} ${styles.sparkAccess}`}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="4" r="2" />
              <path d="M5 8h14M12 6v6m-3 9 3-9 3 9m-7-5h8" />
            </svg>
          </span>
          <span className={`${styles.spark} ${styles.sparkHeart}`}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21s-7-4.6-7-11a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 10c0 6.4-7 11-7 11Z" />
            </svg>
          </span>
        </div>
      </section>

      <section className={styles.fullCopy}>
        <p className={styles.eyebrow}>다유와 함께 떠날 준비 중</p>
        <h1 className={styles.fullTitle}>다유가 편한 길을 살펴보고 있어요</h1>
        <p className={styles.fullDetail}>대전의 이동·편의 정보를 차근차근 확인하고 있어요.</p>
        <div className={styles.progressTrack} aria-hidden="true">
          <span className={styles.progressFill} />
        </div>
      </section>
    </div>
  );
}

export function DaiyuCompactLoading({ title, detail, contained = false }: LoadingCopyProps) {
  return (
    <div className={contained ? styles.containedLayer : styles.overlayLayer} aria-busy="true">
      <section className={styles.compactCard} role="status" aria-live="polite" aria-atomic="true">
        <LoadingAvatar />
        <div className={styles.compactCopy}>
          <p className={styles.compactTitle}>{title}</p>
          <p className={styles.compactDetail}>{detail}</p>
          <span className={styles.loadingDots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      </section>
    </div>
  );
}

function LoadingAvatar() {
  return (
    <span className={styles.avatarWrap} aria-hidden="true">
      <Image
        className={styles.compactAvatar}
        src="/daiyu-profile.png"
        alt=""
        width={286}
        height={286}
        sizes="64px"
        priority
      />
    </span>
  );
}
