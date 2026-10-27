-- Explicit source label for deterministic, non-live sample listings.
ALTER TYPE public.scrape_source ADD VALUE IF NOT EXISTS 'demo';
