import { PROFILE as EXAMPLE_PROFILE } from './profile.example';
import type { ResumeProfile } from './types';

// import.meta.glob returns an empty object when the file does not exist,
// so the app works both with and without a local profile.
const localModules = import.meta.glob<{ PROFILE: ResumeProfile }>('./profile.local.ts', {
  eager: true,
});

export const PROFILE: ResumeProfile = Object.values(localModules)[0]?.PROFILE ?? EXAMPLE_PROFILE;

// A short plain-text summary of the profile for the LLM, so the generated
// "about me" can mention real experience and education.
export function buildBackground(profile: ResumeProfile): string {
  const experience = profile.experience
    .map((item) => {
      const base = `${item.title} в «${item.company}» (${item.period})`;
      return item.description ? `${base}: ${item.description}` : base;
    })
    .join('; ');

  return [
    `Имя: ${profile.fullName}`,
    experience && `Опыт: ${experience}`,
    profile.education.length > 0 && `Образование: ${profile.education.join(', ')}`,
    profile.courses.length > 0 && `Курсы: ${profile.courses.map((course) => course.title).join(', ')}`,
  ]
    .filter(Boolean)
    .join('. ');
}
