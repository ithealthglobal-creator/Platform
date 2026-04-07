'use client'

interface ServiceBarsService {
  id: string
  name: string
  pct: number
  phaseColor: string
}

interface ServiceBarsProps {
  services: ServiceBarsService[]
}

export function ServiceBars({ services }: ServiceBarsProps) {
  if (!services || services.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-500">No service data yet</p>
      </div>
    )
  }

  // Sort ascending (weakest first)
  const sorted = [...services].sort((a, b) => a.pct - b.pct)

  return (
    <div className="space-y-3">
      {sorted.map(service => (
        <div key={service.id}>
          <div className="mb-1 flex items-center justify-between">
            <span className="max-w-[60%] truncate text-xs font-medium text-slate-700">
              {service.name}
            </span>
            <span className="text-xs font-semibold text-slate-600">{service.pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${service.pct}%`,
                background: `linear-gradient(90deg, ${service.phaseColor}, ${service.phaseColor}88)`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
