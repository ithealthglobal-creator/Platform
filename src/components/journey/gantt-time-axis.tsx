'use client'

interface GanttTimeAxisProps {
  labels: string[]
  labelWidth: number
}

export function GanttTimeAxis({ labels, labelWidth }: GanttTimeAxisProps) {
  return (
    <div className="flex border-b-2 border-brand-primary/20 bg-brand-primary/5">
      <div
        className="shrink-0 px-4 py-2.5 text-sm font-semibold text-brand-dark"
        style={{ width: labelWidth }}
      >
        Task
      </div>
      <div className="flex flex-1">
        {labels.map((label) => (
          <div
            key={label}
            className="flex-1 border-l border-slate-200 px-2 py-2.5 text-center text-xs text-slate-500"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
