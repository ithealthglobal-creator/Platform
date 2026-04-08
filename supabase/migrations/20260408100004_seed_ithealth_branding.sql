INSERT INTO public.company_branding (
  company_id,
  logo_url,
  logo_light_url,
  icon_url,
  primary_colour,
  secondary_colour,
  accent_colour,
  font_heading,
  font_body
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '/logos/ithealth-logo.svg',
  '/logos/ithealth-logo-white.svg',
  '/logos/ithealth-icon-white.svg',
  '#1175E4',
  '#FF246B',
  '#C8A951',
  'Poppins',
  'Poppins'
)
ON CONFLICT (company_id) DO NOTHING;
