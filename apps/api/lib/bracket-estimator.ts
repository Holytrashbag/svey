export function estimateBracket(saltScores: number[]): number {
  if (saltScores.length === 0) return 2
  const avg = saltScores.reduce((sum, s) => sum + s, 0) / saltScores.length
  if (avg < 0.5) return 1
  if (avg < 1.0) return 2
  if (avg < 1.5) return 3
  if (avg < 2.5) return 4
  return 5
}
