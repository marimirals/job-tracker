import { request, USE_MOCKS } from './client';
import { mockApi } from './mocks';
import type { SkillGapsStats } from './types';

export function getSkillGaps(): Promise<SkillGapsStats> {
  return USE_MOCKS ? mockApi.getSkillGaps() : request<SkillGapsStats>('/api/stats/gaps');
}