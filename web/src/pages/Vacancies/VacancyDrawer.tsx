import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useDeleteVacancy, useUpdateVacancy, useVacancy } from '../../api/queries';
import type { VacancyDetails, VacancySkill } from '../../api/types';
import { MatchBadge } from '../../components/MatchBadge/MatchBadge';
import { SkillChip } from '../../components/SkillChip/SkillChip';
import { StatusSelect } from '../../components/StatusSelect/StatusSelect';
import { WORK_FORMAT_LABELS } from '../../constants';
import { formatSalary } from '../../utils/format';
import styles from './VacancyDrawer.module.scss';

interface VacancyDrawerProps {
  id: number;
  onClose: () => void;
}

export function VacancyDrawer({ id, onClose }: VacancyDrawerProps) {
  const { data: vacancy, isPending, isError } = useVacancy(id);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Карточка вакансии"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        {isPending && <p className={styles.muted}>Загружаю…</p>}
        {isError && <p className={styles.muted}>Не удалось загрузить вакансию</p>}
        {vacancy && <DrawerContent key={vacancy.id} vacancy={vacancy} onDeleted={onClose} />}
      </aside>
    </div>
  );
}

interface DrawerContentProps {
  vacancy: VacancyDetails;
  onDeleted: () => void;
}

function DrawerContent({ vacancy, onDeleted }: DrawerContentProps) {
  const [notes, setNotes] = useState(vacancy.notes);
  const updateMutation = useUpdateVacancy();
  const deleteMutation = useDeleteVacancy();

  const hasSkills = vacancy.skills.filter((skill) => skill.has);
  const missingSkills = vacancy.skills.filter((skill) => !skill.has);
  const meta = [
    formatSalary(vacancy),
    vacancy.workFormat ? WORK_FORMAT_LABELS[vacancy.workFormat] : null,
    vacancy.grade,
  ].filter(Boolean);

  const handleDelete = () => {
    if (window.confirm('Удалить вакансию?')) {
      deleteMutation.mutate(vacancy.id, { onSuccess: onDeleted });
    }
  };

  return (
    <>
      <header className={styles.header}>
        <h2 className={styles.title}>{vacancy.title}</h2>
        <p className={styles.company}>{vacancy.company ?? 'Компания не указана'}</p>
        <p className={styles.meta}>{meta.join(' · ')}</p>
        <a className={styles.link} href={vacancy.url} target="_blank" rel="noopener noreferrer">
          Открыть оригинал ↗
        </a>
      </header>

      <section className={styles.match}>
        <MatchBadge value={vacancy.match} size="lg" />
        <p className={styles.matchText}>
          {vacancy.match === null ? (
            <>
              Чтобы посчитать совпадение, заполни <Link to="/skills">свои навыки</Link>
            </>
          ) : (
            `Ты закрываешь ${hasSkills.length} из ${vacancy.skills.length} требований`
          )}
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Есть у тебя · {hasSkills.length}</h3>
        <SkillList skills={hasSkills} variant="has" />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Не хватает · {missingSkills.length}</h3>
        <SkillList skills={missingSkills} variant="missing" />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Статус</h3>
        <StatusSelect vacancyId={vacancy.id} value={vacancy.status} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Заметки</h3>
        <textarea
          className={styles.notes}
          value={notes}
          rows={4}
          placeholder="Контакты рекрутера, впечатления, вопросы к собесу…"
          onChange={(event) => setNotes(event.target.value)}
        />
        <button
          type="button"
          className={styles.saveButton}
          disabled={notes === vacancy.notes || updateMutation.isPending}
          onClick={() => updateMutation.mutate({ id: vacancy.id, patch: { notes } })}
        >
          {updateMutation.isPending ? 'Сохраняю…' : 'Сохранить заметку'}
        </button>
      </section>

      <details className={styles.raw}>
        <summary>Исходный текст вакансии</summary>
        <pre>{vacancy.rawText}</pre>
      </details>

      <button
        type="button"
        className={styles.deleteButton}
        disabled={deleteMutation.isPending}
        onClick={handleDelete}
      >
        Удалить вакансию
      </button>
    </>
  );
}

interface SkillListProps {
  skills: VacancySkill[];
  variant: 'has' | 'missing';
}

function SkillList({ skills, variant }: SkillListProps) {
  if (skills.length === 0) {
    return <p className={styles.muted}>—</p>;
  }

  return (
    <div className={styles.groups}>
      {(['hard', 'soft'] as const).map((type) => {
        const items = skills.filter((skill) => skill.type === type);
        if (items.length === 0) {
          return null;
        }
        return (
          <div key={type}>
            <span className={styles.groupLabel}>{type === 'hard' ? 'Хард-скиллы' : 'Софт-скиллы'}</span>
            <div className={styles.chips}>
              {items.map((skill) => (
                <SkillChip key={skill.name} name={skill.name} variant={variant} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}