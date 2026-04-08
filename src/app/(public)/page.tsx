import Image from 'next/image'
import { AnimatedHero } from '@/components/animated-hero'
import { JourneySection } from '@/components/journey-section'
import { AnimatedImage } from '@/components/animated-image'
import { BlogCard } from '@/components/blog-card'
import { CTABanner } from '@/components/cta-banner'
import { ScrollReveal, Parallax } from '@/components/scroll-reveal'
import { createClient } from '@supabase/supabase-js'
import { BlogPost } from '@/lib/types'
import { resolveCompanyId } from '@/lib/company-resolver'
import { getPageContent } from '@/lib/website-content'
import { DEFAULT_CONTENT } from '@/lib/default-content'

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

  const companyId = await resolveCompanyId()
  const sections = await getPageContent(companyId, 'home')

  const get = (section: string): Record<string, any> =>
    (sections[section]?.content ?? (DEFAULT_CONTENT.home as any)?.[section] ?? {}) as Record<string, any>

  const mission = get('mission')
  const teamBanner = get('team_banner')
  const platformShowcase = get('platform_showcase')
  const valueProps = get('value_props')
  const testimonials = get('testimonials')
  const blogPreview = get('blog_preview')
  const cta = get('cta')

  const showcaseImages: Array<{ src: string; alt: string; caption: string }> =
    Array.isArray(platformShowcase.images)
      ? platformShowcase.images
      : (DEFAULT_CONTENT.home as any)?.platform_showcase?.images ?? []

  const testimonialItems: Array<{ quote: string; name: string; company: string }> =
    Array.isArray(testimonials.items)
      ? testimonials.items
      : (DEFAULT_CONTENT.home as any)?.testimonials?.items ?? []

  const industries: string[] =
    Array.isArray(valueProps.industries)
      ? valueProps.industries
      : (DEFAULT_CONTENT.home as any)?.value_props?.industries ?? []

  const rotations = [-2, 2, 1.5, -1.5]
  const delays = [0, 0.1, 0.15, 0.2]

  return (
    <>
      <AnimatedHero />

      {/* Mission statement */}
      <section className="py-36 bg-white">
        <ScrollReveal blur>
          <p className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 text-3xl md:text-4xl font-extralight text-[var(--brand-dark)] leading-relaxed text-left">
            {mission.body ?? "In today\u2019s world, modern IT isn\u2019t optional \u2014 we guide you through IT modernisation with simplicity, clarity and security, keeping your business resilient and future ready."}
          </p>
        </ScrollReveal>
      </section>

      <JourneySection />

      {/* Team Banner — parallax */}
      <Parallax speed={0.2}>
        <Image
          src={teamBanner.image_url ?? '/images/team-banner.jpeg'}
          alt={teamBanner.alt_text ?? 'The IThealth team'}
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
              {platformShowcase.eyebrow ?? 'See It In Action'}
            </p>
            <h2 className="text-3xl md:text-4xl font-extralight text-[var(--brand-dark)] mb-6 max-w-3xl">
              {platformShowcase.heading ?? 'A platform built for your IT modernisation'}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mb-16">
              {platformShowcase.description ?? 'From your health score to team insights, every feature is designed to move your business forward.'}
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {showcaseImages.map((img, i) => (
              <div key={i}>
                <AnimatedImage
                  src={img.src}
                  alt={img.alt}
                  width={800}
                  height={500}
                  rotate={rotations[i % rotations.length]}
                  delay={delays[i % delays.length]}
                />
                <p className="mt-4 text-sm font-medium text-slate-600 text-center">{img.caption}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Props Bento */}
      <section className="bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-36">
          {/* Top row */}
          <div className="grid grid-cols-12 gap-0">
            {/* Blue block with text */}
            <ScrollReveal direction="left" className="col-span-5 relative overflow-hidden bg-[var(--brand-primary)] min-h-[280px] flex items-end">
              <p className="relative z-10 text-2xl font-extralight text-white leading-snug max-w-xs p-10">
                {valueProps.tagline ?? 'We help small and medium-sized businesses thrive'}
              </p>
            </ScrollReveal>

            {/* Pink design block */}
            <div className="col-span-3 relative overflow-hidden bg-white min-h-[280px]">
              <img src="/images/pink-design.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
            </div>

            {/* Affordable subscriptions */}
            <ScrollReveal direction="right" className="col-span-4 flex items-center pl-10">
              <p className="text-4xl font-extralight text-[var(--brand-dark)] leading-tight">
                {(valueProps.affordability ?? 'Affordable monthly subscriptions').split(' ').slice(0, 1)}<br />
                {(valueProps.affordability ?? 'Affordable monthly subscriptions').split(' ').slice(1, 2)}<br />
                {(valueProps.affordability ?? 'Affordable monthly subscriptions').split(' ').slice(2).join(' ')}
              </p>
            </ScrollReveal>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-12 gap-0">
            {/* Gold wave design */}
            <div className="col-span-3 relative overflow-hidden bg-white min-h-[280px]">
              <img src="/images/gold-design.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
            </div>

            {/* Testimonials on dark */}
            <ScrollReveal className="col-span-9 bg-[var(--brand-dark)] p-10 flex items-center">
              <div className="grid grid-cols-3 gap-8 w-full">
                {testimonialItems.map((t, i) => (
                  <div key={i} className="text-center">
                    <p className="text-sm font-light text-white/80 italic leading-relaxed mb-4">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <p className="text-xs font-semibold text-[var(--brand-secondary)]">{t.name}, {t.company}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Industries */}
          <div className="mt-24 text-center">
            <ScrollReveal>
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--brand-secondary)] mb-6">
                {valueProps.industries_label ?? 'Designed for professional knowledge-based workers'}
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.1} scale>
              <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
                {industries.filter((_, i) => i < industries.length - 1).map((industry) => (
                  <span key={industry} className="text-xl md:text-2xl font-extralight text-[var(--brand-dark)]">
                    {industry}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xl md:text-2xl font-extralight text-[var(--brand-dark)]">
                {industries[industries.length - 1] ?? 'All businesses'}
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Blog Highlights */}
      <section className="py-36 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <ScrollReveal>
            <h2 className="text-3xl font-extralight text-[var(--brand-dark)] mb-4">
              {blogPreview.heading ?? 'Latest Insights'}
            </h2>
            <p className="text-muted-foreground mb-12">
              {blogPreview.subheading ?? 'Expert advice on IT modernisation'}
            </p>
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

      <CTABanner
        heading={cta.heading ?? 'Ready to Modernise Your IT?'}
        subheading={cta.subheading ?? 'Start your free modernisation journey today'}
        buttonText={cta.button_text ?? 'Start Now'}
        buttonHref={cta.button_link ?? '/login'}
      />
    </>
  )
}
