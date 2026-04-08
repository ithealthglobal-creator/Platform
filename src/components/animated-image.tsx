'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useInView } from 'motion/react'

interface AnimatedImageProps {
  src: string
  alt: string
  width: number
  height: number
  /** Rotation angle in degrees (positive = clockwise) */
  rotate?: number
  /** Delay before animation starts */
  delay?: number
  /** Optional className */
  className?: string
  /** Priority loading */
  priority?: boolean
}

export function AnimatedImage({
  src,
  alt,
  width,
  height,
  rotate = 0,
  delay = 0,
  className = '',
  priority = false,
}: AnimatedImageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      initial={{
        opacity: 0,
        y: 50,
        rotate: rotate * 1.5,
        scale: 0.9,
      }}
      animate={
        isInView
          ? { opacity: 1, y: 0, rotate, scale: 1 }
          : { opacity: 0, y: 50, rotate: rotate * 1.5, scale: 0.9 }
      }
      transition={{
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay,
      }}
      whileHover={{
        scale: 1.03,
        rotate: 0,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        transition: { duration: 0.3, ease: 'easeOut' },
      }}
      className={`overflow-hidden rounded-2xl shadow-xl ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="w-full h-auto"
        priority={priority}
      />
    </motion.div>
  )
}
