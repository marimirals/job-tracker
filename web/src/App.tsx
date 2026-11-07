import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { Layout } from './components/Layout/Layout';
import { EmptyState } from './components/EmptyState/EmptyState';

const VacanciesPage = lazy(() =>
  import('./pages/Vacancies/VacanciesPage').then((m) => ({ default: m.VacanciesPage })),
);
const StatsPage = lazy(() => import('./pages/Stats/StatsPage').then((m) => ({ default: m.StatsPage })));
const MySkillsPage = lazy(() =>
  import('./pages/MySkills/MySkillsPage').then((m) => ({ default: m.MySkillsPage })),
);
const ResumePage = lazy(() => import('./pages/Resume/ResumePage').then((m) => ({ default: m.ResumePage })));

const page = (element: React.ReactNode) => <Suspense fallback={null}>{element}</Suspense>;

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/vacancies" replace /> },
      { path: 'vacancies', element: page(<VacanciesPage />) },
      { path: 'stats', element: page(<StatsPage />) },
      { path: 'skills', element: page(<MySkillsPage />) },
      { path: 'resume', element: page(<ResumePage />) },
      { path: '*', element: <EmptyState title="Такой страницы нет" description="Проверь адрес или вернись к списку вакансий." /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}