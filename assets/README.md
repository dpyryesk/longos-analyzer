# Assets

| File | Use |
|---|---|
| `logo-mark.svg` | Square mark — favicon, app icon, social avatar (64×64 base). |
| `logo-lockup.svg` | Mark + wordmark on light backgrounds. |
| `logo-lockup-inverse.svg` | Mark + wordmark on dark backgrounds (ink surface). |

The mark is a small thermal-receipt silhouette with a sage-green trend line drawn through it. The endpoint dot is in clay (`--clay-500`) — that's the one place we let the secondary color carry symbolic weight.

## Iconography
We do not ship a custom icon set. Use **Lucide** via CDN:

```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<i data-lucide="receipt"></i>
<script>lucide.createIcons({ attrs: { 'stroke-width': 1.75 } });</script>
```

Or in React:
```jsx
import { Receipt, TrendingUp } from 'lucide-react';
<Receipt strokeWidth={1.75} size={20} />
```

See `README.md` → Iconography for the full mapping.
