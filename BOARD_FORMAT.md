# Board file format

Each project is one file: `boards/<slug>.json`. The slug is lowercase letters, numbers, and dashes (for example `data-breach`). It becomes the URL: `?board=data-breach`.

Paste this whole file into Claude chat when you generate a new board, and ask for JSON in exactly this shape.

**Never put answers, hints, or "planted problem" labels in a board file.** Board files are public. Answer keys live outside this repo.

## Shape

```json
{
  "project": {
    "name": "PillPrice launch",
    "company": "Wren Health, a benefits app that employers give to their employees",
    "product": "PillPrice, a new feature that shows employees the cheapest nearby pharmacy",
    "today": "2026-11-02",
    "deadline": "2026-11-23",
    "deadlineLabel": "Launch day",
    "context": "The CEO announced the launch date on stage, so it is not moving",
    "brief": "A few sentences shown at the top of the board that set up the story",
    "slackChannel": "pillprice-launch"
  },
  "team": {
    "Sam": { "role": "Engineering lead" },
    "Priya": { "role": "Legal. The only lawyer" }
  },
  "tickets": [
    {
      "id": "L-8",
      "title": "Submit app to the app stores",
      "owner": "Sam",
      "status": "To Do",
      "note": "On track",
      "start": "2026-11-16",
      "due": "2026-11-20",
      "waiting": ["L-6"],
      "updated": "Never",
      "desc": "Submit once Legal signs off",
      "commentCount": 4,
      "comments": [
        { "author": "Sam", "time": "2 weeks ago", "text": "Waiting on Priya" }
      ]
    }
  ],
  "slack": [
    { "author": "Sam", "time": "9:14 AM", "text": "Quick one @Priya, any update on L-6?" }
  ],
  "notes": {
    "title": "Launch sync",
    "date": "2026-10-30",
    "attendees": ["Jordan", "Sam", "Marisol"],
    "bullets": ["Launch date is locked", "@Tyler to share the deck draft"]
  }
}
```

## Rules

**project**
- All fields are required except `slackChannel` (defaults to the slug) and `brief`
- `brief` is shown in a box at the top of the Board and Gantt views and at the top of the Copy for AI paste
- `today` is the fake "today" inside the story. Overdue badges and the timeline use it, not the real date
- `deadlineLabel` is what the header pill and timeline line say, like "Launch day" or "Go-live"

**team**
- Name to role. Avatar colors are assigned in this order
- Optional `"color": "#hex"` overrides the avatar color

**tickets**
- Required on every ticket: `id`, `title`, `owner`, `status`, `start`, `due`, `updated`
- `status` is one of: `To Do`, `In Progress`, `Blocked`, `In Review`, `Done`
- `owner` is a team name, `"Everyone"`, or `""` for no owner
- `start` and `due` are `YYYY-MM-DD`, or `""` for not set. Due can't be before start
- `waiting` is a list of other ticket ids. Every id must exist
- `waitingText` is free text for waiting on something that isn't a ticket (like "Jordan"). Use it instead of `waiting`
- `note` is optional, a short status note shown on the card (like "90% done")
- `updated` is free text, like "2 weeks ago"
- `desc` is free text; line breaks are kept
- `comments` is optional: a list of `{ "author", "time", "text" }`, oldest first, shown in the ticket drawer
- `commentCount` is optional. Use it when a ticket "has 43 comments" but only a few are written out
- Ids can use any prefix (`L-`, `M-`, `CRED-`)

**slack**
- A list of messages, oldest first. Each needs `author`, `time`, `text`
- `@Name` is highlighted. Authors outside the team get a gray avatar

**notes**
- One meeting. `bullets` is a list of strings. `date` can be `YYYY-MM-DD` or free text

## Adding a board

1. Save the JSON as `boards/<slug>.json`
2. Point a table at it in `tables.json`: `{ "table": 2, "board": "<slug>" }`
3. Run `node scripts/check.js` and fix anything marked ✗
4. Commit and push. GitHub Pages updates in about a minute
