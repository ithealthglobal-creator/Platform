import { Testimonial } from '@/lib/types'

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const initial = testimonial.name.charAt(0).toUpperCase()

  return (
    <div className="bg-white/10 rounded-lg p-6">
      <span className="text-4xl text-[var(--brand-secondary)] leading-none block mb-4">
        {'\u201C'}
      </span>
      <p className="text-white italic text-base mb-6">{testimonial.quote}</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--brand-secondary)] text-white flex items-center justify-center font-semibold text-sm">
          {initial}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{testimonial.name}</p>
          {(testimonial.role || testimonial.company) && (
            <p className="text-white/60 text-sm">
              {[testimonial.role, testimonial.company].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
