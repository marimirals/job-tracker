import type { SaveResult, SaveVacancyRequest } from './types';

export type Message = {
  type: 'SAVE_VACANCY';
  tabId: number;
  payload: SaveVacancyRequest;
};

export function sendMessage(message: Message): Promise<SaveResult> {
  return chrome.runtime.sendMessage(message);
}