import { SOURCES, type Source, type SourceId } from './sources';

/** “B.K.S. Iyengar, Light on Pranayama (1981)” */
export function sourceLine(id: SourceId): string {
  const s: Source = SOURCES[id];
  return `${s.authors}, ${s.title}${s.year && s.year !== 'n.d.' ? ` (${s.year})` : ''}`;
}

export function sourceLink(id: SourceId): string | null {
  const s: Source = SOURCES[id];
  if (s.doi) return `https://doi.org/${s.doi}`;
  if (s.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`;
  return s.url ?? null;
}

export const isStudy = (id: SourceId) => SOURCES[id].kind === 'study';
