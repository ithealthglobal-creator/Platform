import Image from 'next/image'
import Link from 'next/link'
import { BlogPost } from '@/lib/types'

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="block">
      <article className="rounded-lg overflow-hidden border shadow-sm hover:shadow-md transition bg-white">
        {post.cover_image_url ? (
          <div className="relative h-48 w-full">
            <Image
              src={post.cover_image_url}
              alt={post.title}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-secondary)]/20" />
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
      </article>
    </Link>
  )
}
