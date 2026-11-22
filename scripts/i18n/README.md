# Web i18n helper scripts (English / Arabic)

The app translates with `tr('English text')` from `src/i18n` — the English text is the key,
and Arabic lives in `src/i18n/ar.interior.json` (English → Arabic). Untranslated text shows in English.

Run from the repo root:

1. `node scripts/i18n/wrap.js <files...>` — wraps visible JSX text, `placeholder/title/label/...`
   attributes and toast/confirm messages in `tr()` (AST based; English output unchanged).
   Add `--dry` to only count.
2. `node scripts/i18n/wrap2.js <files...>` — wraps raw enum renders like `{task.status}`.
3. `node scripts/i18n/wrap3.js [--lib] <files...>` — sentences with values become `tr("... {{name}} ...", { name })`, plus validator/error messages and `{variable}` renders.
4. `node scripts/i18n/collect.js out.json <files...>` — lists every string `tr()` can receive,
   so missing Arabic entries can be found and added to the dictionary.

Interior was done first (InteriorShell mounts `<I18nProvider>`, which sets `<html lang dir>`).
For construction pages: mount the provider in the construction layout, run steps 1–3 on its
files, and add the new strings to a dictionary.
