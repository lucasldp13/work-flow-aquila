-- Eleva o limite de tamanho de arquivo do bucket "documentos" de 25MB para
-- 50MB — o teto máximo permitido no plano atual do Supabase (Free) para
-- upload de arquivos. Propostas comerciais e outros anexos frequentemente
-- excediam os 25MB anteriores.
update storage.buckets set file_size_limit = 52428800 where id = 'documentos';
