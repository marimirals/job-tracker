import type { ResumeDraft, ResumeProfile } from './types';
import styles from './ResumePreview.module.scss';

interface ResumePreviewProps {
  profile: ResumeProfile;
  draft: ResumeDraft;
}

// A4 page laid out like the resume template. All sizes are relative to the
// page width, so the preview scales to any column width without JS.
export function ResumePreview({ profile, draft }: ResumePreviewProps) {
  return (
    <div className={styles.frame}>
      <article className={styles.page} aria-label="Предпросмотр резюме">
        <h1 className={styles.name}>
          {profile.fullName}
          {draft.position && `, ${draft.position}`}
        </h1>
        <div className={styles.contacts}>
          <p>
            E-mail: <a href={`mailto:${profile.email}`}>{profile.email}</a>
          </p>
          <p>Телефон: {profile.phone}</p>
          <p>Telegram: {profile.telegram}</p>
          <p>{profile.city}</p>
        </div>

        <section className={styles.section}>
          <h2 className={styles.heading}>Обо мне</h2>
          <p>{draft.about}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>Навыки</h2>
          <p>{draft.skills.join(', ')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>Опыт работы</h2>
          {profile.experience.map((item) => (
            <div key={`${item.title}-${item.period}`} className={styles.item}>
              <p className={styles.itemTitle}>
                – {item.title} ({item.period}) в «{item.company}»
              </p>
              <p>{item.description}</p>
            </div>
          ))}
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>Образование</h2>
          {profile.education.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>Повышение квалификации</h2>
          {profile.courses.map((course) => (
            <p key={course.title}>
              <strong>– {course.title}</strong> ({course.details})
            </p>
          ))}
        </section>
      </article>
    </div>
  );
}