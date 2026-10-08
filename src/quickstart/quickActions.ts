/**
 * App-icon quick actions (FR-12): “Begin last practice”, “5-minute box
 * breathing”, and the most recent other practice once history has two.
 */
import { describeRhythm, describeTarget } from '../breathing/describe';
import type { SessionRecord } from '../history/repository';
import { quickBox, parsePractice, practiceKey, type Practice } from '../practice/practice';

export interface QuickAction {
  id: 'last' | 'box' | 'recent';
  title: string;
  subtitle: string;
  icon: string;
  params: { practice: string } | null;
}

/** The single practice a record ran; routine records have none. */
export function practiceFromRecord(record: SessionRecord): Practice | null {
  if (record.parts || record.source.kind === 'routine') return null;
  return parsePractice({
    source: record.source,
    name: record.name,
    techniqueId: record.techniqueId,
    steps: record.steps,
    target: record.target,
    slowing: record.slowing,
  });
}

export function quickActionItems(last: Practice | null, history: readonly SessionRecord[]): QuickAction[] {
  const box = quickBox();
  const items: QuickAction[] = [];
  if (last && history.length > 0) {
    items.push({ id: 'last', title: 'Begin last practice', subtitle: `${last.name} · ${describeTarget(last.target)}`, icon: 'symbol:play.circle', params: null });
  }
  items.push({ id: 'box', title: '5-minute box breathing', subtitle: `${box.name} · ${describeRhythm(box.steps)}`, icon: 'symbol:square', params: null });

  const singles = history.filter((r) => !r.parts);
  const distinct = new Set(singles.map((r) => practiceKey(r)));
  if (last && distinct.size >= 2) {
    const other = singles.find((r) => practiceKey(r) !== practiceKey(last));
    const practice = other && practiceFromRecord(other);
    if (practice) {
      items.push({
        id: 'recent',
        title: `${practice.name} · ${describeTarget(practice.target)}`,
        subtitle: 'Recent practice',
        icon: 'symbol:clock.arrow.circlepath',
        params: { practice: JSON.stringify(practice) },
      });
    }
  }
  return items;
}
