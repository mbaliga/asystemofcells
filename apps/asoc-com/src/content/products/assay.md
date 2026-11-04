---
headline: Assay merges Gitleaks, Semgrep, OSV-Scanner and MobSF output into SARIF on a separate git branch.
lede: Assay has no releases yet. The product code is on a branch, not on main, so the repo is the place to follow it.
features:
  - title: Scanner output merged into SARIF
    body: The runner executes Gitleaks, Semgrep and OSV-Scanner after checking each binary's SHA-256 and version against a lock file, and queries MobSF through its API. Results are normalised into SARIF 2.1.0 with stable SHA-256 finding identities. This runs on a self-hosted runner, not on the phone. MobSF against a real pinned container is implemented but not yet certified.
    status: partial
  - title: Orphan audit branch
    body: Results are committed to a branch called assay/audit that has no source-history parent. Each push uses an explicit compare-and-swap lease, and a stale lease is rejected. It is tested against a local bare remote. Publishing to a hosted remote is not yet confirmed.
    status: partial
  - title: Package-level APK quick check
    body: You pick an APK with the system document picker. The app copies it to private cache, reads package flags, permissions, exported components, signing-certificate presence and native libraries, then deletes the copy. It does not run the four scanners. It builds and passes lint in CI, and has not yet been tested on a physical phone.
    status: partial
  - title: Audit import in the Android app
    body: The app opens the JSON written by assay console-snapshot. It rejects the file if a field is unknown or missing, if it exceeds 8 MB, or if findings and candidates reference each other wrongly. Missing or invalid evidence is never shown as zero findings. Not yet tested on a physical phone.
    status: partial
  - title: Remediation candidates with a human gate
    body: A candidate binds a source commit, a finding, a patch and a test that fails before the patch and passes after. Approve and reject require a human actor, events are hash-chained, and a stale source blocks application. The app can copy a command to the clipboard. It cannot run, approve, apply or merge anything. This is tested in CI on the branch and has not been run in a real deployment.
    status: partial
  - title: Multi-project views and release signing
    body: Views across several projects are in the plan, as a v2 phase. A stable release-signing key does not exist yet, so CI debug APKs use a key generated in CI.
    status: planned
neverHappens:
  - The Android app declares no permissions at all, so it has no INTERNET permission. Its manifest also turns off cleartext traffic and backups.
  - The app module depends on one library, androidx.activity-ktx. There is no analytics or telemetry code in it.
  - The APK you pick is copied to private cache, read, and deleted. The app gets that one file through the system picker and does not save reports.
  - The runner-side command line tool is separate and does use the network. run-mobsf calls a MobSF HTTP API you point it at, and publish-bus-git pushes to a git remote you name.
openSource:
  isOpen: true
  licence: Apache-2.0
  repo: mbaliga/Assay
  note: A change to PolyForm Noncommercial 1.0.0 is proposed on a branch and not merged.
faq:
  - q: Can I install it?
    a: No. There are no releases and no store listing. A CI debug APK sits on the apk-testbuild branch. It is not offered as an install, and a later build may need an uninstall first because of the CI signing key.
  - q: Does it audit on the phone?
    a: Only partly. The phone app does a package-level quick check on an APK you choose and reads audit files. The four scanners run on a self-hosted runner, which is not yet certified.
  - q: Does AI find the issues?
    a: No. The scanners produce the findings. AI is optional and sits downstream of them. The README states it cannot originate a finding.
statusProposal: Roster status building is supported by the facts. No change proposed.
ownerNotes:
  - Licence conflict on GitHub. The default branch main carries Apache-2.0, which this page states. Branch claude/asystemofcells-redesign-s6yv4c (commit d547f79) carries PolyForm Noncommercial 1.0.0, the house convention in about.astro. Decide which applies. If PolyForm, set isOpen false and licence to "Source-available (PolyForm Noncommercial 1.0.0)", and drop the note.
  - Roster oneLiner says "On-device security auditing for AI-written Android apps" and "no model invents a finding". The repo supports neither wording as written. Only the quick check is on the phone, and the README says "Android repositories". Consider rewording the roster line.
  - Roster repo is mbaliga/assay; GitHub canonical name is mbaliga/Assay.
  - The statement that you judged it not production-ready in Nov 2026 is not in any repo file. The page says "not ready" on your word.
  - Product code is only on branch agent/assay-v1-foundation. Main has a LICENSE and a cleanup workflow. The repo link will show little until that branch is merged.
  - No images exist anywhere in the repo, so none are used. A device capture is the only honest screenshot. The launcher icon vectors are not screens.
  - Physical-device smoke tests and the runner certification are listed as pending in VERIFICATION.md. Confirm before any wording stronger than "builds and passes lint in CI".
  - The "no telemetry" line is checked for the app module only (single dependency). The runner CLI is covered only by README statements (Semgrep telemetry off, OSV offline by default).
hub: false
---
Assay is built in two parts. A runner executes scanners and writes evidence to a git branch. A phone app reads that evidence and does a small check of its own on an APK.

None of it is released. Watch the repo at github.com/mbaliga/Assay if you want to know when it is.
