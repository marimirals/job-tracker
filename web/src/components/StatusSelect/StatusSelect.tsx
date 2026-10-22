import { useUpdateVacancy } from '../../api/queries';
import type { VacancyStatus } from '../../api/types';
import { STATUS_LABELS, STATUSES } from '../../constants';
import { cn } from '../../utils/format';
import styles from './StatusSelect.module.scss';

interface StatusSelectProps {
  vacancyId: number;
  value: VacancyStatus;
}

export function StatusSelect({ vacancyId, value }: StatusSelectProps) {
  const { mutate, isPending } = useUpdateVacancy();

  return (
    <select
      className={cn(styles.select, styles[value])}
      value={value}
      disabled={isPending}
      aria-label="Статус вакансии"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onChange={(event) =>
        mutate({ id: vacancyId, patch: { status: event.target.value as VacancyStatus } })
      }
    >
      {STATUSES.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}