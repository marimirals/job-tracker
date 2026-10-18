export interface SaveVacancyRequest {
  url: string;
  title: string;
  text: string;
}

export interface SavedVacancy {
  id: number;
  title: string;
  company: string | null;
  match: number | null;
}

export type SaveResult =
  | { ok: true; vacancy: SavedVacancy; duplicate: boolean }
  | { ok: false; error: string };