import { AnimatedHero } from '@/components/animated-hero'
import { JourneySection } from '@/components/journey-section'
import { BlogCard } from '@/components/blog-card'
import { TestimonialCard } from '@/components/testimonial-card'
import { CTABanner } from '@/components/cta-banner'
import { ScrollReveal } from '@/components/scroll-reveal'
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
      <AnimatedHero />
      <JourneySection />

      {/* Blog Highlights */}
      <section className="py-32 px-8 md:px-16 lg:px-24 bg-white">
        <ScrollReveal>
          <h2 className="text-center text-3xl font-bold text-[var(--brand-dark)] mb-4">Latest Insights</h2>
          <p className="text-center text-muted-foreground mb-20">Expert advice on IT modernisation</p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
          {(posts as BlogPost[] ?? []).map((post, index) => (
            <ScrollReveal key={post.id} delay={index * 0.15}>
              <BlogCard post={post} />
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-8 md:px-16 lg:px-24 bg-[var(--brand-dark)]">
        <ScrollReveal>
          <h2 className="text-center text-3xl font-bold text-white mb-4">What Our Clients Say</h2>
          <p className="text-center text-white/60 mb-20">Trusted by businesses across industries</p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
          {(testimonials as Testimonial[] ?? []).map((t, index) => (
            <ScrollReveal key={t.id} delay={index * 0.15}>
              <TestimonialCard testimonial={t} />
            </ScrollReveal>
          ))}
        </div>
      </section>

      <CTABanner />
    </>
  )
}
