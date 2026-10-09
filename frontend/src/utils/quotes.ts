/**
 * Frases do Dia institucionais e motivacionais para o CEEP+.
 * Seleção determinística baseada na data atual.
 */

export const DAILY_QUOTES: string[] = [
  "O futuro é glorioso.".
];


export function getDailyQuote(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
 
  const dayIndex = Math.floor(Date.UTC(year, month, day) / (24 * 60 * 60 * 1000));
  const index = Math.abs(dayIndex) % DAILY_QUOTES.length;
  
  return DAILY_QUOTES[index];
}
