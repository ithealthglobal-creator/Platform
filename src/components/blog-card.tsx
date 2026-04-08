'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'motion/react'
import { BlogPost } from '@/lib/types'

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="block">
      <motion.article
        className="rounded-xl overflow-hidden border shadow-sm bg-white"
        whileHover={{
          y: -8,
          boxShadow: '0 20px 40px -12px rgba(0,0,0,0.15)',
          transition: { duration: 0.3, ease: 'easeOut' },
        }}
        whileTap={{ scale: 0.98 }}
      >
        {post.cover_image_url ? (
          <div className="relative h-48 w-full overflow-hidden">
            <motion.div
              className="h-full w-full"
              whileHover={{ scale: 1.08, transition: { duration: 0.5 } }}
            >
              <Image
                src={post.cover_image_url}
                alt={post.title}
                fill
                className="object-cover"
              />
            </motion.div>
          </div>
        ) : (
          <div className="h-48 bg-[var(--brand-primary)]/10" />
        )}
        <div className="p-4">
          {post.category && (
            <span className="inline-block text-xs bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] px-2 py-1 rounded-full mb-2">
              {post.category}
            </span>
          )}
          <h3 className="font-semibold text-lg line-clamp-2 mb-2">{post.title}</h3>
          {post.excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{post.excerpt}</p>
          )}
          {post.published_at && (
            <p className="text-xs text-muted-foreground">
              {new Date(post.published_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      </motion.article>
    </Link>
  )
}
