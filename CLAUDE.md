# Working on Toran

@AGENTS.md

- Read `docs/architecture.md` and the records in `docs/decisions/` before
  changing how data, login or event checking works. Propose a new decision
  record for anything hard to reverse.
- Run `pnpm check` before committing; run `pnpm test:e2e` when pages change.
- Use the colour and font names from `app/globals.css` (`bg-surface`,
  `text-peacock`, `font-display`), not raw hex values.
- Body text stays at 18px or larger; pages must work on a small phone.
- Write user-facing text in plain British English.
- Never commit secrets or personal data. Settings names go in `.env.example`.
