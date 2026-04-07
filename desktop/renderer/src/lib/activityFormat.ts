export function fmtTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}k`
  return `${n}`
}

export function formatSessionTokenLine(sessionIn: number, sessionOut: number): string {
  if (sessionIn === 0 && sessionOut === 0) return ''
  return `${fmtTokenCount(sessionIn)} in · ${fmtTokenCount(sessionOut)} out`
}

export function formatTurnTokenLine(turnIn: number, turnOut: number): string {
  if (turnIn === 0 && turnOut === 0) return ''
  return `Turn ${fmtTokenCount(turnIn)}↓ ${fmtTokenCount(turnOut)}↑`
}
