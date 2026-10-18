import { API_URL } from '../shared/config';
import type { Message } from '../shared/messages';
import type { SavedVacancy, SaveResult, SaveVacancyRequest } from '../shared/types';

async function saveVacancy(payload: SaveVacancyRequest): Promise<SaveResult> {
  try {
    const response = await fetch(`${API_URL}/api/vacancies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.status === 409) {
      const vacancy = (await response.json()) as SavedVacancy;
      return { ok: true, vacancy, duplicate: true };
    }

    if (!response.ok) {
      return { ok: false, error: `Сервер ответил ошибкой ${response.status}` };
    }

    const vacancy = (await response.json()) as SavedVacancy;
    return { ok: true, vacancy, duplicate: false };
  } catch {
    return { ok: false, error: 'Сервер недоступен. Запущен ли бэкенд?' };
  }
}

async function updateBadge(tabId: number, result: SaveResult): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({
    tabId,
    color: result.ok ? '#15803d' : '#b91c1c',
  });
  await chrome.action.setBadgeText({ tabId, text: result.ok ? '✓' : '!' });
}

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type !== 'SAVE_VACANCY') {
    return false;
  }

  saveVacancy(message.payload).then((result) => {
    void updateBadge(message.tabId, result);
    sendResponse(result);
  });

  return true;
});