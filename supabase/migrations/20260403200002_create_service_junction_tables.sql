CREATE TABLE public.service_verticals (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  vertical_id uuid NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, vertical_id)
);

CREATE TABLE public.service_personas (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, persona_id)
);

CREATE TABLE public.service_pains (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  pain_id uuid NOT NULL REFERENCES public.pains(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, pain_id)
);

CREATE TABLE public.service_gains (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  gain_id uuid NOT NULL REFERENCES public.gains(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, gain_id)
);

CREATE TABLE public.service_products (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  notes text,
  PRIMARY KEY (service_id, product_id)
);

CREATE TABLE public.service_skills (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  notes text,
  PRIMARY KEY (service_id, skill_id)
);

ALTER TABLE public.service_verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_pains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_gains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_skills ENABLE ROW LEVEL SECURITY;
