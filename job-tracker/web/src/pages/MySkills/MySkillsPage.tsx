import { useState } from 'react';
import { useAllSkills, useMySkills, useSkillGaps, useUpdateMySkills } from '../../api/queries';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { SkillChip } from '../../components/SkillChip/SkillChip';
import styles from './MySkillsPage.module.scss';

const NO_SKILLS: string[] = [];
const SUGGESTIONS_LIMIT = 24;

export function MySkillsPage() {
  const { data: mySkills = NO_SKILLS, isPending } = useMySkills();
  const { data: allSkills = NO_SKILLS } = useAllSkills();
  const { data: stats } = useSkillGaps();
  const updateSkills = useUpdateMySkills();
  const [input, setInput] = useState('');

  const hasSkill = (name: string) =>
    mySkills.some((skill) => skill.toLowerCase() === name.toLowerCase());

  const addSkill = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !hasSkill(trimmed)) {
      updateSkills.mutate([...mySkills, trimmed]);
    }
  };

  const removeSkill = (name: string) => {
    updateSkills.mutate(mySkills.filter((skill) => skill !== name));
  };

  const autocomplete = allSkills.filter((skill) => !hasSkill(skill));
  const suggestions = (stats?.skills ?? [])
    .filter((skill) => !skill.has)
    .slice(0, SUGGESTIONS_LIMIT);

  return (
    <section>
      <PageHeader
        title="Мои навыки"
        description="По этому списку считается процент совпадения с вакансиями и собирается блок навыков в резюме."
      />

      <div className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Что ты умеешь</h2>
            <span className={styles.count}>{mySkills.length}</span>
          </div>

          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              addSkill(input);
              setInput('');
            }}
          >
            <input
              className={styles.input}
              list="skill-options"
              placeholder="Например, TypeScript"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              aria-label="Новый навык"
            />
            <datalist id="skill-options">
              {autocomplete.map((skill) => (
                <option key={skill} value={skill} />
              ))}
            </datalist>
            <button type="submit" className={styles.addButton} disabled={!input.trim()}>
              Добавить
            </button>
          </form>

          {isPending ? (
            <p className={styles.muted}>Загружаю…</p>
          ) : mySkills.length === 0 ? (
            <p className={styles.muted}>
              Пока пусто. Впиши навык выше или добавь подходящие из списка справа.
            </p>
          ) : (
            <div className={styles.chips}>
              {mySkills.map((skill) => (
                <SkillChip key={skill} name={skill} onRemove={() => removeSkill(skill)} />
              ))}
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Часто просят, а у тебя нет</h2>
          </div>
          {suggestions.length === 0 ? (
            <p className={styles.muted}>
              Здесь появятся навыки из сохранённых вакансий, которых нет в твоём списке.
            </p>
          ) : (
            <>
              <p className={styles.hint}>
                Процент показывает, в какой доле вакансий встречается навык. Нажми «+», если он у
                тебя уже есть.
              </p>
              <div className={styles.chips}>
                {suggestions.map((skill) => (
                  <SkillChip
                    key={skill.name}
                    name={skill.name}
                    variant="missing"
                    hint={`${skill.percent}%`}
                    onAdd={() => addSkill(skill.name)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
