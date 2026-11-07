import { useLayoutEffect, useRef } from 'react';
import type { ResumeDraft, ResumeProfile } from './types';
import styles from './ResumePreview.module.scss';

interface ResumePreviewProps {
  profile: ResumeProfile;
  draft: ResumeDraft;
  onOverflowChange?: (overflows: boolean) => void;
}

// A4 page laid out like the resume template. All sizes are relative to the
// page width, so the same markup works on screen and in print.
export function ResumePreview({ profile, draft, onOverflowChange }: ResumePreviewProps) {
  const pageRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page || !onOverflowChange) {
      return;
    }

    const check = () => onOverflowChange(page.scrollHeight > page.clientHeight + 1);
    check();

    const observer = new ResizeObserver(check);
    observer.observe(page);
    return () => observer.disconnect();
  }, [profile, draft, onOverflowChange]);

  return (
    <div className={styles.frame}>
      <article ref={pageRef} className={styles.page} aria-label="Резюме">
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

        {draft.about && (
          <section className={styles.section}>
            <h2 className={styles.heading}>Обо мне</h2>
            <p>{draft.about}</p>
          </section>
        )}

        {draft.skills.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.heading}>Навыки</h2>
            <p>{draft.skills.join(', ')}</p>
          </section>
        )}

        <section className={styles.section}>
          <h2 className={styles.heading}>Опыт работы</h2>
          {profile.experience.map((item) => (
            <div key={`${item.title}-${item.period}`} className={styles.item}>
              <p className={styles.itemTitle}>
                – {item.title} ({item.period}) в «{item.company}»
              </p>
              {item.description && <p>{item.description}</p>}
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