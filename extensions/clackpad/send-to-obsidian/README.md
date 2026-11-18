# Send to Obsidian

A Clackpad extension that **sends text to your own Obsidian vault**: what you typed, or what is on the clipboard, becomes a Markdown note (or a line in a daily or single note) in a folder you choose.

> Unofficial community extension. Not affiliated with, endorsed by or sponsored by Obsidian. See [NOTICE.md](NOTICE.md).

## How it works with a vault

A vault is an ordinary folder of `.md` files. You pick that folder **once** with the system folder picker, and the extension writes files into it. Obsidian notices new and changed files on its own, and syncs them the way it already syncs your vault (Obsidian Sync or any other sync you use). There is no Obsidian plugin, account, network call or API key.

If you would rather go through Obsidian itself, `obsidian://new` links also work; this extension uses `obsidian://open` only to open your vault (and optionally one note).

## The Obsidian tab

After you enable the extension, the Tools Panel gets an **Obsidian** tab:

- a status row: `Vault: <folder name>` or `Not connected`
- **Send typed text** (the selection if there is one, else the whole field)
- **Send clipboard**
- **Open vault**
- **Connect vault** (opens this extension's options)

## Options

| Option | What it does |
|---|---|
| Vault folder | The folder you grant, picked once. Choose a subfolder of the vault to keep sends in one place. |
| Vault name | Used only by **Open vault** (the name Obsidian shows for the vault). |
| Each send | Creates a new note / Appends to the daily note / Appends to one note |
| New note name | Template, default `{{title}}`. `{{title}}` is the first line of the text (up to 60 characters). `{{date}}`, `{{time}}`, `{{datetime}}` work too. Do not type `.md`. |
| Daily note name | Default `{{date}}`, for example `2026-11-03` |
| Single note name | Default `Clackpad inbox` |
| Add frontmatter to new notes | `created`, `source` and `tags` properties at the top of a new note |
| Tags | Comma separated, without `#`, for example `inbox, idea` |
| Note to open | Optional note for **Open vault**; the same variables work, for example `{{date}}` |

A new note never overwrites: if the name exists, the note is saved as `name (2).md`. Appended entries are added under a `## HH:mm` heading.

## Privacy

Text is read **only when you tap a button**, never from password, incognito or never-learn fields, and goes only into the folder you picked. Permissions:

| Permission | Why |
|---|---|
| `typed:read` | Send typed text |
| `clipboard` | Send clipboard |
| `folder:write` | Write into the vault folder you chose (and nowhere else) |
| `uri:obsidian` | Open vault (an `obsidian://` link) |

## Install

Clackpad > Extensions > Browse (or From file) > review the permissions > Install > open the extension, switch it on, choose the vault folder.

## Licence

Code and manifest: MIT ([LICENSE](LICENSE)). The icon is original artwork drawn for this project (a page with a downward arrow) under the same licence. It does not use the Obsidian logo or any other third-party artwork.
