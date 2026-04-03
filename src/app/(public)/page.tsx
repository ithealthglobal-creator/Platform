import { Hero } from '@/components/hero'
import { JourneySection } from '@/components/journey-section'
import { BlogCard } from '@/components/blog-card'
import { TestimonialCard } from '@/components/testimonial-card'
import { CTABanner } from '@/components/cta-banner'
import { createClient } from '@supabase/supabase-js'
import { BlogPost, Testimonial } from '@/lib/types'

export default async function HomePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .eq('is_active', true)
    .order('published_at', { ascending: false })
    .limit(3)

  const { data: testimonials } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .limit(3)

  return (
    <>
      <Hero />
      <JourneySection />

      {/* Blog Highlights */}
      <section className="py-16 px-6 md:px-12 lg:px-16 bg-white">
        <h2 className="text-center text-3xl font-bold text-[var(--brand-dark)] mb-2">Latest Insights</h2>
        <p className="text-center text-muted-foreground mb-10">Expert advice on IT modernisation</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {(posts as BlogPost[] ?? []).map(post => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-6 md:px-12 lg:px-16 bg-[var(--brand-dark)]">
        <h2 className="text-center text-3xl font-bold text-white mb-2">What Our Clients Say</h2>
        <p className="text-center text-white/60 mb-10">Trusted by businesses across industries</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {(testimonials as Testimonial[] ?? []).map(t => (
            <TestimonialCard key={t.id} testimonial={t} />
          ))}
        </div>
      </section>

      <CTABanner />
    </>
  )
}
