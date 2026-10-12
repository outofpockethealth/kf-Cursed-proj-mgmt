# Exercise boards

Fake project boards for a live conference exercise. Static site on GitHub Pages: no login, no build step.

- `index.html` with no query shows the table list (from `tables.json`)
- `?board=<slug>` opens a board. `?table=<n>` redirects to that table's board
- Board tabs: Board, List, Issues, Timeline, Slack, Meeting notes, Copy for AI
- **Copy for AI:** a team writes "The thing that will sink this project is…" first. That unlocks one button that copies `starter-prompt.txt` with their sentence and the whole project filled in (`{{sentence}}`, `{{data}}`)

## Files

| File | What it is |
| --- | --- |
| `boards/*.json` | One file per project. Format: [BOARD_FORMAT.md](BOARD_FORMAT.md) |
| `tables.json` | Table number to board, landing text, and `submitUrl` |
| `starter-prompt.txt` | The prompt teams paste into AI |
| `scripts/check.js` | Checks every board. Run `node scripts/check.js` |

## Collecting sentences

Set `submitUrl` in `tables.json` to a pre-filled Google Form link with `{board}`, `{project}`, and `{sentence}` where the answers go, for example:

```
https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url&entry.111={project}&entry.222={sentence}
```

A "Send it to the organizers" button appears once a team locks in its sentence. Leave it empty to hide the button.

## Run locally

Boards load with `fetch`, so open the site through a server, not the file:

```
python3 -m http.server 8000
```

Then go to http://localhost:8000

## Answer keys

This repo is public. Answer keys never go in it. `.gitignore` blocks `answer-keys/` and any `*answer-key*` file, the pre-commit hook in `.githooks/` refuses them, and `check.js` fails if one is in the folder. After cloning, turn the hook on with:

```
git config core.hooksPath .githooks
```
