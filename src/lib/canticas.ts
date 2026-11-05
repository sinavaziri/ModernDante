// Structure of the poem, with no canto text, so client components can import it
// without adding the text of all 100 cantos to every page's scripts.

export type Cantica = 'inferno' | 'purgatorio' | 'paradiso';

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

const ROMAN: Array<[number, string]> = [[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

/** 34 becomes "XXXIV". The site numbers cantos this way wherever it names one. */
export function toRoman(n: number): string {
  let out = '';
  for (const [value, numeral] of ROMAN) {
    while (n >= value) {
      out += numeral;
      n -= value;
    }
  }
  return out;
}

export function getNextCanto(cantica: Cantica, currentNumber: number): { cantica: Cantica; number: number } | null {
  const index = CANTICAS.findIndex(c => c.name === cantica);
  if (currentNumber < CANTICAS[index].totalCantos) {
    return { cantica, number: currentNumber + 1 };
  }

  const next = CANTICAS[index + 1];
  return next ? { cantica: next.name, number: 1 } : null;
}

export function getPreviousCanto(cantica: Cantica, currentNumber: number): { cantica: Cantica; number: number } | null {
  if (currentNumber > 1) {
    return { cantica, number: currentNumber - 1 };
  }

  const previous = CANTICAS[CANTICAS.findIndex(c => c.name === cantica) - 1];
  return previous ? { cantica: previous.name, number: previous.totalCantos } : null;
}
