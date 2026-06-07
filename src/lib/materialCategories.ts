export const MATERIAL_CATEGORIES = [
  { key: 'Videos', label: 'Videos' },
  { key: 'PDFs', label: 'PDFs' },
  { key: 'Presentations', label: 'Presentations' },
  { key: 'Documents', label: 'Documents' },
  { key: 'Links', label: 'Links' },
] as const;

export type MaterialCategoryKey = (typeof MATERIAL_CATEGORIES)[number]['key'];

export function inferMaterialCategory(filename?: string, mimeType?: string, isLink?: boolean): MaterialCategoryKey {
  if (isLink) return 'Links';
  const ext = String(filename || '').split('.').pop()?.toLowerCase() || '';
  const mime = String(mimeType || '').toLowerCase();
  if (mime.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext)) return 'Videos';
  if (mime === 'application/pdf' || ext === 'pdf') return 'PDFs';
  if (['ppt', 'pptx', 'key'].includes(ext)) return 'Presentations';
  if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'Documents';
  return 'Documents';
}

export function groupMaterialsByCategory<T extends { category?: string; file_type?: string; type?: string }>(
  items: T[],
): Record<MaterialCategoryKey, T[]> {
  const map = Object.fromEntries(MATERIAL_CATEGORIES.map((c) => [c.key, [] as T[]])) as Record<
    MaterialCategoryKey,
    T[]
  >;
  items.forEach((item) => {
    const raw = item.category || item.type || item.file_type || 'Documents';
    const key =
      MATERIAL_CATEGORIES.find((c) => c.key.toLowerCase() === String(raw).toLowerCase())?.key || 'Documents';
    map[key].push(item);
  });
  return map;
}
