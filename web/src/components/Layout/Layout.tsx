import { NavLink, Outlet } from 'react-router';
import { USE_MOCKS } from '../../api/client';
import { cn } from '../../utils/format';
import styles from './Layout.module.scss';

const NAV_ITEMS = [
  { to: '/vacancies', label: 'Вакансии' },
  { to: '/stats', label: 'Статистика' },
  { to: '/skills', label: 'Мои навыки' },
  { to: '/resume', label: 'Резюме' },
];

export function Layout() {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <span className={styles.logo}>Job Tracker</span>
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(styles.link, isActive && styles.active)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        {USE_MOCKS && <span className={styles.mockBadge}>Демо-данные</span>}
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}