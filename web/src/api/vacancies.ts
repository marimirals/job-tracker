import { request, USE_MOCKS } from './client';
import { mockApi } from './mocks';
import type { Vacancy, VacancyDetails, VacancyPatch } from './types';

export function getVacancies(): Promise<Vacancy[]> {
  return USE_MOCKS ? mockApi.getVacancies() : request<Vacancy[]>('/api/vacancies');
}

export function getVacancy(id: number): Promise<VacancyDetails> {
  return USE_MOCKS ? mockApi.getVacancy(id) : request<VacancyDetails>(`/api/vacancies/${id}`);
}

export function updateVacancy(id: number, patch: VacancyPatch): Promise<VacancyDetails> {
  return USE_MOCKS
    ? mockApi.updateVacancy(id, patch)
    : request<VacancyDetails>(`/api/vacancies/${id}`, { method: 'PATCH', body: patch });
}

export function deleteVacancy(id: number): Promise<void> {
  return USE_MOCKS
    ? mockApi.deleteVacancy(id)
    : request<void>(`/api/vacancies/${id}`, { method: 'DELETE' });
}