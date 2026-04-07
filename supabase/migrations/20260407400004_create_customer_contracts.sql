CREATE TABLE public.customer_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  service_id uuid NOT NULL REFERENCES public.services(id),
  order_item_id uuid REFERENCES public.order_items(id),
  status text NOT NULL CHECK (status IN ('pending', 'active', 'paused', 'completed', 'cancelled')),
  contracted_price numeric NOT NULL,
  billing_period text NOT NULL CHECK (billing_period IN ('once', 'monthly', 'quarterly', 'annually')),
  started_at timestamptz,
  renewal_date timestamptz,
  expires_at timestamptz,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'overdue', 'na')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_contracts ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_active_contract ON public.customer_contracts (company_id, service_id) WHERE status IN ('active', 'pending');
CREATE INDEX idx_customer_contracts_company_id ON public.customer_contracts(company_id);
CREATE INDEX idx_customer_contracts_service_id ON public.customer_contracts(service_id);

CREATE TRIGGER customer_contracts_updated_at
  BEFORE UPDATE ON public.customer_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
