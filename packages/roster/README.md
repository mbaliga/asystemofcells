# @asoc/roster

The single source of truth for the product roster shown on asystemofcells.com
and .dev. `roster.public.json` is hand-authored from the constellation's own
repos (`ETHOS_MONETIZATION_TECH_REPORT.md` / the constellation ethos doc), not
from the original placeholder brief. A few real corrections against that
original brief, worth recording here rather than losing silently:

- **Crocodyl** is an archery form and fatigue coach (camera and pose
  estimation), not a habit tracker.
- **Ebbflow** is the open half of an EEG personal-state app (open client,
  licensed inference engine underneath), not a tide and breath watchface. It
  moved from Ambient cells to Maker cells.
- **Hyle Deco** is a Google Fonts submission (a hairline display typeface),
  not a generic decorative texture layer.
- **Asom** (asystemofmodels) was not in the original roster at all. It is a
  real, built, Apache-2.0 sovereign model-routing daemon and is very likely
  the "routing engine" the monetization docs describe as not-started
  elsewhere. Added under Connective tissue.

Two products from the original brief are **omitted entirely** rather than
guessed:

- **Stem** ("the account-less core") has no matching repo anywhere in the
  31-repo constellation. "Cells interlinked within one stem" reads as the
  house's naming motif, not evidence of a separate shipped product.
- **Orrery** exists only as a repo with a single "Initial commit" and a
  `LICENSE` file. The constellation notes suggest it might actually be a
  renamed testing/security tool ("ex-Assay"), not a live orrery watchface as
  the original brief described. Publishing it as a watchface would very
  likely be wrong.

`verify` arrays on individual cells flag fields (mostly accent colors) that
have no confirmed source and are carried over as placeholders pending the
owner.

## Usage

```js
import { getRoster, groupedByTissue, getCell, ctaLabel } from '@asoc/roster'
```
