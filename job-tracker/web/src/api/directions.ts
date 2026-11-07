import { request, USE_MOCKS } from './client';
import { mockApi } from './mocks';
import type { Direction } from './types';

export function getDirections(): Promise<Direction[]> {
  return USE_MOCKS ? mockApi.getDirections() : request<Direction[]>('/api/directions');
}

export function createDirection(name: string): Promise<Direction> {
  return USE_MOCKS
    ? mockApi.createDirection(name)
    : request<Direction>('/api/directions', { method: 'POST', body: { name } });
}

export function deleteDirection(id: number): Promise<void> {
  return USE_MOCKS
    ? mockApi.deleteDirection(id)
    : request<void>(`/api/directions/${id}`, { method: 'DELETE' });
}
