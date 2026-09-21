/**
 * Frases do Dia institucionais e motivacionais para o CEEP+.
 * Seleção determinística baseada na data atual.
 */

export const DAILY_QUOTES: string[] = [
  "O futuro é glorioso.",
  "A persistência transforma esforço em conquista.",
  "O conhecimento é a chave que abre todas as portas.",
  "Grandes jornadas começam com pequenos passos diários.",
  "Aprender hoje é construir o amanhã com excelência.",
  "A dedicação de hoje molda o profissional do futuro.",
  "Inovação nasce da curiosidade e do trabalho dedicado.",
  "Acredite no seu potencial e faça acontecer.",
  "Cada desafio superado é um degrau rumo ao sucesso.",
  "A prática constante conduz à maestria.",
  "O aprendizado constante é o nosso maior diferencial.",
  "Cultive disciplina e colha realizações.",
  "O conhecimento transforma realidades e constrói futuros.",
  "Foco no processo, orgulho do resultado.",
  "A excelência é um hábito construído dia após dia.",
  "A educação técnica conecta teoria à transformação real.",
  "Trabalho em equipe e dedicação geram resultados extraordinários.",
  "Seu esforço diário é o alicerce das suas conquistas.",
  "Pense grande, comece pequeno, aja agora.",
  "A curiosidade move a ciência e a técnica move o mundo.",
  "Cada linha de código e projeto é um passo em direção ao seu objetivo."
];

/**
 * Retorna a frase do dia de forma determinística para uma dada data (ou a data atual).
 * Garante que todos os alunos visualizem a mesma frase no mesmo dia, e que a frase mude ao virar a data.
 */
export function getDailyQuote(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Cálculo determinístico do número de dias desde a época UTC local
  const dayIndex = Math.floor(Date.UTC(year, month, day) / (24 * 60 * 60 * 1000));
  const index = Math.abs(dayIndex) % DAILY_QUOTES.length;
  
  return DAILY_QUOTES[index];
}
