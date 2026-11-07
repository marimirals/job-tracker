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
  directionId: number | null;
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
  directionId?: number | null;
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

export interface Direction {
  id: number;
  name: string;
  vacancyCount: number;
}

export interface Resume {
  directionId: number;
  position: string;
  about: string;
  skills: string[];
  missing: string[];
  vacancyCount: number;
  generatedAt: string | null;
}

export interface ResumeUpdate {
  position: string;
  about: string;
  skills: string[];
}