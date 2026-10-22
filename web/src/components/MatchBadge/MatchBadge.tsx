import { HIGH_MATCH, MEDIUM_MATCH } from '../../constants';
import { cn } from '../../utils/format';
import styles from './MatchBadge.module.scss';

interface MatchBadgeProps {
  value: number | null;
  size?: 'sm' | 'lg';
}

export function MatchBadge({ value, size = 'sm' }: MatchBadgeProps) {
  if (value === null) {
    return (
      <span className={cn(styles.badge, styles[size], styles.empty)} title="Заполни свои навыки">
        —
      </span>
    );
  }

  let level: 'high' | 'medium' | 'low' = 'low';
  if (value >= HIGH_MATCH) {
    level = 'high';
  } else if (value >= MEDIUM_MATCH) {
    level = 'medium';
  }

  return <span className={cn(styles.badge, styles[size], styles[level])}>{value}%</span>;
}