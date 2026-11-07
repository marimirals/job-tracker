import { request, USE_MOCKS } from './client';
import { mockApi } from './mocks';
import type { SkillGapsStats } from './types';

export function getSkillGaps(directionId: number | null = null): Promise<SkillGapsStats> {
  if (USE_MOCKS) {
    return mockApi.getSkillGaps(directionId);
  }
  const query = directionId === null ? '' : `?direction=${directionId}`;
  return request<SkillGapsStats>(`/api/stats/gaps${query}`);
}