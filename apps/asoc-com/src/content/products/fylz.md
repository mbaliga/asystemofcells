---
headline: Fylz is a file manager for Android that opens files in place, journals each operation, and keeps a recycle bin.
lede: It is at pre-release 1.0.0-alpha01. Opt-in version history covers supported writes. Watching the repo is the sensible way to follow it.
features:
  - title: Two storage backends at once
    body: Fylz reads local volumes directly when you grant All files access. Cloud, USB and third-party providers go through the Storage Access Framework. If you decline All files access, the Storage Access Framework mode still works.
    status: shipped
  - title: Operation journal
    body: Copy, move, rename, delete and restore are written to a journal. An interrupted move offers a cleanup-only "Finish move" step instead of copying again.
    status: shipped
  - title: Opt-in file version history
    body: It is off by default. When you switch it on, Fylz stores a SHA-256 snapshot before a supported write. A restore is checked against that hash and rolled back if the bytes do not match.
    status: shipped
  - title: Archives
    body: Fylz creates AES-256 ZIP files in the app. Extraction is checked against a compression-ratio limit. Further limits on entry count and path depth are described in the docs but not yet confirmed in code.
    status: partial
  - title: Listing 7z, tar and compressed streams
    body: Fylz lists these formats read-only through Apache Commons Compress. It does not extract them. RAR is not supported.
    status: partial
  - title: Rooms around a browser home
    body: The file browser is home. Locations sit off the left edge and tools and settings off the right. A recovery room below is described in the architecture notes. The top edge is reserved and holds nothing.
    status: partial
  - title: Edge scrubber
    body: A strip beside the listing jumps by the active sort, such as first letter, month or extension.
    status: shipped
  - title: Batch rename
    body: A batch rename dialog is wired to the selection bar and its policy has unit tests. Rule-based templates and a dry-run review are in the plan, not built.
    status: partial
neverHappens:
  - "The manifest declares five permissions: INTERNET, FOREGROUND_SERVICE, FOREGROUND_SERVICE_DATA_SYNC, VIBRATE and MANAGE_EXTERNAL_STORAGE. INTERNET is there for network locations and the optional AI client."
  - No analytics or telemetry dependency is declared in the build file. Cleartext traffic is switched off in the manifest.
  - Declining All files access does not lock you out. Fylz falls back to the Storage Access Framework.
  - If you point it at your own AI endpoint, your text goes there and nowhere else.
openSource:
  isOpen: true
  licence: Apache License 2.0
  repo: mbaliga/Fyl-Manager
  note: A change to PolyForm Noncommercial 1.0.0 is proposed on a branch and not merged.
faq:
  - q: Does Fylz need internet?
    a: The manifest declares the INTERNET permission. It serves network locations (WebDAV, SFTP, SMB, S3-compatible) and the optional bring-your-own-key AI client. Browsing local files does not use it.
  - q: Why does a file manager ask for All files access?
    a: Browsing shared local volumes without a picker needs the MANAGE_EXTERNAL_STORAGE permission. If you decline, Fylz uses the Storage Access Framework instead.
  - q: Can I undo a change?
    a: Version history is off by default. With it on, supported writes are snapshotted first and a restore is checked. Rename, move and copy do not keep a separate copy of the old state.
  - q: Where can I get it?
    a: There is no store listing. The GitHub repo has one prerelease, a CI debug build published on 18 August 2026. It is not a signed release. Device, accessibility and signed-upgrade acceptance are not yet done.
statusProposal: "Roster status 'building' fits the facts (1.0.0-alpha01, one CI debug prerelease). The roster oneLiner claims 'every file is inspectable' and 'every write you make can be undone'. Neither holds: history is opt-in and covers supported writes only. Suggest rewording the oneLiner."
ownerNotes:
  - "Licence conflict: default branch main carries Apache-2.0 (page says Apache-2.0, isOpen true, with a note that a PolyForm Noncommercial change is proposed on a branch). The working branch has PolyForm NC and COMMERCIAL-LICENSE.md. Confirm which you intend, and update this page when it merges."
  - "The brief's capability ladder 0-5, Intent above / Evidence below rooms, 'Safety History' name, Rhai scripting, RAR support and rule-based bulk rename are not evidenced in the repo and are left out or described as they exist."
  - "Features not listed because behaviour was not verified in code: recycle bin placement, backup plans with manifests, search modes and local index, network locations maturity, PDF tools, optional AI (default-off not verified in code). Say if you want any added as partial."
  - "No images: the repo has no screenshots, no fastlane directory and no Compose previews, and the manifest has no fylz entries. Page is feature-led."
  - "Roster oneLiner needs a rewrite (see statusProposal). No Play listing is promised; MANAGE_EXTERNAL_STORAGE needs a Play declaration."
  - "Branches agent/fylz-v1, claude/fylz-continue and others were not examined."
---
Fylz is early. The code for the first version is written. It has not been through recorded device testing, so treat it as an alpha build and expect rough edges.

The only download is a CI debug build on the GitHub releases page. Watch the repo to hear when a proper release exists.
