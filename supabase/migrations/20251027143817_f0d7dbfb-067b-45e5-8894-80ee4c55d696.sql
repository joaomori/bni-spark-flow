-- Add new fields to leads table
ALTER TABLE public.leads
ADD COLUMN company TEXT,
ADD COLUMN position TEXT,
ADD COLUMN invited_by TEXT;