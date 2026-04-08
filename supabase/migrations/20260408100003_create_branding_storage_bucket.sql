INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read branding bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branding');

CREATE POLICY "Admins upload to own branding folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "Admins manage own branding files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "Admins delete own branding files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() = 'admin'
  );
