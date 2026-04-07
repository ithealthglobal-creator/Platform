CREATE SEQUENCE public.order_number_seq START 1;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  order_number text UNIQUE NOT NULL DEFAULT 'ORD-' || lpad(nextval('public.order_number_seq')::text, 5, '0'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  subtotal numeric NOT NULL,
  vat_amount numeric NOT NULL,
  total numeric NOT NULL,
  billing_email text,
  po_number text,
  notes text,
  payfast_payment_id text,
  payfast_status text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_orders_company_id ON public.orders(company_id);
CREATE INDEX idx_orders_status ON public.orders(status);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id),
  price numeric NOT NULL,
  billing_period text NOT NULL CHECK (billing_period IN ('once', 'monthly', 'quarterly', 'annually')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
