# Raised frets

A Clackpad extension that puts predicted words on the **fret bars** (the silver bars between key rows), inspired by the predictive-word-on-the-keyboard idea of classic physical-keyboard phones.

> Independent, unofficial, non-commercial fan project. See [NOTICE.md](NOTICE.md).

## What it does

Clackpad's keyboard already knows which words are likely next. This extension only decides **how they are shown** on the frets; the keyboard supplies the candidates (an extension can never supply or read words). You choose, in the extension's options:

| Option | Values | Default |
|---|---|---|
| Suggestions shown | 1 to 5 | 3 |
| Accept with | Tap / Flick up / Tap or flick up | Tap or flick up |
| Placement | Above the likely next letter / Spread evenly | Above the likely next letter |
| Look | Classic text / Raised plate | Raised plate |
| Keep the suggestion strip | on / off (off lets the frets replace the strip) | on |
| Font size | 8 to 18 | 12 |
| Colour | Text / Accent / Dim | Text |
| Show in landscape | on / off | on |

**Look.** "Raised plate" draws each word on a small raised plate on the bar. "Classic text" draws no plate at all: the words are small, plain, white-ish text (the board's own legend colour) sitting on the fret line, directly above the key of the letter that continues the word, with a faint halo so they read on every skin. In Classic text the size follows the key legends (about 60%, 11 to 16 sp) and the Font size option is not used. Placement, accepting by tap or flick up, and the screen-reader labels are the same in both looks.

## Permissions

`suggestions:surface` only: "Shows suggestions on the fret bars". It reads nothing you type, uses no network and writes no files.

## Install

1. Get `dev.asystemofcells.frets.raised-1.1.0.cpx` (from the catalog, or copy it to the phone).
2. Clackpad > Extensions > Browse (or From file), check the permission list, Install.
3. Open the extension and switch it on. Installing never enables it.
4. Adjust the options on the same screen. Switch it off (or "Safe mode: disable all") to get the stock frets back.

Requires the Clackpad build that implements the `frets` suggestion surface.

## How it is built

`extension.json` declares one `suggestionSurface` for the `frets` surface and eight option fields; `fromConfig` ties each surface field to the option that drives it, so the user's choice replaces the declared default at run time. There is no code in the package. Validate and pack with `clackpad/extensions-sdk` (`node validate.mjs`, `node pack.mjs`), or run `../build.sh`.

## Licence

Code and manifest: MIT ([LICENSE](LICENSE)). The icon is original artwork drawn for this project (a small keyboard with a word on a metal bar), under the same licence. No third-party logos, fonts, trademarks or artwork are included.
