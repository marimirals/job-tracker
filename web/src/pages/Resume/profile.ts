import { PROFILE as EXAMPLE_PROFILE } from './profile.example';
import type { ResumeProfile } from './types';

// import.meta.glob returns an empty object when the file does not exist,
// so the app works both with and without a local profile.
const localModules = import.meta.glob<{ PROFILE: ResumeProfile }>('./profile.local.ts', {
  eager: true,
});

export const PROFILE: ResumeProfile = Object.values(localModules)[0]?.PROFILE ?? EXAMPLE_PROFILE;