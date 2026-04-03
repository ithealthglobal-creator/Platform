import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from '@carbon/icons-react'
import { Button } from '@/components/ui/button'

const phases = [
  {
    name: 'Operate',
    icon: '/phases/operate.svg',
    color: 'var(--phase-operate)',
    description: 'Establish a stable IT foundation with proactive monitoring and management.',
  },
  {
    name: 'Secure',
    icon: '/phases/secure.svg',
    color: 'var(--phase-secure)',
    description: 'Protect your business with enterprise-grade security tailored for SMBs.',
  },
  {
    name: 'Streamline',
    icon: '/phases/streamline.svg',
    color: 'var(--phase-streamline)',
    description: 'Optimise workflows and eliminate inefficiencies across your IT stack.',
  },
  {
    name: 'Accelerate',
    icon: '/phases/accelerate.svg',
    color: 'var(--phase-accelerate)',
    description: 'Drive innovation and growth with advanced technology solutions.',
  },
]

const values = [
  {
    heading: 'Enterprise Solutions',
    description: 'Access enterprise-grade IT without the enterprise price tag.',
  },
  {
    heading: 'Guided Journey',
    description: 'Step-by-step modernisation with expert support at every stage.',
  },
  {
    heading: 'Strategic Partnership',
    description: 'A dedicated IT partner invested in your long-term success.',
  },
]

export function JourneySection() {
  return (
    <section className="py-16 px-6 md:px-12 lg:px-16 bg-white text-center">
      {/* Phase lockups row */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
        {phases.map((phase, index) => (
          <div key={phase.name} className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-2">
              <Image src={phase.icon} alt={phase.name} width={48} height={48} className="h-12 w-12" />
              <span className="font-semibold text-lg" style={{ color: phase.color }}>
                {phase.name}
              </span>
            </div>
            {index < phases.length - 1 && (
              <ArrowRight size={24} className="hidden md:block text-gray-400" />
            )}
          </div>
        ))}
      </div>

      {/* Phase descriptions grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12 max-w-6xl mx-auto">
        {phases.map((phase) => (
          <div
            key={phase.name}
            className="text-left rounded-lg p-6"
            style={{ borderTop: `4px solid ${phase.color}` }}
          >
            <h3 className="font-bold mb-2">{phase.name}</h3>
            <p className="text-sm text-muted-foreground">{phase.description}</p>
          </div>
        ))}
      </div>

      {/* Value strip */}
      <div className="mt-12 bg-white shadow-md rounded-lg p-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {values.map((value) => (
            <div key={value.heading} className="text-center">
              <h4 className="font-bold mb-2">{value.heading}</h4>
              <p className="text-sm text-muted-foreground">{value.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-12">
        <Button
          className="bg-[var(--brand-secondary)] text-white hover:bg-[var(--brand-secondary)]/90"
          size="lg"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          Start Your Journey
        </Button>
      </div>
    </section>
  )
}
