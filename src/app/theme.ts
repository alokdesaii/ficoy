import { effect, signal } from '@angular/core';

type Theme = 'light' | 'dark';
const KEY = 'ficoy-theme';

const saved = (): Theme | null => { try { return localStorage.getItem(KEY) as Theme | null; } catch { return null; } };
const system = (): Theme => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const theme = signal<Theme>(saved() ?? system());

// call once from the root component; keeps <html> in sync and remembers an explicit choice
export function syncTheme() {
  effect(() => {
    const t = theme();
    document.documentElement.dataset['theme'] = t;
    document.documentElement.dataset['bsTheme'] = t; // Bootstrap's own dark mode for inputs/tables
  });
}
export function toggleTheme() {
  theme.update(t => t === 'dark' ? 'light' : 'dark');
  try { localStorage.setItem(KEY, theme()); } catch { /* private mode: still works for this session */ }
}
