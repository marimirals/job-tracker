import type { ResumeDirection } from './types';

// Example drafts until generation by vacancies is connected.
export const DEFAULT_DIRECTIONS: ResumeDirection[] = [
  {
    id: 'frontend',
    name: 'Фронтенд и фулстек',
    draft: {
      position: 'Frontend-разработчик',
      about:
        'Фронтенд-разработчик с опытом стажировки в продуктовой команде. Пишу на JavaScript, верстаю адаптивные интерфейсы и работаю с базами данных на SQL.',
      skills: ['JavaScript', 'HTML', 'SQL', 'Python'],
      missing: ['React', 'TypeScript', 'Next.js', 'Jest'],
      vacancyCount: 12,
    },
  },
  {
    id: 'devops',
    name: 'DevOps',
    draft: {
      position: 'Junior DevOps-инженер',
      about:
        'Начинающий DevOps-инженер с бэкграундом в разработке. Пишу на Python и SQL, разбираюсь в основах компьютерных сетей.',
      skills: ['Python', 'SQL'],
      missing: ['Linux', 'Docker', 'Kubernetes', 'CI/CD'],
      vacancyCount: 5,
    },
  },
  {
    id: 'ml',
    name: 'ML-инженер',
    draft: {
      position: 'Junior ML-инженер',
      about:
        'Студентка МГТУ им. Н. Э. Баумана, интересуюсь машинным обучением. Пишу на Python и SQL, работаю с данными и быстро осваиваю новые инструменты.',
      skills: ['Python', 'SQL'],
      missing: ['PyTorch', 'Pandas', 'MLOps', 'Docker'],
      vacancyCount: 3,
    },
  },
];