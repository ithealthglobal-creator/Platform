-- Seed IThealth website content (company_id = 00000000-0000-0000-0000-000000000001)

-- ============================================================
-- HOME PAGE
-- ============================================================

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'home',
  'hero',
  '{
    "title": "Your IT Modernisation Champions",
    "subtitle": "We help small and medium-sized businesses grow stronger, smarter, and more successful by modernising their IT, from core IT infrastructure to advanced digital platforms.",
    "badge": "Designed for small and medium size businesses",
    "cta_text": "Get started",
    "cta_link": "/get-started",
    "cta_note": "It''s free — no credit card required"
  }',
  1
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'home',
  'mission',
  '{
    "body": "In today''s world, modern IT isn''t optional — we guide you through IT modernisation with simplicity, clarity and security, keeping your business resilient and future ready."
  }',
  2
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'home',
  'journey',
  '{
    "eyebrow": "The IT Modernisation Platform",
    "heading": "Your entire modernisation journey, one platform",
    "subheading": "From assessments and guided learning to service delivery and progress tracking — everything you need to modernise your IT, step by step.",
    "phase_heading": "Your journey to modernised IT",
    "phase_description": "From Operate''s stable foundations to Secure''s robust protections, Streamline''s efficient workflows, and Accelerate''s innovation, each phase builds seamlessly guiding businesses toward complete IT mastery and enduring digital confidence.",
    "show_phases": true
  }',
  3
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'home',
  'team_banner',
  '{
    "image_url": "/images/team-banner.jpeg",
    "alt_text": "The IThealth team"
  }',
  4
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'home',
  'platform_showcase',
  '{
    "eyebrow": "See It In Action",
    "heading": "A platform built for your IT modernisation",
    "description": "From your health score to team insights, every feature is designed to move your business forward.",
    "images": [
      { "src": "/images/health-score.png", "alt": "Company health score with IT maturity breakdown", "caption": "IT Health Score & Phase Breakdown" },
      { "src": "/images/skill-profile.png", "alt": "Personal skill profile with radar chart", "caption": "Your Skill Profile vs Team Average" },
      { "src": "/images/phase-breakdown.png", "alt": "Phase breakdown radar and progress bars", "caption": "Phase Breakdown & Service Scores" },
      { "src": "/images/recommended-services.png", "alt": "Recommended services by phase", "caption": "Personalised Service Recommendations" }
    ]
  }',
  5
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'home',
  'value_props',
  '{
    "tagline": "We help small and medium-sized businesses thrive",
    "affordability": "Affordable monthly subscriptions",
    "industries_label": "Designed for professional knowledge-based workers",
    "industries": ["Legal", "Consulting", "Architecture", "Finance", "Retail", "Hospitality", "NGO", "All businesses"]
  }',
  6
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'home',
  'testimonials',
  '{
    "heading": "What our customers say",
    "items": [
      {
        "quote": "unreservedly recommend and support IThealth",
        "name": "Arnold Subel SC",
        "company": "Advocates Group 621"
      },
      {
        "quote": "extremely happy with the nature and extent of the IT services provided",
        "name": "Noel Graves SC",
        "company": "Advocates Group One"
      },
      {
        "quote": "The level of service we have received is of a very high standard",
        "name": "Robert Stockwell SC",
        "company": "Advocates Group 21"
      }
    ]
  }',
  7
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'home',
  'blog_preview',
  '{
    "heading": "Latest Insights",
    "subheading": "Expert advice on IT modernisation",
    "count": 3
  }',
  8
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'home',
  'cta',
  '{
    "heading": "Ready to Modernise Your IT?",
    "subheading": "Start your free modernisation journey today",
    "button_text": "Start Now",
    "button_link": "/login"
  }',
  9
)
ON CONFLICT (company_id, page, section) DO NOTHING;

-- ============================================================
-- ABOUT PAGE
-- ============================================================

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'about',
  'hero',
  '{
    "title": "About IThealth",
    "subtitle": "Your IT Modernisation Champions"
  }',
  1
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'about',
  'mission',
  '{
    "eyebrow": "Our Mission",
    "heading": "Modernising IT for the businesses that matter most",
    "paragraphs": [
      "IThealth was founded with a simple belief: every small and medium business deserves enterprise-quality IT. We guide businesses through their IT modernisation journey, making complex technology simple, accessible, and secure.",
      "Our approach is built on the conviction that IT modernisation shouldn''t be overwhelming. Through our proven four-phase journey — Operate, Secure, Streamline, and Accelerate — we transform IT from a cost centre into a competitive advantage."
    ],
    "image_url": null
  }',
  2
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'about',
  'values',
  '{
    "heading": "Our Values",
    "items": [
      {
        "icon": "Trophy",
        "title": "Champion Mindset",
        "description": "We don''t just service IT — we champion your business growth through technology. Every decision is made with your success in mind."
      },
      {
        "icon": "Security",
        "title": "Security First",
        "description": "In an era of growing cyber threats, security isn''t an add-on — it''s the foundation. We build security into every layer of your IT infrastructure."
      },
      {
        "icon": "Rocket",
        "title": "Continuous Progress",
        "description": "IT modernisation is a journey, not a destination. We partner with you for the long term, continuously improving and adapting as technology evolves."
      }
    ]
  }',
  3
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'about',
  'cta',
  '{
    "heading": "Ready to Start Your Journey?",
    "subheading": "See where your IT stands today",
    "button_text": "Start Now",
    "button_link": "/login"
  }',
  4
)
ON CONFLICT (company_id, page, section) DO NOTHING;

-- ============================================================
-- FEATURES PAGE
-- ============================================================

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'features',
  'hero',
  '{
    "eyebrow": "Features",
    "title": "Everything you need to modernise your IT",
    "subtitle": "From assessment to implementation, IThealth gives your business the tools, knowledge, and guided journey to build a modern, resilient IT foundation."
  }',
  1
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'features',
  'features',
  '{
    "items": [
      {
        "title": "IT Health Assessment",
        "description": "Understand exactly where your business stands with a comprehensive IT maturity assessment across four key phases: Operate, Secure, Streamline, and Accelerate.",
        "image": "/images/partner-dashboard.png",
        "bullets": [
          "Score your IT maturity across all phases",
          "Identify weaknesses and strengths instantly",
          "Get personalised recommendations"
        ]
      },
      {
        "title": "Modernisation Journey",
        "description": "A visual, step-by-step implementation plan that turns your assessment results into a clear roadmap — so you know exactly what to do, in what order, and how long it takes.",
        "image": "/images/modernisation-journey.png",
        "bullets": [
          "Gantt-style timeline across all phases",
          "Service-level tasks with time estimates",
          "Track progress in hours, days, or weeks"
        ]
      },
      {
        "title": "Team Dashboard",
        "description": "Monitor your entire team''s IT maturity with phase breakdowns, service scores, and member-level tracking — all in one place.",
        "image": "/images/your-team.png",
        "bullets": [
          "Phase breakdown with radar visualisation",
          "Service-level scores across all members",
          "Invite members and track team progress"
        ]
      },
      {
        "title": "Skill Profile & Insights",
        "description": "See your personal skill profile compared to team averages, with targeted course recommendations to close your weakest gaps.",
        "image": "/images/skill-profile.png",
        "bullets": [
          "Personal vs team average comparison",
          "Radar chart across all four phases",
          "Recommended courses for your weakest areas"
        ]
      },
      {
        "title": "Recommended Services",
        "description": "Based on your assessment results, get tailored service recommendations grouped by phase — with maturity level indicators and descriptions for each.",
        "image": "/images/recommended-services.png",
        "bullets": [
          "Services grouped by Operate, Secure, Streamline, Accelerate",
          "Maturity badges showing current level",
          "Score-based prioritisation of weakest areas"
        ]
      }
    ]
  }',
  2
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'features',
  'stats',
  '{
    "items": [
      { "value": "4", "suffix": "", "label": "Modernisation Phases" },
      { "value": "8", "suffix": "+", "label": "IT Services" },
      { "value": "100", "suffix": "%", "label": "Guided Journey" },
      { "value": "Free", "suffix": "", "label": "Assessment" }
    ]
  }',
  3
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'features',
  'cta',
  '{
    "heading": "Ready to Modernise Your IT?",
    "subheading": "Start your free modernisation journey today",
    "button_text": "Start Now",
    "button_link": "/login"
  }',
  4
)
ON CONFLICT (company_id, page, section) DO NOTHING;

-- ============================================================
-- CONTACT PAGE
-- ============================================================

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'contact',
  'hero',
  '{
    "title": "Contact Us",
    "subtitle": "Get in touch with our team"
  }',
  1
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'contact',
  'info',
  '{
    "email": "hello@ithealth.ai",
    "phone": "+27 (0) 11 123 4567",
    "location": "Johannesburg, South Africa"
  }',
  2
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'contact',
  'form',
  '{
    "heading": "Send us a message",
    "fields": ["name", "email", "phone", "company", "message"],
    "submit_label": "Send Message",
    "success_message": "Message sent! We''ll be in touch soon.",
    "api_endpoint": "/api/contact"
  }',
  3
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'contact',
  'cta',
  '{
    "text": "Ready to start your IT modernisation journey?",
    "button_text": "Start Now",
    "button_link": "/login"
  }',
  4
)
ON CONFLICT (company_id, page, section) DO NOTHING;

-- ============================================================
-- PARTNERS PAGE
-- ============================================================

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'partners',
  'hero',
  '{
    "title": "Our Partners",
    "subtitle": "Trusted technology partnerships"
  }',
  1
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'partners',
  'benefits',
  '{
    "heading": "Become a Partner",
    "items": [
      {
        "icon": "Growth",
        "title": "Grow Revenue",
        "description": "Access new markets and customers through our platform and client network."
      },
      {
        "icon": "Partnership",
        "title": "Co-Sell Opportunities",
        "description": "Collaborate on deals and deliver joint solutions to shared customers."
      },
      {
        "icon": "Education",
        "title": "Enable & Train",
        "description": "Get certified on our platform and access partner enablement resources."
      }
    ]
  }',
  2
)
ON CONFLICT (company_id, page, section) DO NOTHING;

INSERT INTO public.website_content (company_id, page, section, content, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'partners',
  'application_form',
  '{
    "fields": ["company_name", "contact_name", "email", "website", "message"],
    "submit_label": "Submit Application",
    "success_message": "Application submitted! We''ll review it and get back to you.",
    "api_endpoint": "/api/partners"
  }',
  3
)
ON CONFLICT (company_id, page, section) DO NOTHING;
