import { DASHBOARD_URL } from '../shared/config';
import { sendMessage } from '../shared/messages';
import type { SaveResult } from '../shared/types';
import './popup.scss';

type StatusKind = 'loading' | 'success' | 'warning' | 'error';

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element #${id} not found`);
  }
  return element as T;
}

const pageTitle = getElement<HTMLParagraphElement>('page-title');
const saveButton = getElement<HTMLButtonElement>('save-button');
const status = getElement<HTMLDivElement>('status');
const dashboardButton = getElement<HTMLButtonElement>('dashboard-button');

function showStatus(kind: StatusKind, lines: string[]): void {
  status.className = `popup__status popup__status--${kind}`;
  status.replaceChildren(
    ...lines.map((line) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      return paragraph;
    }),
  );
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function extractPageText(tabId: number): Promise<string> {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => document.body.innerText,
  });
  return typeof injection?.result === 'string' ? injection.result : '';
}

function renderResult(result: SaveResult): void {
  if (!result.ok) {
    showStatus('error', [result.error]);
    return;
  }

  const { vacancy, duplicate } = result;
  const lines = [vacancy.company ? `${vacancy.title} — ${vacancy.company}` : vacancy.title];

  if (vacancy.match !== null) {
    lines.push(`Совпадение с твоими навыками: ${vacancy.match}%`);
  }

  if (duplicate) {
    showStatus('warning', ['Эта вакансия уже сохранена', ...lines]);
    return;
  }

  showStatus('success', ['Сохранено', ...lines]);
}

async function handleSave(): Promise<void> {
  const tab = await getActiveTab();

  if (!tab?.id || !tab.url?.startsWith('http')) {
    showStatus('error', ['На этой странице расширение не работает']);
    return;
  }

  saveButton.disabled = true;
  showStatus('loading', ['Разбираю вакансию…']);

  try {
    const text = await extractPageText(tab.id);
    const result = await sendMessage({
      type: 'SAVE_VACANCY',
      tabId: tab.id,
      payload: { url: tab.url, title: tab.title ?? '', text },
    });
    renderResult(result);
  } catch {
    showStatus('error', ['Не удалось прочитать страницу']);
  } finally {
    saveButton.disabled = false;
  }
}

async function init(): Promise<void> {
  const tab = await getActiveTab();
  pageTitle.textContent = tab?.title ?? 'Нет активной вкладки';

  saveButton.addEventListener('click', () => void handleSave());
  dashboardButton.addEventListener('click', () => void chrome.tabs.create({ url: DASHBOARD_URL }));
}

void init();