-- Patrikas and posters a mandir's website links to or shows (PDFs and
-- pictures), found by the website check (lib/website-check.ts) for Toran's
-- admins to type up. Just their addresses and a short label, at most five.
alter table public.sources
  add column last_documents jsonb check (
    last_documents is null or (
      jsonb_typeof(last_documents) = 'array'
      and jsonb_array_length(last_documents) <= 5
      and length(last_documents::text) <= 4000
    )
  );

comment on column public.sources.last_documents is
  'Patrikas and posters found at the last website check: [{url, kind, label}], at most five.';
