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