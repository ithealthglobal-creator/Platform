CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_number text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  score integer NOT NULL,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_certificates_course_user ON public.certificates(course_id, user_id);
CREATE INDEX idx_certificates_user ON public.certificates(user_id);
