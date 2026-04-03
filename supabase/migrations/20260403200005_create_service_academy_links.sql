CREATE TABLE public.service_academy_links (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT false,
  PRIMARY KEY (service_id, course_id)
);

ALTER TABLE public.service_academy_links ENABLE ROW LEVEL SECURITY;
