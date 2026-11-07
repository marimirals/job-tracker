import type { ResumeProfile } from './types';

// Placeholder profile for anyone who clones the repository.
// Your real data lives in profile.local.ts, which git ignores.
export const PROFILE: ResumeProfile = {
  fullName: 'Фамилия Имя',
  email: 'name@example.com',
  phone: '+7 900 000-00-00',
  telegram: '@username',
  city: 'Москва',
  experience: [
    {
      title: 'Intern Developer',
      period: 'июнь, 2026 – август, 2026',
      company: 'Компания',
      description: 'Что делала на стажировке и какой результат получился.',
    },
  ],
  education: ['Университет, 2023-2027', 'Кафедра'],
  courses: [{ title: 'Название курса', details: 'Платформа, 2026' }],
};