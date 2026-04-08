import type { AppData } from '../model/person';

const KEY = 'relationship-toolbook-v2';

const empty: AppData = { version: 1, people: [] };

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(empty);
    const parsed = JSON.parse(raw) as AppData;
    if (parsed?.version !== 1 || !Array.isArray(parsed.people)) return structuredClone(empty);
    return parsed;
  } catch {
    return structuredClone(empty);
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

/** 清空本地全部人物与记录 */
export function clearAllData(): void {
  saveData(structuredClone(empty));
}
