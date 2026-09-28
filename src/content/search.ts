/**
 * Practices search (v1.1): names, English names, and other names such as
 * “Anulom Vilom”, ignoring case, accents, spaces, and hyphens.
 */
import type { Technique } from './types';

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s\-·’']+/g, '');

export function matches(query: string, fields: readonly (string | null | undefined)[]): boolean {
  const q = fold(query);
  return q.length === 0 || fields.some((f) => f && fold(f).includes(q));
}

export function searchLibrary(library: readonly Technique[], query: string): Technique[] {
  return library.filter((t) => matches(query, [t.name, t.subtitle, ...(t.aliases ?? [])]));
}
