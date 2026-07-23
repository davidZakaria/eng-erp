import { BOQItem } from '@/lib/types';

export type BoqDivisionGroup = {
  divisionCode: string;
  items: BOQItem[];
};

export function groupBoqByDivision(items: BOQItem[]): BoqDivisionGroup[] {
  const map = new Map<string, BOQItem[]>();

  for (const item of items) {
    const code = item.divisionCode?.trim() || '00';
    const list = map.get(code) ?? [];
    list.push(item);
    map.set(code, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([divisionCode, groupItems]) => ({
      divisionCode,
      items: groupItems.sort((a, b) => a.itemCode.localeCompare(b.itemCode)),
    }));
}
