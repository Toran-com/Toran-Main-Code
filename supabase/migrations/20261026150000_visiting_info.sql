-- Visiting a mandir: ticks for step-free access, a lift, chairs, a
-- hearing loop, parking, shoe racks, food served and so on, and a short
-- note for anything else visitors should know (what to wear, photos).
-- Shown on the mandir's page. Committees and Toran edit them with the
-- other practical details; the existing policies already allow that.
-- The app keeps the list of ticks (lib/visiting.ts); the database only
-- accepts those.
alter table public.mandirs
  add column facilities text[] not null default '{}'
    check (facilities <@ array[
      'step_free', 'lift', 'chairs', 'accessible_toilet', 'hearing_loop',
      'parking', 'blue_badge', 'shoe_racks', 'baby_change',
      'food_served', 'jain_food', 'no_onion_garlic'
    ]::text[]),
  add column visiting_note text
    check (char_length(visiting_note) <= 400);
