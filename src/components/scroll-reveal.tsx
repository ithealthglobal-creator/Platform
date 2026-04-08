'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useInView, useScroll, useTransform } from 'motion/react'

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'left' | 'right' | 'none'
  /** Scale from 0.95 to 1 on reveal */
  scale?: boolean
  /** Blur in on reveal */
  blur?: boolean
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = 'up',
  scale = false,
  blur = false,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const directionOffset = {
    up: { x: 0, y: 40 },
    left: { x: -40, y: 0 },
    right: { x: 40, y: 0 },
    none: { x: 0, y: 0 },
  }

  const offset = directionOffset[direction]

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        x: offset.x,
        y: offset.y,
        scale: scale ? 0.95 : 1,
        filter: blur ? 'blur(8px)' : 'blur(0px)',
      }}
      animate={
        isInView
          ? { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' }
          : {
              opacity: 0,
              x: offset.x,
              y: offset.y,
              scale: scale ? 0.95 : 1,
              filter: blur ? 'blur(8px)' : 'blur(0px)',
            }
      }
      transition={{
        duration: 0.7,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay,
      }}
    >
      {children}
    </motion.div>
  )
}

/** Parallax wrapper — content moves slower than scroll */
export function Parallax({
  children,
  className,
  speed = 0.3,
}: {
  children: React.ReactNode
  className?: string
  speed?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [speed * -100, speed * 100])

  return (
    <div ref={ref} className={className} style={{ overflow: 'hidden', position: 'relative' }}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  )
}

/** Counter that animates from 0 to target when in view */
export function AnimatedCounter({
  value,
  suffix = '',
  className,
}: {
  value: string
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const numericValue = parseInt(value) || 0
  const isNumeric = !isNaN(parseInt(value))
  const [displayVal, setDisplayVal] = useState(0)

  useEffect(() => {
    if (!isInView || !isNumeric) return
    const duration = 1500
    const steps = 40
    const increment = numericValue / steps
    let current = 0
    let step = 0
    const timer = setInterval(() => {
      step++
      // ease-out curve
      const progress = 1 - Math.pow(1 - step / steps, 3)
      current = Math.round(numericValue * progress)
      setDisplayVal(current)
      if (step >= steps) {
        setDisplayVal(numericValue)
        clearInterval(timer)
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [isInView, isNumeric, numericValue])

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {isNumeric ? `${displayVal}${suffix}` : `${value}${suffix}`}
    </motion.span>
  )
}
