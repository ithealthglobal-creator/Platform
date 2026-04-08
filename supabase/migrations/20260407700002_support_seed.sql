-- Default SLA template for General and Billing tickets
INSERT INTO public.sla_templates (name, description, response_critical, response_high, response_medium, response_low, resolution_critical, resolution_high, resolution_medium, resolution_low, support_hours, is_active)
SELECT
  'Default Support',
  'Default SLA for general and billing support tickets',
  '4 hours', '8 hours', '24 hours', '48 hours',
  '24 hours', '48 hours', '72 hours', '120 hours',
  'Business hours',
  true
WHERE NOT EXISTS (SELECT 1 FROM public.sla_templates WHERE name = 'Default Support');
