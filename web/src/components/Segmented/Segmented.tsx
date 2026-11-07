import { cn } from '../../utils/format';
import styles from './Segmented.module.scss';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'sm',
}: SegmentedProps<T>) {
  return (
    <div className={cn(styles.group, styles[size])} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(styles.option, option.value === value && styles.selected)}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}