ALTER TABLE public.courses
  ADD CONSTRAINT courses_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;

CREATE INDEX idx_courses_service_id ON public.courses(service_id);
