'use client'

import { motion } from 'motion/react'
import { Testimonial } from '@/lib/types'

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const initial = testimonial.name.charAt(0).toUpperCase()

  return (
    <motion.div
      className="bg-white/10 rounded-xl p-6 backdrop-blur-sm"
      whileHover={{
        scale: 1.03,
        backgroundColor: 'rgba(255,255,255,0.15)',
        transition: { duration: 0.25 },
      }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.span
        className="text-4xl text-[var(--brand-secondary)] leading-none block mb-4"
        initial={{ opacity: 0, scale: 0 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: 'backOut' }}
      >
        {'\u201C'}
      </motion.span>
      <p className="text-white italic text-base mb-6">{testimonial.quote}</p>
      <div className="flex items-center gap-3">
        <motion.div
          className="w-10 h-10 rounded-full bg-[var(--brand-secondary)] text-white flex items-center justify-center font-semibold text-sm"
          whileHover={{ rotate: 360, transition: { duration: 0.6 } }}
        >
          {initial}
        </motion.div>
        <div>
          <p className="text-white font-semibold text-sm">{testimonial.name}</p>
          {(testimonial.role || testimonial.company) && (
            <p className="text-white/60 text-sm">
              {[testimonial.role, testimonial.company].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
