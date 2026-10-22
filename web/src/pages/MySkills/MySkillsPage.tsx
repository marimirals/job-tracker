import { useState } from 'react';
import { useAllSkills, useMySkills, useSkillGaps, useUpdateMySkills } from '../../api/queries';
import { SkillChip } from '../../components/SkillChip/SkillChip';
import styles from './MySkillsPage.module.scss';

const NO_SKILLS: string[] = [];
const SUGGESTIONS_LIMIT = 12;

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
    <section className={styles.page}>
      <h1>Мои навыки</h1>
      <p className={styles.description}>
        По этому списку считается процент совпадения с вакансиями.
      </p>

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
        <p className={styles.muted}>Пока пусто. Добавь навыки вручную или из подсказок ниже.</p>
      ) : (
        <div className={styles.chips}>
          {mySkills.map((skill) => (
            <SkillChip key={skill} name={skill} onRemove={() => removeSkill(skill)} />
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Часто требуют, а у тебя нет</h2>
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
        </section>
      )}
    </section>
  );
}