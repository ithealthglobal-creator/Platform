import Image from 'next/image'
import Link from 'next/link'
import { AnimatedHero } from '@/components/animated-hero'
import { JourneySection } from '@/components/journey-section'
import { AnimatedImage } from '@/components/animated-image'
import { BlogCard } from '@/components/blog-card'
import { TestimonialCard } from '@/components/testimonial-card'
import { CTABanner } from '@/components/cta-banner'
import { ScrollReveal, Parallax } from '@/components/scroll-reveal'
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

      {/* Mission statement */}
      <section className="py-36 bg-white">
        <ScrollReveal blur>
          <p className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 text-3xl md:text-4xl font-extralight text-[var(--brand-dark)] leading-relaxed text-left">
            In today&apos;s world, modern IT isn&apos;t optional — we guide
            you through IT modernisation with simplicity,
            clarity and security, keeping your business
            resilient and future ready.
          </p>
        </ScrollReveal>
      </section>

      <JourneySection />

      {/* Team Banner — parallax */}
      <Parallax speed={0.2}>
        <Image
          src="/images/team-banner.jpeg"
          alt="The IThealth team"
          width={1920}
          height={400}
          className="w-full h-auto"
        />
      </Parallax>

      {/* Platform Showcase */}
      <section className="py-36 bg-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <ScrollReveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--phase-operate)] mb-4">
              See It In Action
            </p>
            <h2 className="text-3xl md:text-4xl font-extralight text-[var(--brand-dark)] mb-6 max-w-3xl">
              A platform built for your IT modernisation
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mb-16">
              From your health score to team insights, every feature is designed to move your business forward.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <AnimatedImage
                src="/images/health-score.png"
                alt="Company health score with IT maturity breakdown"
                width={800}
                height={500}
                rotate={-2}
                delay={0}
              />
              <p className="mt-4 text-sm font-medium text-slate-600 text-center">IT Health Score &amp; Phase Breakdown</p>
            </div>
            <div>
              <AnimatedImage
                src="/images/skill-profile.png"
                alt="Personal skill profile with radar chart"
                width={800}
                height={500}
                rotate={2}
                delay={0.1}
              />
              <p className="mt-4 text-sm font-medium text-slate-600 text-center">Your Skill Profile vs Team Average</p>
            </div>
            <div>
              <AnimatedImage
                src="/images/phase-breakdown.png"
                alt="Phase breakdown radar and progress bars"
                width={800}
                height={500}
                rotate={1.5}
                delay={0.15}
              />
              <p className="mt-4 text-sm font-medium text-slate-600 text-center">Phase Breakdown &amp; Service Scores</p>
            </div>
            <div>
              <AnimatedImage
                src="/images/recommended-services.png"
                alt="Recommended services by phase"
                width={800}
                height={500}
                rotate={-1.5}
                delay={0.2}
              />
              <p className="mt-4 text-sm font-medium text-slate-600 text-center">Personalised Service Recommendations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Highlights */}
      <section className="py-36 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <ScrollReveal>
            <h2 className="text-3xl font-extralight text-[var(--brand-dark)] mb-4">Latest Insights</h2>
            <p className="text-muted-foreground mb-12">Expert advice on IT modernisation</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {(posts as BlogPost[] ?? []).map((post, index) => (
              <ScrollReveal key={post.id} delay={index * 0.15}>
                <BlogCard post={post} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-36 bg-[var(--brand-dark)]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <ScrollReveal>
            <h2 className="text-3xl font-extralight text-white mb-4">What Our Clients Say</h2>
            <p className="text-white/60 mb-12">Trusted by businesses across industries</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {(testimonials as Testimonial[] ?? []).map((t, index) => (
              <ScrollReveal key={t.id} delay={index * 0.15}>
                <TestimonialCard testimonial={t} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  )
}
