import { request, USE_MOCKS } from './client';
import { mockApi } from './mocks';
import type { Resume, ResumeUpdate } from './types';

export function getResume(directionId: number): Promise<Resume> {
  return USE_MOCKS ? mockApi.getResume(directionId) : request<Resume>(`/api/resumes/${directionId}`);
}

export function saveResume(directionId: number, update: ResumeUpdate): Promise<Resume> {
  return USE_MOCKS
    ? mockApi.saveResume(directionId, update)
    : request<Resume>(`/api/resumes/${directionId}`, { method: 'PUT', body: update });
}

export function generateResume(directionId: number, background: string): Promise<Resume> {
  return USE_MOCKS
    ? mockApi.generateResume(directionId)
    : request<Resume>(`/api/resumes/${directionId}/generate`, {
        method: 'POST',
        body: { background },
      });
}