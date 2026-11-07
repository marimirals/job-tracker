export interface ExperienceItem {
  title: string;
  period: string;
  company: string;
  description: string;
}

export interface CourseItem {
  title: string;
  details: string;
}

// Fixed part of every resume: contacts, experience, education and courses.
// It is the same for all directions and is never rewritten by the LLM.
export interface ResumeProfile {
  fullName: string;
  email: string;
  phone: string;
  telegram: string;
  city: string;
  experience: ExperienceItem[];
  education: string[];
  courses: CourseItem[];
}

// Generated part, different for each direction.
export interface ResumeDraft {
  position: string;
  about: string;
  skills: string[];
  missing: string[];
  vacancyCount: number;
}

export interface ResumeDirection {
  id: string;
  name: string;
  draft: ResumeDraft;
}