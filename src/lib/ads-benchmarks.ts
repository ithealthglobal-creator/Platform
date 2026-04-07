export type BenchmarkColor = 'green' | 'amber' | 'red'

interface BenchmarkRule {
  green: (v: number) => boolean
  amber: (v: number) => boolean
}

const BENCHMARKS: Record<string, BenchmarkRule> = {
  hook_rate: {
    green: (v) => v >= 25,
    amber: (v) => v >= 20 && v < 25,
  },
  ctr: {
    green: (v) => v >= 1.5,
    amber: (v) => v >= 1.0 && v < 1.5,
  },
  cpa: {
    green: (v) => v <= 23.1,
    amber: (v) => v > 23.1 && v <= 30,
  },
  emq_score: {
    green: (v) => v >= 6,
    amber: (v) => v >= 4 && v < 6,
  },
}

export function getBenchmarkColor(metric: string, value: number | null): BenchmarkColor | null {
  if (value === null || value === undefined) return null
  const rule = BENCHMARKS[metric]
  if (!rule) return null
  if (rule.green(value)) return 'green'
  if (rule.amber(value)) return 'amber'
  return 'red'
}
