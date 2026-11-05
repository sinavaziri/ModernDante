import 'server-only';

import cantosData from '../../data/cantos.json';
import type { Cantica } from '@/lib/canticas';

export interface Canto {
  number: number;
  title: string;
  subtitle: string;
  modern: string | null;
}

export type CantoListItem = Pick<Canto, 'number' | 'title'>;

export function getCanto(cantica: Cantica, number: number): Canto | null {
  const canto = cantosData[cantica]?.find(c => c.number === number);
  if (!canto) return null;

  // Passed to a client component, so it must leave out the source text the page never shows.
  return {
    number: canto.number,
    title: canto.title,
    subtitle: canto.subtitle,
    modern: canto.modern,
  };
}

export function getCantoList(cantica: Cantica): CantoListItem[] {
  return (cantosData[cantica] || []).map(({ number, title }) => ({ number, title }));
}
