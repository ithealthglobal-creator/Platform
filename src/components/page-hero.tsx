'use client'

import { motion } from 'motion/react'

interface PageHeroProps {
  title: string
  subtitle?: string
}

export function PageHero({ title, subtitle }: PageHeroProps) {
  return (
    <section className="h-[30vh] flex items-end bg-[var(--brand-primary)] text-white">
      <div className="max-w-7xl mx-auto w-full px-6 md:px-12 lg:px-16 pb-16">
        <motion.h1
          className="text-4xl md:text-5xl font-light"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            className="text-white/80 text-lg mt-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
          >
            {subtitle}
          </motion.p>
        )}
      </div>
    </section>
  )
}
