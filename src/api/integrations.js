// ============================================================
//  integrations.js  —  REMPLACÉ PAR SUPABASE
//  Ce fichier remplace l'ancien integrations.js Base44.
//  Les imports dans le reste du code restent identiques.
// ============================================================

import { supabase } from './base44Client';

// ── InvokeLLM ────────────────────────────────────────────────
// Appel à une IA via Supabase Edge Function
// Pour l'activer : créer une Edge Function "invoke-llm" dans Supabase
export const InvokeLLM = async ({ prompt, response_json_schema, add_context_from_internet } = {}) => {
  const { data, error } = await supabase.functions.invoke('invoke-llm', {
    body: { prompt, response_json_schema, add_context_from_internet },
  });
  if (error) throw error;
  return data;
};

// ── SendEmail ────────────────────────────────────────────────
// Envoi d'email via Supabase Edge Function
// Pour l'activer : créer une Edge Function "send-email" dans Supabase
export const SendEmail = async ({ to, subject, body, attachments } = {}) => {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { to, subject, body, attachments },
  });
  if (error) throw error;
  return data;
};

// ── SendSMS ──────────────────────────────────────────────────
export const SendSMS = async ({ to, message } = {}) => {
  const { data, error } = await supabase.functions.invoke('send-sms', {
    body: { to, message },
  });
  if (error) throw error;
  return data;
};

// ── UploadFile ───────────────────────────────────────────────
// Upload de fichier vers Supabase Storage
export const UploadFile = async ({ file, bucket = 'uploads', path } = {}) => {
  const filePath = path || `${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { upsert: true });
  if (error) throw error;

  // Retourner l'URL publique du fichier
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return { url: urlData.publicUrl, path: filePath, ...data };
};

// ── GenerateImage ────────────────────────────────────────────
export const GenerateImage = async ({ prompt, size } = {}) => {
  const { data, error } = await supabase.functions.invoke('generate-image', {
    body: { prompt, size },
  });
  if (error) throw error;
  return data;
};

// ── ExtractDataFromUploadedFile ──────────────────────────────
export const ExtractDataFromUploadedFile = async ({ file_url, extraction_prompt } = {}) => {
  const { data, error } = await supabase.functions.invoke('extract-data', {
    body: { file_url, extraction_prompt },
  });
  if (error) throw error;
  return data;
};

// ── Export compatible Base44 ─────────────────────────────────
export const Core = {
  InvokeLLM,
  SendEmail,
  SendSMS,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile,
};