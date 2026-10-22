export type VacancyStatus = 'saved' | 'applied' | 'responded' | 'interview' | 'offer' | 'rejected';
export type WorkFormat = 'remote' | 'hybrid' | 'office';
export type SkillType = 'hard' | 'soft';
export type VacancySource = 'hh' | 'other';

export interface Vacancy {
  id: number;
  url: string;
  source: VacancySource;
  title: string;
  company: string | null;
  salaryFrom: number | null;
  salaryTo: number | null;
  currency: string | null;
  workFormat: WorkFormat | null;
  grade: string | null;
  status: VacancyStatus;
  match: number | null;
  createdAt: string;
}

export interface VacancySkill {
  name: string;
  type: SkillType;
  has: boolean;
}

export interface VacancyDetails extends Vacancy {
  notes: string;
  rawText: string;
  skills: VacancySkill[];
}

export interface VacancyPatch {
  status?: VacancyStatus;
  notes?: string;
}

export interface SkillStat {
  name: string;
  type: SkillType;
  count: number;
  percent: number;
  has: boolean;
}

export interface SkillGapsStats {
  totalVacancies: number;
  averageMatch: number | null;
  highMatchCount: number;
  skills: SkillStat[];
}