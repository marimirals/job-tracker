import { request, USE_MOCKS } from './client';
import { mockApi } from './mocks';

export function getMySkills(): Promise<string[]> {
  return USE_MOCKS ? mockApi.getMySkills() : request<string[]>('/api/skills/me');
}

export function updateMySkills(skills: string[]): Promise<string[]> {
  return USE_MOCKS
    ? mockApi.updateMySkills(skills)
    : request<string[]>('/api/skills/me', { method: 'PUT', body: { skills } });
}

export function getAllSkills(): Promise<string[]> {
  return USE_MOCKS ? mockApi.getAllSkills() : request<string[]>('/api/skills');
}