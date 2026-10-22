import { createBrowserRouter, Navigate } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { Layout } from './components/Layout/Layout';
import { EmptyState } from './components/EmptyState/EmptyState';
import { VacanciesPage } from './pages/Vacancies/VacanciesPage';
import { StatsPage } from './pages/Stats/StatsPage';
import { MySkillsPage } from './pages/MySkills/MySkillsPage';
import { ResumePage } from './pages/Resume/ResumePage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/vacancies" replace /> },
      { path: 'vacancies', element: <VacanciesPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'skills', element: <MySkillsPage /> },
      { path: 'resume', element: <ResumePage /> },
      { path: '*', element: <EmptyState title="Страница не найдена" /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}