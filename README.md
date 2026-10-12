![How did they build this without scrum masters, kanban boards, story pointing, and sprint planning](how-did-they-build-this.png)

## Cursed Project Management

six projects are in trouble. your table just got handed one.

you meet the CEO in 30 minutes. find out what's really going on: <ins>what's stuck, who's stuck, and what nobody's noticed</ins>.

then use AI to build something that shows it. useful, ridiculous, or both.

your mission, if you like missions: **Find the truth about your project, then build something that shows it.**

The only rule: **it has to tell the truth.** A fun thing that's true beats a polished dashboard that isn't.

Everything here is made up. The companies, the people, the tickets. Use it however you like.

### tl;dr 1. Open your board 2. Investigate (no AI) 3. Build with AI 4. Brief the CEO

**1. Open your board.** Scan the QR code on your table, or pick your project from the [project list](https://outofpockethealth.github.io/kf-Cursed-proj-mgmt/).

**2. Investigate. No AI yet. (10 min)**

Read three things:
* **The board.** The same tickets show up as a Board (like Trello), a List (like Asana), Issues (like Jira), and a Timeline. Use whichever view your brain likes. Click any ticket for the details
* **The Slack thread.** What people are actually saying
* **The meeting notes.** What people said out loud

Then, as a table, finish this sentence:

> **The thing that will sink this project is \_\_\_**

Type it into the **Copy for AI** tab and lock it in.

> [!TIP]
> The board is what people *say* is happening. Slack and the meeting notes are where the truth tends to leak out. Read all three before you decide.

**3. Build with AI. (20 min)**

Once your sentence is locked in, hit **Copy for AI**. That copies everything in one paste: a starter prompt, your sentence, and the whole project. Paste it into Claude, ChatGPT, Gemini, or whatever you use.

The AI goes first: it tells you what *it* thinks will sink the project. Then it compares its answer to yours. Did it catch something you missed? Did the board fool it?

Then build something that shows the truth. Ideas to get you started:
* a tabloid front page about the project
* an obituary for the project, written in advance
* a "what the status update says vs. what it means" translator
* a bingo card for the next project meeting
* a song, a poem, a movie trailer
* an actual tool you'd use at work on Monday

> [!TIP]
> **Done means one working screen.** A screenshot of a half-working thing counts. Ask for something the AI can show right in the chat, so you don't have to figure out how to run code.

**4. Brief the CEO. (10 min)**

A few teams brief the CEO, in any format they want. One award, by applause. Two questions: **is it true? is it fun?**

## House rules

* **Use the fake tickets, not yours.** Don't paste real company or patient data into an AI tool. The whole point of the fake projects is that you don't have to
* **One laptop, one person typing.** If you're the most AI-comfortable person at the table, coach. Let someone else drive
* **Investigate before you build.** If the AI reads the board first, the AI finds the problems and you watch. Reading it yourself is the fun part

## The projects

Your table number tells you which one is yours.

| # | Project | Board |
|---|---|---|
| 1 | Product launch: PillPrice, a pharmacy price checker that launches in 3 weeks | [open](https://outofpockethealth.github.io/kf-Cursed-proj-mgmt/?board=product-launch) |
| 2 | Merging two companies' systems after an acquisition | coming soon |
| 3 | Rolling out an AI tool company-wide | coming soon |
| 4 | Onboarding a cohort of new hires | coming soon |
| 5 | Provider credentialing | coming soon |
| 6 | Data breach response | coming soon |

Each project has a board, a short Slack thread, and one set of meeting notes. They're all on the board page, in their own tabs.

---

## For organizers

The site is plain HTML on GitHub Pages: no login, no build step.

| File | What it is |
|---|---|
| `boards/<slug>.json` | One project. The format is in [BOARD_FORMAT.md](BOARD_FORMAT.md). Hand that file to Claude chat to generate new ones |
| `tables.json` | Which board each table gets, the landing page text, and `submitUrl` |
| `starter-prompt.txt` | The prompt that Copy for AI pastes. `{{sentence}}` and `{{data}}` get filled in |
| `scripts/check.js` | Checks every board for broken links between tickets, missing fields, and bad dates. Run `node scripts/check.js` |

**Links:** `?board=<slug>` opens a board. `?table=<n>` opens whatever board that table is assigned in `tables.json`, so QR codes can point there and survive a rename.

**Add a board:** save it as `boards/<slug>.json`, point a table at it in `tables.json`, run `node scripts/check.js`, push. The site updates in about a minute.

**Collect sentences:** set `submitUrl` in `tables.json` to a pre-filled Google Form link with `{project}`, `{board}`, and `{sentence}` where the answers go. A "Send it to the organizers" button shows up once a team locks in. Leave it empty to hide the button.

**Run locally:** `python3 -m http.server 8000`, then open http://localhost:8000 (opening the file directly won't load the boards).

> [!CAUTION]
> **This repo is public. Answer keys never go in it.** `.gitignore` blocks `answer-keys/` and any `*answer-key*` file, `check.js` fails if one is in the folder, and the pre-commit hook refuses them. Turn the hook on after cloning: `git config core.hooksPath .githooks`
