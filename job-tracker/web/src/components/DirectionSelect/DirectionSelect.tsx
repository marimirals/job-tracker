import { useDirections, useUpdateVacancy } from '../../api/queries';
import { cn } from '../../utils/format';
import styles from './DirectionSelect.module.scss';

interface DirectionSelectProps {
  vacancyId: number;
  value: number | null;
}

const NONE = '';

export function DirectionSelect({ vacancyId, value }: DirectionSelectProps) {
  const { data: directions = [] } = useDirections();
  const { mutate, isPending } = useUpdateVacancy();

  return (
    <select
      className={cn(styles.select, value === null && styles.empty)}
      value={value === null ? NONE : String(value)}
      disabled={isPending}
      aria-label="Направление вакансии"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onChange={(event) => {
        const next = event.target.value;
        mutate({ id: vacancyId, patch: { directionId: next === NONE ? null : Number(next) } });
      }}
    >
      <option value={NONE}>Без направления</option>
      {directions.map((direction) => (
        <option key={direction.id} value={direction.id}>
          {direction.name}
        </option>
      ))}
    </select>
  );
}
