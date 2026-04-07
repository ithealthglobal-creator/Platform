/** Canonical phase color map — single source of truth */
export const PHASE_COLORS: Record<string, string> = {
  Operate: '#1175E4',
  Secure: '#FF246B',
  Streamline: '#133258',
  Accelerate: '#EDB600',
}

/** Get the hex color for a phase name (case-insensitive first letter match). Falls back to slate. */
export function getPhaseColor(phaseName: string | undefined | null): string {
  if (!phaseName) return '#94a3b8'
  // Try exact match first, then title-case
  return PHASE_COLORS[phaseName]
    ?? PHASE_COLORS[phaseName.charAt(0).toUpperCase() + phaseName.slice(1).toLowerCase()]
    ?? '#94a3b8'
}
