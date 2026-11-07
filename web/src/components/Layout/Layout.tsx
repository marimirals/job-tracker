import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { USE_MOCKS } from '../../api/client';
import { cn } from '../../utils/format';
import styles from './Layout.module.scss';

const NAV_ITEMS = [
  { to: '/vacancies', label: 'Вакансии' },
  { to: '/stats', label: 'Статистика' },
  { to: '/skills', label: 'Мои навыки' },
  { to: '/resume', label: 'Резюме' },
];

const APP_NAME = 'Job Tracker';

function usePageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const item = NAV_ITEMS.find((nav) => pathname.startsWith(nav.to));
    document.title = item ? `${item.label} — ${APP_NAME}` : APP_NAME;
  }, [pathname]);
}

export function Layout() {
  usePageTitle();

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img className={styles.logo} src="/favicon.svg" alt="" width={36} height={36} />
          <span className={styles.name}>{APP_NAME}</span>
        </div>
        <nav className={styles.nav} aria-label="Разделы">
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
        <div className={styles.inner}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}