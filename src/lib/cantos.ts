import cantosData from '../../data/cantos.json';

export type Cantica = 'inferno' | 'purgatorio' | 'paradiso';

export interface Canto {
  number: number;
  title: string;
  subtitle: string;
  original: string;
  modern: string | null;
  lineCount: number;
}

export interface CanticaInfo {
  name: Cantica;
  displayName: string;
  totalCantos: number;
}

const CANTICAS: CanticaInfo[] = [
  { name: 'inferno', displayName: 'Inferno', totalCantos: 34 },
  { name: 'purgatorio', displayName: 'Purgatorio', totalCantos: 33 },
  { name: 'paradiso', displayName: 'Paradiso', totalCantos: 33 },
];

export function getAllCanticas(): CanticaInfo[] {
  return CANTICAS;
}

export function getCanticaInfo(cantica: Cantica): CanticaInfo | undefined {
  return CANTICAS.find(c => c.name === cantica);
}

export function getCanto(cantica: Cantica, number: number): Canto | null {
  const cantos = cantosData[cantica];
  if (!cantos) return null;

  const canto = cantos.find((c: Canto) => c.number === number);
  return canto || null;
}

export function getAllCantos(cantica: Cantica): Canto[] {
  return cantosData[cantica] || [];
}

export function getCantoCount(cantica: Cantica): number {
  return cantosData[cantica]?.length || 0;
}

export function getNextCanto(cantica: Cantica, currentNumber: number): { cantica: Cantica; number: number } | null {
  const cantos = getAllCantos(cantica);
  const currentIndex = cantos.findIndex(c => c.number === currentNumber);

  if (currentIndex === -1) return null;

  // Check if there's a next canto in the same cantica
  if (currentIndex < cantos.length - 1) {
    return { cantica, number: cantos[currentIndex + 1].number };
  }

  // Check if there's a next cantica
  const canticaIndex = CANTICAS.findIndex(c => c.name === cantica);
  if (canticaIndex < CANTICAS.length - 1) {
    const nextCantica = CANTICAS[canticaIndex + 1].name;
    return { cantica: nextCantica, number: 1 };
  }

  return null;
}

export function getPreviousCanto(cantica: Cantica, currentNumber: number): { cantica: Cantica; number: number } | null {
  const cantos = getAllCantos(cantica);
  const currentIndex = cantos.findIndex(c => c.number === currentNumber);

  if (currentIndex === -1) return null;

  // Check if there's a previous canto in the same cantica
  if (currentIndex > 0) {
    return { cantica, number: cantos[currentIndex - 1].number };
  }

  // Check if there's a previous cantica
  const canticaIndex = CANTICAS.findIndex(c => c.name === cantica);
  if (canticaIndex > 0) {
    const prevCantica = CANTICAS[canticaIndex - 1].name;
    const prevCantos = getAllCantos(prevCantica);
    return { cantica: prevCantica, number: prevCantos[prevCantos.length - 1].number };
  }

  return null;
}
