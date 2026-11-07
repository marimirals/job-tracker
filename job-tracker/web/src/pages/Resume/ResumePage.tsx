import { useState } from 'react';
import { ApiError } from '../../api/client';
import { useCreateDirection, useDeleteDirection, useDirections } from '../../api/queries';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { cn } from '../../utils/format';
import { ResumeWorkspace } from './ResumeEditor';
import styles from './ResumePage.module.scss';

export function ResumePage() {
  const { data: directions = [], isPending, isError } = useDirections();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const createDirection = useCreateDirection();
  const deleteDirection = useDeleteDirection();

  const active = directions.find((direction) => direction.id === activeId) ?? directions[0];

  const closeForm = () => {
    setCreating(false);
    setNewName('');
    createDirection.reset();
  };

  const submitDirection = () => {
    const name = newName.trim();
    if (!name) {
      return;
    }
    createDirection.mutate(name, {
      onSuccess: (direction) => {
        setActiveId(direction.id);
        closeForm();
      },
    });
  };

  const createError =
    createDirection.error instanceof ApiError && createDirection.error.status === 409
      ? 'Такое направление уже есть'
      : createDirection.error?.message;

  return (
    <section>
      <PageHeader
        title="Резюме"
        description="Отдельное резюме под каждое направление. Навыки и текст «Обо мне» подбираются по вакансиям этого направления, остальное берётся из профиля."
      />

      {isPending && <p className={styles.state}>Загружаю направления…</p>}
      {isError && <EmptyState title="Не удалось загрузить направления" description="Проверь, что сервер запущен." />}

      {!isPending && !isError && (
        <>
          <div className={styles.tabs} role="tablist" aria-label="Направления">
            {directions.map((direction) => (
              <button
                key={direction.id}
                type="button"
                role="tab"
                id={`tab-${direction.id}`}
                aria-selected={direction.id === active?.id}
                aria-controls="resume-panel"
                className={cn(styles.tab, direction.id === active?.id && styles.tabActive)}
                onClick={() => setActiveId(direction.id)}
              >
                {direction.name}
                <span className={styles.tabCount}>{direction.vacancyCount}</span>
              </button>
            ))}

            {creating ? (
              <form
                className={styles.newDirection}
                onSubmit={(event) => {
                  event.preventDefault();
                  submitDirection();
                }}
              >
                <input
                  className={styles.newInput}
                  value={newName}
                  maxLength={60}
                  placeholder="Например, Аналитик данных"
                  aria-label="Название направления"
                  autoFocus
                  onChange={(event) => setNewName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      closeForm();
                    }
                  }}
                />
                <button
                  type="submit"
                  className={styles.createButton}
                  disabled={!newName.trim() || createDirection.isPending}
                >
                  Создать
                </button>
                <button type="button" className={styles.cancelButton} onClick={closeForm}>
                  Отмена
                </button>
              </form>
            ) : (
              <button type="button" className={styles.addTab} onClick={() => setCreating(true)}>
                + Направление
              </button>
            )}
          </div>
          {createError && (
            <p className={styles.error} role="alert">
              {createError}
            </p>
          )}

          <div role="tabpanel" id="resume-panel" aria-labelledby={active ? `tab-${active.id}` : undefined}>
            {active ? (
              <ResumeWorkspace
                key={active.id}
                direction={active}
                onDelete={() =>
                  deleteDirection.mutate(active.id, { onSuccess: () => setActiveId(null) })
                }
              />
            ) : (
              <EmptyState
                title="Пока нет ни одного направления"
                description="Создай направление, например «Фронтенд» или «DevOps», и сгенерируй под него резюме."
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}
