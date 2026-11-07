import { useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDirections, useMySkills, useSkillGaps, useUpdateMySkills } from '../../api/queries';
import type { SkillType } from '../../api/types';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { Segmented, type SegmentedOption } from '../../components/Segmented/Segmented';
import { HIGH_MATCH } from '../../constants';
import styles from './StatsPage.module.scss';

type Scope = 'missing' | 'all';
type TypeFilter = SkillType | 'all';

const SCOPE_OPTIONS: SegmentedOption<Scope>[] = [
  { value: 'missing', label: 'Чего не хватает' },
  { value: 'all', label: 'Все навыки' },
];

const TYPE_OPTIONS: SegmentedOption<TypeFilter>[] = [
  { value: 'all', label: 'Все' },
  { value: 'hard', label: 'Хард' },
  { value: 'soft', label: 'Софт' },
];

const NO_SKILLS: string[] = [];
const CHART_LIMIT = 12;
const ROW_HEIGHT = 34;

const COLOR_MISSING = '#f4a983';
const COLOR_HAS = '#aaa572';

export function StatsPage() {
  const [directionId, setDirectionId] = useState<number | null>(null);
  const { data: stats, isPending, isError } = useSkillGaps(directionId);
  const { data: directions = [] } = useDirections();
  const { data: mySkills = NO_SKILLS } = useMySkills();
  const updateSkills = useUpdateMySkills();
  const [scope, setScope] = useState<Scope>('missing');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const header = (
    <PageHeader
      title="Статистика навыков"
      description="Что чаще всего просят в сохранённых вакансиях и чего из этого у тебя пока нет."
      actions={
        <>
          <select
            className={styles.select}
            value={directionId ?? ''}
            aria-label="Направление"
            onChange={(event) => setDirectionId(event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">Все направления</option>
            {directions.map((direction) => (
              <option key={direction.id} value={direction.id}>
                {direction.name}
              </option>
            ))}
          </select>
          <Segmented label="Какие навыки показать" options={SCOPE_OPTIONS} value={scope} onChange={setScope} />
          <Segmented label="Тип навыков" options={TYPE_OPTIONS} value={typeFilter} onChange={setTypeFilter} />
        </>
      }
    />
  );

  if (isPending) {
    return (
      <section>
        {header}
        <p className={styles.state}>Считаю статистику…</p>
      </section>
    );
  }

  if (isError) {
    return (
      <section>
        {header}
        <EmptyState title="Не удалось загрузить статистику" description="Проверь, что сервер запущен, и обнови страницу." />
      </section>
    );
  }

  if (stats.totalVacancies === 0) {
    return (
      <section>
        {header}
        <EmptyState
          title={directionId === null ? 'Статистика появится после первых вакансий' : 'В этом направлении пока нет вакансий'}
          description={
            directionId === null
              ? 'Сохрани несколько вакансий через расширение, и здесь будет видно, каких навыков чаще всего не хватает.'
              : 'Назначь направление вакансиям в таблице или сохрани новые: нейросеть определит направление сама.'
          }
        />
      </section>
    );
  }

  const filtered = stats.skills.filter(
    (skill) => (scope === 'all' || !skill.has) && (typeFilter === 'all' || skill.type === typeFilter),
  );
  const chartData = filtered.slice(0, CHART_LIMIT);

  const addSkill = (name: string) => updateSkills.mutate([...mySkills, name]);

  return (
    <section>
      {header}

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
          <span className={styles.cardLabel}>с совпадением от {HIGH_MATCH}%</span>
        </div>
      </div>

      {chartData.length === 0 ? (
        <EmptyState
          title="Пробелов нет"
          description="Все навыки из сохранённых вакансий у тебя уже есть. Переключись на «Все навыки», чтобы увидеть полный список."
        />
      ) : (
        <div className={styles.grid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Как часто встречается навык</h2>
              <div className={styles.legend}>
                <span className={styles.legendItem}>
                  <span className={styles.dot} style={{ background: COLOR_MISSING }} /> нет у тебя
                </span>
                {scope === 'all' && (
                  <span className={styles.legendItem}>
                    <span className={styles.dot} style={{ background: COLOR_HAS }} /> есть у тебя
                  </span>
                )}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={chartData.length * ROW_HEIGHT + 40}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(value: number) => `${value}%`}
                  stroke="#76715a"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  tick={{ fill: '#2f2d1f', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Встречается в вакансиях']}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.5)' }}
                  contentStyle={{
                    background: 'rgba(255, 255, 255, 0.92)',
                    border: '1px solid rgba(94, 90, 52, 0.14)',
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="percent" radius={[0, 999, 999, 0]} barSize={16}>
                  {chartData.map((skill) => (
                    <Cell key={skill.name} fill={skill.has ? COLOR_HAS : COLOR_MISSING} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {filtered.length > CHART_LIMIT && (
              <p className={styles.chartNote}>На графике первые {CHART_LIMIT}, остальные навыки есть в списке.</p>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Список</h2>
              <span className={styles.panelHint}>
                из {stats.totalVacancies} вакансий
              </span>
            </div>
            <ul className={styles.list}>
              {filtered.map((skill) => (
                <li key={skill.name} className={styles.listItem}>
                  <div className={styles.skill}>
                    <span className={styles.skillName}>{skill.name}</span>
                    <span className={styles.skillMeta}>
                      {skill.type === 'hard' ? 'хард' : 'софт'}, в {skill.count} вакансиях
                    </span>
                  </div>
                  <span className={styles.percent}>{skill.percent}%</span>
                  {skill.has ? (
                    <span className={styles.hasLabel}>есть</span>
                  ) : (
                    <button
                      type="button"
                      className={styles.addButton}
                      disabled={updateSkills.isPending}
                      onClick={() => addSkill(skill.name)}
                      aria-label={`Добавить ${skill.name} в мои навыки`}
                    >
                      Добавить
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}