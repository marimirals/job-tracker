import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAllSkills, useMySkills } from '../../api/queries';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { SkillChip } from '../../components/SkillChip/SkillChip';
import { cn } from '../../utils/format';
import { DEFAULT_DIRECTIONS } from './directions';
import { PROFILE } from './profile';
import { ResumePreview } from './ResumePreview';
import type { ResumeDirection, ResumeDraft } from './types';
import styles from './ResumePage.module.scss';

const ABOUT_LIMIT = 400;
const STORAGE_KEY = 'job-tracker:resume-directions';
const NO_SKILLS: string[] = [];

function loadDirections(): ResumeDirection[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as ResumeDirection[] | null;
    if (Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
  } catch {
    // Storage is unavailable or holds broken data: start from the defaults.
  }
  return DEFAULT_DIRECTIONS;
}

const sameSkill = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function ResumePage() {
  const [directions, setDirections] = useState<ResumeDirection[]>(loadDirections);
  const [activeId, setActiveId] = useState(directions[0].id);
  const [newSkill, setNewSkill] = useState('');
  const [overflows, setOverflows] = useState(false);
  const { data: mySkills = NO_SKILLS } = useMySkills();
  const { data: vacancySkills = NO_SKILLS } = useAllSkills();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(directions));
    } catch {
      // Storage is unavailable: edits simply live until the page reloads.
    }
  }, [directions]);

  const active = directions.find((direction) => direction.id === activeId) ?? directions[0];
  const { draft } = active;

  const updateDraft = (patch: Partial<ResumeDraft>) => {
    setDirections((current) =>
      current.map((direction) =>
        direction.id === active.id ? { ...direction, draft: { ...direction.draft, ...patch } } : direction,
      ),
    );
  };

  const addSkill = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || draft.skills.some((skill) => sameSkill(skill, trimmed))) {
      return;
    }
    updateDraft({
      skills: [...draft.skills, trimmed],
      missing: draft.missing.filter((skill) => !sameSkill(skill, trimmed)),
    });
  };

  const removeSkill = (name: string) => {
    updateDraft({ skills: draft.skills.filter((skill) => skill !== name) });
  };

  const skillOptions = [...new Set([...mySkills, ...vacancySkills])].filter(
    (option) => !draft.skills.some((skill) => sameSkill(skill, option)),
  );

  const downloadPdf = () => {
    // The browser suggests the page title as the PDF file name.
    const previousTitle = document.title;
    document.title = `Резюме ${PROFILE.fullName}, ${draft.position}`;
    window.addEventListener(
      'afterprint',
      () => {
        document.title = previousTitle;
      },
      { once: true },
    );
    window.print();
  };

  return (
    <section>
      <PageHeader
        title="Резюме"
        description="Отдельное резюме под каждое направление. Навыки и текст «Обо мне» подбираются по вакансиям этого направления, остальное берётся из профиля."
      />

      <p className={styles.notice}>
        Навыки и «Обо мне» пока заполнены примерами: генерация по вакансиям подключится на
        следующем шаге. Правки сохраняются в этом браузере.
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
            {draft.skills.length > 0 && (
              <div className={styles.chips}>
                {draft.skills.map((skill) => (
                  <SkillChip key={skill} name={skill} variant="has" onRemove={() => removeSkill(skill)} />
                ))}
              </div>
            )}
            <form
              className={styles.addForm}
              onSubmit={(event) => {
                event.preventDefault();
                addSkill(newSkill);
                setNewSkill('');
              }}
            >
              <input
                className={styles.input}
                list="resume-skill-options"
                placeholder="Добавить навык"
                aria-label="Добавить навык в резюме"
                value={newSkill}
                onChange={(event) => setNewSkill(event.target.value)}
              />
              <datalist id="resume-skill-options">
                {skillOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
              <button type="submit" className={styles.secondary} disabled={!newSkill.trim()}>
                Добавить
              </button>
            </form>
          </div>

          {draft.missing.length > 0 && (
            <div className={styles.field}>
              <span className={styles.label}>Стоит подтянуть</span>
              <p className={styles.hint}>
                Часто встречаются в вакансиях этого направления, но их нет в твоих навыках. Нажми
                «+», если навык у тебя всё-таки есть.
              </p>
              <div className={styles.chips}>
                {draft.missing.map((skill) => (
                  <SkillChip key={skill} name={skill} variant="missing" onAdd={() => addSkill(skill)} />
                ))}
              </div>
            </div>
          )}

          <label className={styles.field}>
            <span className={styles.labelRow}>
              <span className={styles.label}>Обо мне</span>
              <span className={cn(styles.counter, draft.about.length > ABOUT_LIMIT && styles.counterOver)}>
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
            Контакты, опыт, образование и курсы одинаковые во всех резюме и берутся из профиля.
          </p>

          <div className={styles.actions}>
            <button type="button" className={styles.secondary} disabled title="Появится на следующем шаге">
              Сгенерировать заново
            </button>
          </div>
        </div>

        <div className={styles.preview}>
          <div className={styles.sheet}>
            <div className={styles.previewHeader}>
              <h2 className={styles.previewTitle}>Предпросмотр</h2>
              <button type="button" className={styles.primary} onClick={downloadPdf}>
                Скачать PDF
              </button>
            </div>
            {overflows && (
              <p className={styles.warning} role="status">
                Текст не помещается на одну страницу. Сократи «Обо мне» или убери часть навыков.
              </p>
            )}
            <ResumePreview profile={PROFILE} draft={draft} onOverflowChange={setOverflows} />
          </div>
        </div>
      </div>

      {createPortal(
        <div className={styles.printRoot}>
          <ResumePreview profile={PROFILE} draft={draft} />
        </div>,
        document.body,
      )}
    </section>
  );
}