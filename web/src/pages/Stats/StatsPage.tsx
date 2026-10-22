import { useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMySkills, useSkillGaps, useUpdateMySkills } from '../../api/queries';
import type { SkillType } from '../../api/types';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { HIGH_MATCH } from '../../constants';
import styles from './StatsPage.module.scss';

type TypeFilter = SkillType | 'all';

const NO_SKILLS: string[] = [];
const CHART_LIMIT = 15;
const ROW_HEIGHT = 32;

export function StatsPage() {
  const { data: stats, isPending, isError } = useSkillGaps();
  const { data: mySkills = NO_SKILLS } = useMySkills();
  const updateSkills = useUpdateMySkills();
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  if (isPending) {
    return <p className={styles.state}>Считаю статистику…</p>;
  }

  if (isError) {
    return <EmptyState title="Не удалось загрузить статистику" />;
  }

  if (stats.totalVacancies === 0) {
    return <EmptyState title="Нет данных" description="Сохрани несколько вакансий, и здесь появится статистика." />;
  }

  const filtered = stats.skills.filter(
    (skill) => (!onlyMissing || !skill.has) && (typeFilter === 'all' || skill.type === typeFilter),
  );
  const chartData = filtered.slice(0, CHART_LIMIT);

  const addSkill = (name: string) => updateSkills.mutate([...mySkills, name]);

  return (
    <section className={styles.page}>
      <h1>Статистика навыков</h1>

      <div className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.cardValue}>{stats.totalVacancies}</span>
          <span className={styles.cardLabel}>вакансий сохранено</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardValue}>
            {stats.averageMatch === null ? '—' : `${stats.averageMatch}%`}
          </span>
          <span className={styles.cardLabel}>среднее совпадение</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardValue}>{stats.highMatchCount}</span>
          <span className={styles.cardLabel}>с совпадением {HIGH_MATCH}%+</span>
        </div>
      </div>

      <div className={styles.controls}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={(event) => setOnlyMissing(event.target.checked)}
          />
          Только те, которых у меня нет
        </label>
        <select
          className={styles.select}
          value={typeFilter}
          aria-label="Тип навыков"
          onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
        >
          <option value="all">Все навыки</option>
          <option value="hard">Хард-скиллы</option>
          <option value="soft">Софт-скиллы</option>
        </select>
      </div>

      {chartData.length === 0 ? (
        <EmptyState title="Пробелов нет" description="Все навыки из вакансий у тебя уже есть." />
      ) : (
        <>
          <div className={styles.chartCard}>
            <h2 className={styles.chartTitle}>В каком проценте вакансий встречается навык</h2>
            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={styles.dotMissing} /> нет у тебя
              </span>
              {!onlyMissing && (
                <span className={styles.legendItem}>
                  <span className={styles.dotHas} /> есть у тебя
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={chartData.length * ROW_HEIGHT + 40}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(value: number) => `${value}%`}
                  stroke="var(--muted)"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fill: 'var(--text)', fontSize: 13 }}
                  stroke="var(--muted)"
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Встречается в вакансиях']}
                  cursor={{ fill: 'var(--surface)' }}
                  contentStyle={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="percent" radius={[0, 4, 4, 0]}>
                  {chartData.map((skill) => (
                    <Cell key={skill.name} fill={skill.has ? 'var(--success)' : 'var(--accent)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ul className={styles.list}>
            {filtered.map((skill) => (
              <li key={skill.name} className={styles.listItem}>
                <span className={styles.skillName}>{skill.name}</span>
                <span className={styles.skillMeta}>
                  {skill.type === 'hard' ? 'хард' : 'софт'} · в {skill.count} из{' '}
                  {stats.totalVacancies} вакансий ({skill.percent}%)
                </span>
                {skill.has ? (
                  <span className={styles.hasLabel}>есть</span>
                ) : (
                  <button
                    type="button"
                    className={styles.addButton}
                    disabled={updateSkills.isPending}
                    onClick={() => addSkill(skill.name)}
                  >
                    + В мои навыки
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}