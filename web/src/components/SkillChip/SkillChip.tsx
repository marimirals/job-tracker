import { cn } from '../../utils/format';
import styles from './SkillChip.module.scss';

interface SkillChipProps {
  name: string;
  variant?: 'neutral' | 'has' | 'missing';
  hint?: string;
  onAdd?: () => void;
  onRemove?: () => void;
}

export function SkillChip({ name, variant = 'neutral', hint, onAdd, onRemove }: SkillChipProps) {
  return (
    <span className={cn(styles.chip, styles[variant])}>
      {name}
      {hint && <span className={styles.hint}>{hint}</span>}
      {onAdd && (
        <button type="button" className={styles.action} onClick={onAdd} aria-label={`Добавить ${name}`}>
          +
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          className={styles.action}
          onClick={onRemove}
          aria-label={`Удалить ${name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}