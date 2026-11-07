import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { SkillChip } from '../../components/SkillChip/SkillChip';
import { cn } from '../../utils/format';
import { DEMO_DIRECTIONS, DEMO_PROFILE } from './demoData';
import { ResumePreview } from './ResumePreview';
import type { ResumeDirection, ResumeDraft } from './types';
import styles from './ResumePage.module.scss';

const ABOUT_LIMIT = 400;

export function ResumePage() {
  const [directions, setDirections] = useState<ResumeDirection[]>(DEMO_DIRECTIONS);
  const [activeId, setActiveId] = useState(DEMO_DIRECTIONS[0].id);

  const active = directions.find((direction) => direction.id === activeId) ?? directions[0];

  const updateDraft = (patch: Partial<ResumeDraft>) => {
    setDirections((current) =>
      current.map((direction) =>
        direction.id === active.id ? { ...direction, draft: { ...direction.draft, ...patch } } : direction,
      ),
    );
  };

  const { draft } = active;

  return (
    <section>
      <PageHeader
        title="Резюме"
        description="Отдельное резюме под каждое направление. Навыки и текст «Обо мне» подбираются по вакансиям этого направления, остальное берётся из профиля."
      />

      <p className={styles.notice}>
        Это макет на демо-данных: генерация и скачивание PDF подключатся на следующем шаге.
      </p>

      <div className={styles.tabs} role="tablist" aria-label="Направления">
        {directions.map((direction) => (
          <button
            key={direction.id}
            type="button"
            role="tab"
            id={`tab-${direction.id}`}
            aria-selected={direction.id === active.id}
            aria-controls="resume-panel"
            className={cn(styles.tab, direction.id === active.id && styles.tabActive)}
            onClick={() => setActiveId(direction.id)}
          >
            {direction.name}
            <span className={styles.tabCount}>{direction.draft.vacancyCount}</span>
          </button>
        ))}
        <button type="button" className={styles.addTab} disabled title="Появится на следующем шаге">
          + Направление
        </button>
      </div>

      <div
        className={styles.workspace}
        role="tabpanel"
        id="resume-panel"
        aria-labelledby={`tab-${active.id}`}
      >
        <div className={styles.editor}>
          <div className={styles.panel}>
            <p className={styles.source}>
              Собрано по {draft.vacancyCount} сохранённым вакансиям направления «{active.name}»
            </p>

            <label className={styles.field}>
              <span className={styles.label}>Должность</span>
              <input
                className={styles.input}
                value={draft.position}
                onChange={(event) => updateDraft({ position: event.target.value })}
              />
            </label>

            <div className={styles.field}>
              <span className={styles.label}>Навыки в резюме</span>
              <div className={styles.chips}>
                {draft.skills.map((skill) => (
                  <SkillChip
                    key={skill}
                    name={skill}
                    variant="has"
                    onRemove={() => updateDraft({ skills: draft.skills.filter((item) => item !== skill) })}
                  />
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Стоит подтянуть</span>
              <p className={styles.hint}>Часто встречаются в вакансиях, но их нет в твоих навыках, поэтому в резюме они не попадают.</p>
              <div className={styles.chips}>
                {draft.missing.map((skill) => (
                  <SkillChip key={skill} name={skill} variant="missing" />
                ))}
              </div>
            </div>

            <label className={styles.field}>
              <span className={styles.labelRow}>
                <span className={styles.label}>Обо мне</span>
                <span
                  className={cn(styles.counter, draft.about.length > ABOUT_LIMIT && styles.counterOver)}
                >
                  {draft.about.length} / {ABOUT_LIMIT}
                </span>
              </span>
              <textarea
                className={styles.textarea}
                rows={6}
                value={draft.about}
                onChange={(event) => updateDraft({ about: event.target.value })}
              />
            </label>

            <p className={styles.hint}>
              Контакты, опыт, образование и курсы одинаковые во всех резюме, нейросеть их не меняет.
            </p>

            <div className={styles.actions}>
              <button type="button" className={styles.primary} disabled>
                Сгенерировать заново
              </button>
              <button type="button" className={styles.secondary} disabled>
                Скачать PDF
              </button>
            </div>
          </div>
        </div>

        <div className={styles.preview}>
          <div className={styles.previewHeader}>
            <span>Предпросмотр</span>
            <span className={styles.previewMeta}>A4, одна страница</span>
          </div>
          <ResumePreview profile={DEMO_PROFILE} draft={draft} />
        </div>
      </div>
    </section>
  );
}
