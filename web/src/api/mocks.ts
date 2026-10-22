import { HIGH_MATCH } from '../constants';
import type {
  SkillGapsStats,
  SkillStat,
  SkillType,
  Vacancy,
  VacancyDetails,
  VacancyPatch,
} from './types';

interface MockSkill {
  name: string;
  type: SkillType;
}

type MockVacancy = Omit<VacancyDetails, 'match' | 'skills'> & { skills: MockSkill[] };

const hard = (...names: string[]): MockSkill[] => names.map((name) => ({ name, type: 'hard' }));
const soft = (...names: string[]): MockSkill[] => names.map((name) => ({ name, type: 'soft' }));

const RAW_TEXT = 'Пример текста вакансии. Здесь будет исходный текст страницы, который сохранило расширение.';

let mySkills: string[] = ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Git', 'Командная работа'];

let vacancies: MockVacancy[] = [
  {
    id: 1,
    url: 'https://hh.ru/vacancy/1',
    source: 'hh',
    title: 'Frontend-разработчик (React)',
    company: 'Ромашка Tech',
    salaryFrom: 150000,
    salaryTo: 220000,
    currency: 'RUR',
    workFormat: 'remote',
    grade: 'Middle',
    status: 'saved',
    createdAt: '2026-10-21T10:00:00Z',
    notes: '',
    rawText: RAW_TEXT,
    skills: [
      ...hard('React', 'TypeScript', 'Redux', 'REST API', 'Git', 'Jest'),
      ...soft('Командная работа', 'Самостоятельность'),
    ],
  },
  {
    id: 2,
    url: 'https://hh.ru/vacancy/2',
    source: 'hh',
    title: 'Junior Frontend Developer',
    company: 'Облако',
    salaryFrom: 90000,
    salaryTo: 120000,
    currency: 'RUR',
    workFormat: 'hybrid',
    grade: 'Junior',
    status: 'applied',
    createdAt: '2026-10-20T12:30:00Z',
    notes: 'Откликнулась с сопроводительным',
    rawText: RAW_TEXT,
    skills: [...hard('JavaScript', 'HTML', 'CSS', 'React', 'Git'), ...soft('Обучаемость')],
  },
  {
    id: 3,
    url: 'https://career.habr.com/vacancies/3',
    source: 'other',
    title: 'React-разработчик',
    company: 'ФинСервис',
    salaryFrom: 200000,
    salaryTo: null,
    currency: 'RUR',
    workFormat: 'office',
    grade: 'Middle+',
    status: 'interview',
    createdAt: '2026-10-18T09:15:00Z',
    notes: '',
    rawText: RAW_TEXT,
    skills: [
      ...hard('React', 'TypeScript', 'Next.js', 'Docker', 'GraphQL', 'Webpack'),
      ...soft('Коммуникабельность'),
    ],
  },
  {
    id: 4,
    url: 'https://example.com/jobs/4',
    source: 'other',
    title: 'Frontend-разработчик (Vue)',
    company: 'Маркетплейс Плюс',
    salaryFrom: null,
    salaryTo: null,
    currency: null,
    workFormat: 'remote',
    grade: 'Middle',
    status: 'saved',
    createdAt: '2026-10-17T16:40:00Z',
    notes: '',
    rawText: RAW_TEXT,
    skills: [...hard('Vue', 'TypeScript', 'SCSS', 'Docker', 'Git'), ...soft('Командная работа')],
  },
  {
    id: 5,
    url: 'https://example.com/jobs/5',
    source: 'other',
    title: 'Frontend Engineer',
    company: 'Global Soft',
    salaryFrom: null,
    salaryTo: 3000,
    currency: 'USD',
    workFormat: 'remote',
    grade: 'Middle',
    status: 'rejected',
    createdAt: '2026-10-15T08:00:00Z',
    notes: '',
    rawText: RAW_TEXT,
    skills: [...hard('React', 'TypeScript', 'Next.js', 'Jest', 'Docker'), ...soft('Ответственность')],
  },
  {
    id: 6,
    url: 'https://hh.ru/vacancy/6',
    source: 'hh',
    title: 'Верстальщик / Frontend',
    company: 'Студия Пиксель',
    salaryFrom: 70000,
    salaryTo: 100000,
    currency: 'RUR',
    workFormat: 'office',
    grade: 'Junior',
    status: 'responded',
    createdAt: '2026-10-14T14:20:00Z',
    notes: '',
    rawText: RAW_TEXT,
    skills: [...hard('HTML', 'CSS', 'SCSS', 'JavaScript', 'Figma'), ...soft('Внимание к деталям')],
  },
];

const delay = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const hasSkill = (name: string) =>
  mySkills.some((skill) => skill.toLowerCase() === name.toLowerCase());

function computeMatch(skills: MockSkill[]): number | null {
  if (mySkills.length === 0 || skills.length === 0) {
    return null;
  }
  const covered = skills.filter((skill) => hasSkill(skill.name)).length;
  return Math.round((covered / skills.length) * 100);
}

function toVacancy(v: MockVacancy): Vacancy {
  return {
    id: v.id,
    url: v.url,
    source: v.source,
    title: v.title,
    company: v.company,
    salaryFrom: v.salaryFrom,
    salaryTo: v.salaryTo,
    currency: v.currency,
    workFormat: v.workFormat,
    grade: v.grade,
    status: v.status,
    createdAt: v.createdAt,
    match: computeMatch(v.skills),
  };
}

function toDetails(v: MockVacancy): VacancyDetails {
  return {
    ...toVacancy(v),
    notes: v.notes,
    rawText: v.rawText,
    skills: v.skills.map((skill) => ({ ...skill, has: hasSkill(skill.name) })),
  };
}

function findVacancy(id: number): MockVacancy {
  const vacancy = vacancies.find((v) => v.id === id);
  if (!vacancy) {
    throw new Error(`Вакансия ${id} не найдена`);
  }
  return vacancy;
}

export const mockApi = {
  async getVacancies(): Promise<Vacancy[]> {
    await delay();
    return vacancies.map(toVacancy);
  },

  async getVacancy(id: number): Promise<VacancyDetails> {
    await delay();
    return toDetails(findVacancy(id));
  },

  async updateVacancy(id: number, patch: VacancyPatch): Promise<VacancyDetails> {
    await delay();
    const vacancy = findVacancy(id);
    Object.assign(vacancy, patch);
    return toDetails(vacancy);
  },

  async deleteVacancy(id: number): Promise<void> {
    await delay();
    vacancies = vacancies.filter((v) => v.id !== id);
  },

  async getMySkills(): Promise<string[]> {
    await delay();
    return [...mySkills];
  },

  async updateMySkills(skills: string[]): Promise<string[]> {
    await delay();
    mySkills = [...new Set(skills.map((s) => s.trim()).filter(Boolean))];
    return [...mySkills];
  },

  async getAllSkills(): Promise<string[]> {
    await delay();
    const names = new Set(vacancies.flatMap((v) => v.skills.map((s) => s.name)));
    return [...names].sort((a, b) => a.localeCompare(b, 'ru'));
  },

  async getSkillGaps(): Promise<SkillGapsStats> {
    await delay();
    const stats = new Map<string, SkillStat>();

    for (const vacancy of vacancies) {
      for (const skill of vacancy.skills) {
        const stat = stats.get(skill.name) ?? {
          name: skill.name,
          type: skill.type,
          count: 0,
          percent: 0,
          has: hasSkill(skill.name),
        };
        stat.count += 1;
        stats.set(skill.name, stat);
      }
    }

    const total = vacancies.length;
    const skills = [...stats.values()]
      .map((stat) => ({ ...stat, percent: total ? Math.round((stat.count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    const matches = vacancies
      .map((v) => computeMatch(v.skills))
      .filter((m): m is number => m !== null);

    return {
      totalVacancies: total,
      averageMatch: matches.length
        ? Math.round(matches.reduce((sum, m) => sum + m, 0) / matches.length)
        : null,
      highMatchCount: matches.filter((m) => m >= HIGH_MATCH).length,
      skills,
    };
  },
};