-- Create storage bucket for ad creative images
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-creatives', 'ad-creatives', false)
ON CONFLICT (id) DO NOTHING;
