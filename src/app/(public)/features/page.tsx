import { AnimatedImage } from '@/components/animated-image'
import { ScrollReveal, AnimatedCounter } from '@/components/scroll-reveal'
import { CTABanner } from '@/components/cta-banner'

const features = [
  {
    title: 'IT Health Assessment',
    description:
      'Understand exactly where your business stands with a comprehensive IT maturity assessment across four key phases: Operate, Secure, Streamline, and Accelerate.',
    image: '/images/partner-dashboard.png',
    rotate: -2,
    bullets: [
      'Score your IT maturity across all phases',
      'Identify weaknesses and strengths instantly',
      'Get personalised recommendations',
    ],
  },
  {
    title: 'Modernisation Journey',
    description:
      'A visual, step-by-step implementation plan that turns your assessment results into a clear roadmap — so you know exactly what to do, in what order, and how long it takes.',
    image: '/images/modernisation-journey.png',
    rotate: 2,
    bullets: [
      'Gantt-style timeline across all phases',
      'Service-level tasks with time estimates',
      'Track progress in hours, days, or weeks',
    ],
  },
  {
    title: 'Team Dashboard',
    description:
      'Monitor your entire team\'s IT maturity with phase breakdowns, service scores, and member-level tracking — all in one place.',
    image: '/images/your-team.png',
    rotate: -1.5,
    bullets: [
      'Phase breakdown with radar visualisation',
      'Service-level scores across all members',
      'Invite members and track team progress',
    ],
  },
  {
    title: 'Skill Profile & Insights',
    description:
      'See your personal skill profile compared to team averages, with targeted course recommendations to close your weakest gaps.',
    image: '/images/skill-profile.png',
    rotate: 1.5,
    bullets: [
      'Personal vs team average comparison',
      'Radar chart across all four phases',
      'Recommended courses for your weakest areas',
    ],
  },
  {
    title: 'Recommended Services',
    description:
      'Based on your assessment results, get tailored service recommendations grouped by phase — with maturity level indicators and descriptions for each.',
    image: '/images/recommended-services.png',
    rotate: -1,
    bullets: [
      'Services grouped by Operate, Secure, Streamline, Accelerate',
      'Maturity badges showing current level',
      'Score-based prioritisation of weakest areas',
    ],
  },
]

const stats = [
  { value: '4', label: 'Modernisation Phases' },
  { value: '8', suffix: '+', label: 'IT Services' },
  { value: '100', suffix: '%', label: 'Guided Journey' },
  { value: 'Free', label: 'Assessment' },
]

export default function FeaturesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[var(--brand-primary)] py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-16">
          <ScrollReveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-white/60">
              Features
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-light leading-tight text-white md:text-5xl">
              Everything you need to modernise your IT
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-light text-white/80">
              From assessment to implementation, IThealth gives your business
              the tools, knowledge, and guided journey to build a modern,
              resilient IT foundation.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Feature sections */}
      {features.map((feature, index) => (
        <section
          key={feature.title}
          className={`py-24 overflow-hidden ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
        >
          <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-16">
            <div
              className={`flex flex-col items-center gap-16 md:flex-row ${
                index % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
            >
              {/* Text */}
              <ScrollReveal className="flex-1" direction={index % 2 === 0 ? 'left' : 'right'}>
                <h2 className="text-3xl font-light text-[var(--brand-dark)]">
                  {feature.title}
                </h2>
                <p className="mt-4 text-lg font-light text-slate-600">
                  {feature.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {feature.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm text-slate-700">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--brand-primary)]" />
                      {b}
                    </li>
                  ))}
                </ul>
              </ScrollReveal>

              {/* Image with rotation */}
              <div className="flex-1">
                <AnimatedImage
                  src={feature.image}
                  alt={feature.title}
                  width={700}
                  height={450}
                  rotate={feature.rotate}
                  delay={0.15}
                />
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Stats with animated counters */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-16">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 0.1} scale>
                <div className="text-center">
                  <AnimatedCounter
                    value={stat.value}
                    suffix={stat.suffix ?? ''}
                    className="text-4xl font-light text-[var(--brand-primary)]"
                  />
                  <p className="mt-2 text-sm text-slate-500">{stat.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  )
}
