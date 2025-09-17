-- Políticas de Storage para usuário teste@contabilpro.com
-- UUID: 1ff74f50-bc2d-49ae-8fb4-3b819df08078

-- Política para SELECT (visualizar arquivos)
CREATE POLICY "Usuario teste pode visualizar documentos" ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'documentos' AND 
  auth.uid() = '1ff74f50-bc2d-49ae-8fb4-3b819df08078'::uuid
);

-- Política para INSERT (fazer upload)
CREATE POLICY "Usuario teste pode fazer upload de documentos" ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'documentos' AND 
  auth.uid() = '1ff74f50-bc2d-49ae-8fb4-3b819df08078'::uuid
);

-- Política para UPDATE (atualizar arquivos)
CREATE POLICY "Usuario teste pode atualizar documentos" ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'documentos' AND 
  auth.uid() = '1ff74f50-bc2d-49ae-8fb4-3b819df08078'::uuid
)
WITH CHECK (
  bucket_id = 'documentos' AND 
  auth.uid() = '1ff74f50-bc2d-49ae-8fb4-3b819df08078'::uuid
);

-- Política para DELETE (excluir arquivos)
CREATE POLICY "Usuario teste pode excluir documentos" ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'documentos' AND 
  auth.uid() = '1ff74f50-bc2d-49ae-8fb4-3b819df08078'::uuid
);

-- Política adicional para permitir acesso total temporário (para debug)
CREATE POLICY "Usuario teste acesso total storage" ON storage.objects
FOR ALL
TO public
USING (auth.uid() = '1ff74f50-bc2d-49ae-8fb4-3b819df08078'::uuid)
WITH CHECK (auth.uid() = '1ff74f50-bc2d-49ae-8fb4-3b819df08078'::uuid);
