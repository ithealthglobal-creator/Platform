-- Rename "Certifications" to "Certificates" in menu_items if needed
UPDATE public.menu_items
SET label = 'Certificates', route = '/academy/certificates'
WHERE label = 'Certifications' AND route = '/academy/certifications';
