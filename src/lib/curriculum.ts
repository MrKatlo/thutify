export const CURRICULUM_LEVELS = [
  'Primary School',
  'Secondary School',
  'Senior School',
  'Tertiary',
  'Certificate',
] as const;

export type CurriculumLevel = (typeof CURRICULUM_LEVELS)[number];

export const UNCATEGORIZED_LABEL = 'Uncategorized';

const LEVEL_LOOKUP = new Map(
  CURRICULUM_LEVELS.map((level) => [level.toLowerCase(), level]),
);

export function resolveCurriculumLevel(category?: string | null): string {
  const value = String(category || '').trim();
  if (!value) return UNCATEGORIZED_LABEL;
  return LEVEL_LOOKUP.get(value.toLowerCase()) || UNCATEGORIZED_LABEL;
}

export function normalizeCurriculumLevel(category?: string | null): CurriculumLevel | '' {
  const value = String(category || '').trim();
  if (!value) return '';
  return (LEVEL_LOOKUP.get(value.toLowerCase()) as CurriculumLevel | undefined) || '';
}

export const CURRICULUM_COLORS: Record<string, string> = {
  'Primary School': '#3b82f6',
  'Secondary School': '#8b5cf6',
  'Senior School': '#f59e0b',
  Tertiary: '#10b981',
  Certificate: '#ec4899',
  [UNCATEGORIZED_LABEL]: '#9ca3af',
};
