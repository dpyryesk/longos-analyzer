# Fonts

## Plus Jakarta Sans (display) — self-hosted ★

Shipped as a variable font in this folder:

- `PlusJakartaSans-VariableFont_wght.ttf` — upright, weights 200–800
- `PlusJakartaSans-Italic-VariableFont_wght.ttf` — italic, weights 200–800

Wired up via `@font-face` in the top of `colors_and_type.css`. Used for page titles, stat numbers, and headings. Has very readable lining numerals — chosen as the display face for this number-heavy product.

## Geist + Geist Mono (sans / mono) — Google Fonts
Still loaded from Google Fonts at runtime. To self-host, download the `.woff2` files and add matching `@font-face` blocks.

## Geist (sans / body)
- Weights used: 400, 500, 600, 700
- Use for: body copy, buttons, labels, navigation

## Geist Mono (mono)
- Weights used: 400, 500, 600
- Use for: receipt line items, IDs, code, numeric tables

## Substitution flag
Both are pulled from Google Fonts because no specific font files were provided in the brief. If you want a different pairing — e.g. a self-hosted "Söhne" + "GT America" — drop the `.woff2` files here and I'll wire up `@font-face` and update `--font-display` / `--font-sans` to match.
