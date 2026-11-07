import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAllSkills, useGenerateResume, useMySkills, useResume, useSaveResume } from '../../api/queries';
import type { Direction, Resume, ResumeUpdate } from '../../api/types';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { SkillChip } from '../../components/SkillChip/SkillChip';
import { cn } from '../../utils/format';
import { buildBackground, PROFILE } from './profile';
import { ResumePreview } from './ResumePreview';
import styles from './ResumeEditor.module.scss';

const ABOUT_LIMIT = 400;
const SAVE_DELAY = 700;
const NO_SKILLS: string[] = [];

const sameSkill = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

interface ResumeWorkspaceProps {
  direction: Direction;
  onDelete: () => void;
}

// Loads the resume of one direction and shows the editor for it.
export function ResumeWorkspace({ direction, onDelete }: ResumeWorkspaceProps) {
  const { data: resume, isPending, isError, error } = useResume(direction.id);

  if (isPending) {
    return <p className={styles.state}>Загружаю резюме…</p>;
  }

  if (isError) {
    return <EmptyState title="Не удалось загрузить резюме" description={error.message} />;
  }

  // A new generation changes generatedAt, so the editor remounts with fresh data.
  return (
    <ResumeEditor
      key={resume.generatedAt ?? 'new'}
      direction={direction}
      resume={resume}
      onDelete={onDelete}
    />
  );
}

interface ResumeEditorProps {
  direction: Direction;
  resume: Resume;
  onDelete: () => void;
}

function ResumeEditor({ direction, resume, onDelete }: ResumeEditorProps) {
  const [draft, setDraft] = useState<ResumeUpdate>({
    position: resume.position,
    about: resume.about,
    skills: resume.skills,
  });
  const [missing, setMissing] = useState(resume.missing);
  const [dirty, setDirty] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [overflows, setOverflows] = useState(false);

  const { data: mySkills = NO_SKILLS } = useMySkills();
  const { data: vacancySkills = NO_SKILLS } = useAllSkills();
  const save = useSaveResume(direction.id);
  const generate = useGenerateResume(direction.id);
  const { mutate: saveResume } = save;

  // Edits are saved automatically a moment after the last change.
  // A change that is still waiting is saved when the editor closes.
  const pendingSave = useRef<ResumeUpdate | null>(null);

  useEffect(() => {
    if (!dirty) {
      return;
    }
    pendingSave.current = draft;
    const timer = setTimeout(() => {
      pendingSave.current = null;
      saveResume(draft);
    }, SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [draft, dirty, saveResume]);

  useEffect(
    () => () => {
      if (pendingSave.current) {
        saveResume(pendingSave.current);
      }
    },
    [saveResume],
  );

  const update = (patch: Partial<ResumeUpdate>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
  };

  const addSkill = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || draft.skills.some((skill) => sameSkill(skill, trimmed))) {
      return;
    }
    update({ skills: [...draft.skills, trimmed] });
    setMissing((current) => current.filter((skill) => !sameSkill(skill, trimmed)));
  };

  const removeSkill = (name: string) => {
    update({ skills: draft.skills.filter((skill) => skill !== name) });
    const userHasSkill = mySkills.some((skill) => sameSkill(skill, name));
    if (!userHasSkill) {
      setMissing((current) =>
        current.some((skill) => sameSkill(skill, name)) ? current : [...current, name],
      );
    }
  };

  const handleGenerate = () => {
    const replacesContent = resume.generatedAt !== null || draft.about !== '' || draft.skills.length > 0;
    if (
      replacesContent &&
      !window.confirm('Нейросеть заново подберёт навыки и перепишет «Обо мне». Твои правки заменятся. Продолжить?')
    ) {
      return;
    }
    pendingSave.current = null;
    generate.mutate(buildBackground(PROFILE));
  };

  const handleDelete = () => {
    if (window.confirm(`Удалить направление «${direction.name}»? Вакансии останутся, но без направления.`)) {
      onDelete();
    }
  };

  const downloadPdf = () => {
    // The browser suggests the page title as the PDF file name.
    const previousTitle = document.title;
    document.title = `Резюме ${PROFILE.fullName}, ${draft.position || direction.name}`;
    window.addEventListener(
      'afterprint',
      () => {
        document.title = previousTitle;
      },
      { once: true },
    );
    window.print();
  };

  const skillOptions = [...new Set([...mySkills, ...vacancySkills])].filter(
    (option) => !draft.skills.some((skill) => sameSkill(skill, option)),
  );

  const isEmpty = resume.generatedAt === null && draft.position === '' && draft.about === '' && draft.skills.length === 0;

  let saveStatus = '';
  if (save.isPending) {
    saveStatus = 'Сохраняю…';
  } else if (save.isError) {
    saveStatus = 'Не удалось сохранить правки';
  } else if (save.isSuccess) {
    saveStatus = 'Правки сохранены';
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.panel}>
        {isEmpty ? (
          <div className={styles.intro}>
            <p>
              Резюме для направления «{direction.name}» ещё не создано. Нейросеть подберёт навыки по{' '}
              {resume.vacancyCount} сохранённым вакансиям и напишет «Обо мне».
            </p>
            {resume.vacancyCount === 0 && (
              <p className={styles.hint}>
                В направлении пока нет вакансий, поэтому в резюме попадут все твои навыки. Назначь
                направление вакансиям в таблице, чтобы подбор был точнее.
              </p>
            )}
          </div>
        ) : (
          <p className={styles.source}>
            Собрано по {resume.vacancyCount} сохранённым вакансиям направления «{direction.name}»
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={isEmpty ? styles.primary : styles.secondary}
            disabled={generate.isPending}
            onClick={handleGenerate}
          >
            {generate.isPending ? 'Генерирую…' : isEmpty ? 'Сгенерировать резюме' : 'Сгенерировать заново'}
          </button>
          {saveStatus && <span className={cn(styles.saveStatus, save.isError && styles.saveError)}>{saveStatus}</span>}
        </div>
        {generate.isError && (
          <p className={styles.error} role="alert">
            {generate.error.message}
          </p>
        )}

        <label className={styles.field}>
          <span className={styles.label}>Должность</span>
          <input
            className={styles.input}
            value={draft.position}
            placeholder={direction.name}
            onChange={(event) => update({ position: event.target.value })}
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

        {missing.length > 0 && (
          <div className={styles.field}>
            <span className={styles.label}>Стоит подтянуть</span>
            <p className={styles.hint}>
              Часто встречаются в вакансиях этого направления, но их нет в твоих навыках. Нажми «+»,
              если навык у тебя всё-таки есть.
            </p>
            <div className={styles.chips}>
              {missing.map((skill) => (
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
            onChange={(event) => update({ about: event.target.value })}
          />
        </label>

        <p className={styles.hint}>
          Контакты, опыт, образование и курсы одинаковые во всех резюме и берутся из профиля.
        </p>

        <button type="button" className={styles.deleteButton} onClick={handleDelete}>
          Удалить направление
        </button>
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

      {createPortal(
        <div className={styles.printRoot}>
          <ResumePreview profile={PROFILE} draft={draft} />
        </div>,
        document.body,
      )}
    </div>
  );
}
