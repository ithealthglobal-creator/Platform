INSERT INTO storage.buckets (id, name, public)
VALUES ('website-content', 'website-content', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read website-content bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'website-content');

CREATE POLICY "Admins upload to own website-content folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'website-content'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "Admins manage own website-content files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'website-content'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "Admins delete own website-content files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'website-content'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() = 'admin'
  );
