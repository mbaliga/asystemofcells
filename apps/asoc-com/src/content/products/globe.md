---
headline: BALIGA Globe draws the running seconds as two seven-segment digits on a globe of cells, with capsule hands for hour and minute.
lede: There is no seconds hand. One HTML mock is the design reference, and the Wear OS, Huawei and Garmin versions are built from it. Nothing is released yet.
features:
  - title: Seconds drawn as a globe
    body: Two seven-segment digits are mapped onto an 11 by 9 latitude and longitude grid and projected orthographically. Each cell is shaded by its depth on the sphere.
    status: shipped
  - title: Analog hour and minute hands
    body: Hour and minute are capsule hands with a lume insert, sized from the dial radius. The Garmin settings list six hand shapes, but that build has not been compiled.
    status: shipped
  - title: One mock, three exports
    body: A single HTML canvas file is the design reference. The Wear OS and Huawei images are baked from it by a Python script, and the Garmin version redraws its geometry in Monkey C. Whether the Garmin geometry matches is not yet checked.
    status: shipped
  - title: Wear OS, as a Watch Face Format file
    body: The face is declarative XML with baked PNG layers, and the manifest sets hasCode to false. The file offers a colourway choice, three outer rings and a crystal overlay. It has not been run on a watch, and the repository's own notes disagree on whether six or twelve colourways are wired.
    status: partial
  - title: Huawei, as baked frames
    body: Each colourway is a face of 60 frames at 466 px, one per second value, plus hand images. Assembly in Huawei Theme Studio is a manual step and is not recorded as done.
    status: partial
  - title: Garmin, drawn in code
    body: The source is written for nine Garmin products. It offers display modes (gridded, segmented, solid), nine outer rings and a switch that turns the bezel on or off. It has never been compiled or run in the simulator, so the Instinct models in particular are not promised.
    status: partial
  - title: Seconds snap on Wear OS and Huawei
    body: The mock has seven seconds transitions. Wear OS and Huawei formats cannot script per-second animation, so the seconds change without one on those platforms.
    status: partial
  - title: Always-on form
    body: The design calls for hour and minute capsules, a dimmed globe and no running seconds. The generated Wear OS file has no ambient variant yet, so this is in the plan and not built.
    status: planned
neverHappens:
  - The Wear OS manifest requests no permissions, so it has no INTERNET permission. It sets hasCode to false and allowBackup to false.
  - The Garmin manifest requests the Sensor permission only, for the heart-rate and compass rings, and no Communications permission. The source contains no web request call, and it has not been compiled.
  - The HTML mock makes no network calls, and the Huawei package is images with no code.
  - No analytics or telemetry dependency is in the repository.
openSource:
  isOpen: false
  licence: No licence file
  note: The repository is private, so there is no public source today. A change to PolyForm Noncommercial 1.0.0 is proposed on a branch and not merged.
faq:
  - q: Where do I get it?
    a: Nowhere yet. There is no release and no store listing. A Wear OS and Garmin Connect IQ listing is drafted and not submitted.
  - q: Which watches?
    a: The targets are Wear OS, Huawei watches through Theme Studio, and nine Garmin products. Only the Wear OS and Huawei assets have been built, and none has been tested on a watch.
  - q: Is there a seconds hand?
    a: No. The seconds are two seven-segment digits drawn on the globe.
  - q: Is it planned for iOS or other platforms?
    a: No. The porting plan marks iOS, macOS, Windows, Linux and Ubuntu Touch as skipped for this face.
ownerNotes:
  - "Public name: the repo says BALIGA Globe; the brief says Globe / Timely. 'Timely' appears nowhere in the repo. Page uses BALIGA Globe. Confirm the name, and note the roster name is 'Globe watch face'."
  - "Roster oneLiner says 'real-time day and night Earth'. The repo describes seconds drawn as a globe of cells and says nothing about day and night. The roster line should be changed."
  - "Colourway count: watchface.xml wires 12, wear/README.md and spec.md say 6. The page states no number. Confirm."
  - "Licence: the default branch (main) has no LICENSE file (gh api returns 404). PolyForm Noncommercial 1.0.0 is in commit 9ed3b2d on the working branch only. Merge it, then change licence to 'Source-available (PolyForm Noncommercial 1.0.0)' and drop the note. about.astro already says source-available house-wide."
  - "Repo is private; do not link it. The page gives no repo field."
  - "The Garmin sensor line rests on the manifest and a grep. The verdict says heart rate via Activity.getActivityInfo may need further permissions. Check at the first compile."
  - "Image: the one manifest render is from the HTML mock (Web/Render label). No device captures exist; do not label anything 'Captured on device'."
  - "The 'asystemofcells.com/globe' URL in the store draft is planned, not live."
statusProposal: "Roster status 'soon' is supported by the facts: no release, no store listing, Garmin never compiled."
---
