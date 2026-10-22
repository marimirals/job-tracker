import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useVacancies } from '../../api/queries';
import type { Vacancy, VacancyStatus } from '../../api/types';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { MatchBadge } from '../../components/MatchBadge/MatchBadge';
import { StatusSelect } from '../../components/StatusSelect/StatusSelect';
import { STATUS_LABELS, STATUSES, WORK_FORMAT_LABELS } from '../../constants';
import { formatDate, formatSalary } from '../../utils/format';
import { VacancyDrawer } from './VacancyDrawer';
import styles from './VacanciesPage.module.scss';

type StatusFilter = VacancyStatus | 'all';

const NO_VACANCIES: Vacancy[] = [];

const columnHelper = createColumnHelper<Vacancy>();

const columns = [
  columnHelper.accessor('title', {
    header: 'Вакансия',
    cell: ({ row }) => (
      <div>
        <div className={styles.title}>{row.original.title}</div>
        <div className={styles.muted}>{row.original.company ?? 'Компания не указана'}</div>
      </div>
    ),
  }),
  columnHelper.accessor((row) => row.salaryTo ?? row.salaryFrom ?? -1, {
    id: 'salary',
    header: 'Зарплата',
    cell: ({ row }) => formatSalary(row.original),
  }),
  columnHelper.accessor('workFormat', {
    header: 'Формат',
    cell: ({ getValue }) => {
      const format = getValue();
      return format ? WORK_FORMAT_LABELS[format] : '—';
    },
  }),
  columnHelper.accessor((row) => row.match ?? -1, {
    id: 'match',
    header: 'Совпадение',
    cell: ({ row }) => <MatchBadge value={row.original.match} />,
  }),
  columnHelper.accessor('status', {
    header: 'Статус',
    enableSorting: false,
    cell: ({ row }) => <StatusSelect vacancyId={row.original.id} value={row.original.status} />,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Добавлена',
    cell: ({ getValue }) => formatDate(getValue()),
  }),
];

export function VacanciesPage() {
  const { data: vacancies = NO_VACANCIES, isPending, isError, error } = useVacancies();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const data = useMemo(
    () =>
      statusFilter === 'all' ? vacancies : vacancies.filter((v) => v.status === statusFilter),
    [vacancies, statusFilter],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    globalFilterFn: (row, _columnId, filterValue: string) =>
      `${row.original.title} ${row.original.company ?? ''}`
        .toLowerCase()
        .includes(filterValue.toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (isPending) {
    return <p className={styles.state}>Загружаю вакансии…</p>;
  }

  if (isError) {
    return <EmptyState title="Не удалось загрузить вакансии" description={error.message} />;
  }

  if (vacancies.length === 0) {
    return (
      <EmptyState
        title="Пока пусто"
        description="Открой страницу вакансии и нажми «Сохранить вакансию» в расширении."
      />
    );
  }

  const rows = table.getRowModel().rows;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1>
          Вакансии <span className={styles.count}>{vacancies.length}</span>
        </h1>
        <div className={styles.filters}>
          <input
            type="search"
            className={styles.search}
            placeholder="Поиск по должности или компании"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className={styles.select}
            value={statusFilter}
            aria-label="Фильтр по статусу"
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">Все статусы</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const label = flexRender(header.column.columnDef.header, header.getContext());

                  return (
                    <th
                      key={header.id}
                      aria-sort={
                        sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : undefined
                      }
                    >
                      {header.column.getCanSort() ? (
                        <button
                          type="button"
                          className={styles.sortButton}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {label}
                          <span className={styles.sortIcon}>
                            {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : ''}
                          </span>
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={styles.row}
                tabIndex={0}
                onClick={() => setSelectedId(row.original.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setSelectedId(row.original.id);
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className={styles.state}>Ничего не найдено</p>}
      </div>

      {selectedId !== null && (
        <VacancyDrawer id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </section>
  );
}