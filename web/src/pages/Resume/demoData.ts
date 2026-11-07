import type { ResumeDirection, ResumeProfile } from './types';

// Demo data for the page layout. Real contacts will come from a profile
// that is stored outside the repository, so they never end up on GitHub.
export const DEMO_PROFILE: ResumeProfile = {
  fullName: 'Смирнова Анна',
  email: 'anna@example.com',
  phone: '+7 900 000-00-00',
  telegram: '@example',
  city: 'Москва',
  experience: [
    {
      title: 'Intern Fullstack Developer',
      period: 'июнь 2026 – август 2026',
      company: 'Компания',
      description:
        'Разрабатывала интерфейсы личного кабинета на React и TypeScript, писала REST-эндпоинты и покрывала их тестами.',
    },
  ],
  education: ['Технический университет, 2023–2027', 'Кафедра информационных систем'],
  courses: [
    { title: 'Основы компьютерных сетей', details: 'Stepik, 2026' },
    { title: 'Программа по веб-разработке', details: 'Образовательный центр, 2025' },
  ],
};

export const DEMO_DIRECTIONS: ResumeDirection[] = [
  {
    id: 'frontend',
    name: 'Фронтенд и фулстек',
    draft: {
      position: 'Frontend-разработчик',
      about:
        'Фронтенд-разработчик с опытом стажировки в продуктовой команде. Пишу на React и TypeScript, верстаю адаптивные интерфейсы, умею поднять бэкенд на Go и PostgreSQL для своего проекта.',
      skills: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'SCSS', 'REST API', 'Git', 'Go', 'PostgreSQL'],
      missing: ['Next.js', 'Jest', 'Redux'],
      vacancyCount: 12,
    },
  },
  {
    id: 'devops',
    name: 'DevOps',
    draft: {
      position: 'Junior DevOps-инженер',
      about:
        'Начинающий DevOps-инженер с бэкграундом в разработке. Собираю приложения в Docker, настраиваю базы PostgreSQL и разбираюсь в основах компьютерных сетей.',
      skills: ['Linux', 'Docker', 'Git', 'PostgreSQL', 'Bash', 'Go'],
      missing: ['Kubernetes', 'CI/CD', 'Terraform', 'Prometheus'],
      vacancyCount: 5,
    },
  },
  {
    id: 'ml',
    name: 'ML-инженер',
    draft: {
      position: 'Junior ML-инженер',
      about:
        'Студентка технического вуза, интересуюсь машинным обучением. Пишу на Python и SQL, работаю с данными и готова быстро осваивать production-инструменты.',
      skills: ['Python', 'SQL', 'Git', 'Linux'],
      missing: ['PyTorch', 'Pandas', 'MLOps', 'Docker'],
      vacancyCount: 3,
    },
  },
];