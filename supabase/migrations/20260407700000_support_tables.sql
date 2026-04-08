-- Parse SLA duration text to PostgreSQL interval
CREATE OR REPLACE FUNCTION public.parse_sla_duration(duration_text text)
RETURNS interval AS $$
DECLARE
  num numeric;
  cleaned text;
BEGIN
  IF duration_text IS NULL OR trim(duration_text) = '' THEN
    RETURN interval '24 hours';
  END IF;
  cleaned := lower(trim(duration_text));
  num := (regexp_match(cleaned, '^(\d+\.?\d*)'))[1]::numeric;
  IF num IS NULL THEN
    RETURN interval '24 hours';
  END IF;
  IF cleaned ~ '(h|hour)' THEN
    RETURN make_interval(hours => num::int);
  ELSIF cleaned ~ '(d|day)' THEN
    RETURN make_interval(days => num::int);
  ELSIF cleaned ~ '(m|min)' THEN
    RETURN make_interval(mins => num::int);
  ELSE
    RETURN interval '24 hours';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE SEQUENCE public.ticket_number_seq START 1;

CREATE OR REPLACE FUNCTION public.next_ticket_number()
RETURNS text AS $$
BEGIN
  RETURN 'TKT-' || lpad(nextval('public.ticket_number_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL DEFAULT public.next_ticket_number(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  assigned_to uuid REFERENCES public.profiles(id),
  category text NOT NULL CHECK (category IN ('general', 'billing', 'service')),
  service_id uuid REFERENCES public.services(id),
  priority text NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed')),
  subject text NOT NULL,
  description text NOT NULL,
  sla_template_id uuid REFERENCES public.sla_templates(id),
  response_due_at timestamptz,
  resolution_due_at timestamptz,
  first_responded_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Admins full access to support_tickets"
  ON public.support_tickets FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Customers read own tickets"
  ON public.support_tickets FOR SELECT
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Customers create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Customers update own tickets"
  ON public.support_tickets FOR UPDATE
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE TABLE public.ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  email_sent boolean NOT NULL DEFAULT false,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to ticket_replies"
  ON public.ticket_replies FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Customers read own ticket replies"
  ON public.ticket_replies FOR SELECT
  USING (
    is_internal = false
    AND ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Customers create replies on own tickets"
  ON public.ticket_replies FOR INSERT
  WITH CHECK (
    is_internal = false
    AND ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE TABLE public.ticket_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('general', 'billing', 'service')),
  service_id uuid REFERENCES public.services(id),
  assigned_to uuid NOT NULL REFERENCES public.profiles(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to ticket_routing_rules"
  ON public.ticket_routing_rules FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE TABLE public.ticket_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id),
  reply_id uuid REFERENCES public.ticket_replies(id),
  recipient_email text NOT NULL,
  email_type text NOT NULL CHECK (email_type IN ('new_ticket', 'reply', 'status_change', 'sla_warning', 'sla_breach')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to ticket_email_log"
  ON public.ticket_email_log FOR ALL
  USING (public.get_my_role() = 'admin');
