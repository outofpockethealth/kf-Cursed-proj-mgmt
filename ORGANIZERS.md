# Running the exercise

The site is plain HTML on GitHub Pages: no login, no build step.

| File | What it is |
|---|---|
| `boards/<slug>.json` | One project. The format is in [BOARD_FORMAT.md](BOARD_FORMAT.md). Hand that file to Claude chat to generate new ones |
| `tables.json` | Which board each table gets, the landing page text, and `shareUrl` (the show-and-tell deck) |
| `starter-prompt.txt` | The prompt that Copy for AI pastes. `{{data}}` gets replaced with the whole project |
| `scripts/check.js` | Checks every board for broken links between tasks, missing fields, and bad dates. Run `node scripts/check.js` |

**Links:** `?board=<slug>` opens a board. `?table=<n>` opens whatever board that table is assigned in `tables.json`, so QR codes can point there and survive a rename.

**Add a board:** save it as `boards/<slug>.json`, point a table at it in `tables.json`, run `node scripts/check.js`, push. The site updates in about a minute.

**Show and tell:** `shareUrl` in `tables.json` is the Google Slides deck teams paste their builds into (one slide per team, anyone with the link can edit). It shows up as **Share your build** in each board's sidebar and on the Copy for AI page. Leave it empty to hide both.

**Run locally:** `python3 -m http.server 8000`, then open <http://localhost:8000> (opening the file directly won't load the boards).

> [!CAUTION]
> **This repo is public. Answer keys never go in it.** `.gitignore` blocks `answer-keys/` and any `*answer-key*` file, `check.js` fails if one is in the folder, and the pre-commit hook refuses them. Turn the hook on after cloning: `git config core.hooksPath .githooks`
