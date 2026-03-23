import { LANGUAGE_LABELS, Language } from './language-context';

export const GROUP_LANGUAGE_OPTIONS: Language[] = ['es', 'en', 'fr', 'pt'];

const FALLBACK_GROUP_LANGUAGES: Language[] = [...GROUP_LANGUAGE_OPTIONS];

export function parseGroupLanguages(value: unknown): Language[] {
  const raw = (() => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  })();

  const normalized = raw
    .map((entry) => String(entry))
    .filter((entry): entry is Language => GROUP_LANGUAGE_OPTIONS.includes(entry as Language));

  const unique = Array.from(new Set(normalized));
  return unique.length > 0 ? unique : FALLBACK_GROUP_LANGUAGES;
}

export function getGroupLanguageLabel(code: Language): string {
  return LANGUAGE_LABELS[code] || code;
}

export function formatGroupLanguages(value: unknown): string {
  return parseGroupLanguages(value).map(getGroupLanguageLabel).join(', ');
}
