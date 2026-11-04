---
headline: Hyle Deco is a thin display typeface in Regular and Italic, free to download under the SIL Open Font License.
lede: It is a font, not an app. You download two TTF files and install them like any other typeface.
features:
  - title: Regular and Italic
    body: The family has two static styles. Both are one weight, 400 in the metadata. The files are HyleDeco-Regular.ttf and HyleDeco-Italic.ttf.
    status: shipped
  - title: One constant stroke
    body: Hyle Deco is drawn on a single constant stroke, described by its author as 44 units on a 1000-unit em, with a 700-unit cap height and a 500-unit x-height. These figures have not been checked against the outlines.
    status: partial
  - title: Free download under the OFL
    body: Both TTFs and the licence text are served from this site for direct download. The licence is SIL OFL 1.1 with no Reserved Font Name. The repository's main branch still holds a placeholder OFL.txt, and the full text is in an open draft pull request.
    status: shipped
  - title: Fontbakery report committed
    body: The committed run reports 0 FAIL, 0 ERROR, 27 WARN, 15 INFO, 207 SKIP and 206 PASS across 455 checks. It is a snapshot and has not been re-run since.
    status: shipped
  - title: Tabular figures
    body: The Regular source defines tabular figures through a tnum feature. This has not been checked in the compiled fonts.
    status: partial
  - title: Latin coverage
    body: Metadata lists the latin, latin-ext and menu subsets. The author's submission draft claims full GF Latin Core coverage. That has not been independently checked.
    status: partial
  - title: Rebuildable from source
    body: The Regular outlines are kept as a UFO source in the repository. Whether it rebuilds to the shipped TTF with fontmake is not confirmed, and the Italic has no source file.
    status: partial
  - title: Google Fonts submission
    body: The repository carries upstream.yaml, a description file and a drafted submission. An issue titled Add Hyle Deco is open on google/fonts, filed 2026-07-12. It is not accepted, and the font is not on Google Fonts.
    status: partial
neverHappens:
  - A font file does not run code. There is no app, no manifest and no permission to grant.
  - The repository holds no analytics or telemetry code. Its only code is a workflow that deletes old build artefacts.
  - The specimen page loads both fonts from this site's own origin, not from a third-party font host.
openSource:
  isOpen: false
  licence: No licence file
  repo: mbaliga/HyleDeco-gf
  note: The intended licence is SIL OFL 1.1 with no Reserved Font Name. The full text is in an open draft pull request, not merged; OFL.txt on main is a placeholder.
faq:
  - q: Is Hyle Deco on Google Fonts?
    a: No. A submission issue is open on google/fonts and has not been accepted. Download it from this site.
  - q: Is there a release on GitHub?
    a: No. The repository has no releases yet. The two TTFs are on the Fonts page and in fonts/ttf in the repository.
  - q: May I use it in a commercial project?
    a: The OFL allows use, embedding, modification and redistribution, including commercial use, provided the font is not sold on its own. Read the licence text for the full terms.
  - q: Why is this font under a different licence from the apps?
    a: The Hyle typefaces are the house's exception. Google Fonts accepts only the OFL, so the fonts use it.
ownerNotes:
  - The roster says live and the brief says soon. The facts support live, since both TTFs are downloadable from /hyle-fonts. Confirm.
  - Confirm google/fonts issue #10690 is the real submission. Its body and comments could not be read. The roster verify flag saying the submission is not yet opened looks stale.
  - The default branch has no LICENSE file. OFL.txt there is a placeholder, and the full text and METADATA.pb are only in open draft PR #4. Merge it so the page's licence line is true on main.
  - The stroke figures, Latin Core coverage and tabular figures are author statements. Run a check on the compiled TTFs to promote these from partial to shipped.
  - No product imagery exists. The manifest has no entries for the hyle-deco imagery key. A web-lane capture of the .deco-specimen blocks on /hyle-fonts (dark scheme) would fill it, labelled Web.
  - The page-view counting line for /hyle-fonts was not checked. The never-happens lines make no claim about it.
---
Hyle Deco is part of the Hyle type system. The Fonts page shows both styles set in the real files, and carries the downloads.

The Regular outlines are kept as a UFO source. The Italic exists only as a compiled TTF. This page does not claim a reproducible build or Google Fonts acceptance.
