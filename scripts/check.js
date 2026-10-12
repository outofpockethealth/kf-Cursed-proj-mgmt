#!/usr/bin/env node
// Checks every board in boards/*.json. Usage: node scripts/check.js
// Exits 1 if any board has an error
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BOARDS = path.join(ROOT, "boards");
const STATUSES = ["To Do", "In Progress", "Blocked", "In Review", "Done"];
const REQUIRED = ["id", "title", "owner", "status", "start", "due", "updated"];

const validDate = s => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
};

function checkBoard(file) {
  const errors = [], warnings = [];
  let b;
  try { b = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { return { errors: [`Not valid JSON: ${e.message}`], warnings, b: null }; }

  const p = b.project || {};
  for (const k of ["name", "company", "product", "today", "deadline", "deadlineLabel", "context"])
    if (p[k] === undefined || p[k] === "") errors.push(`project.${k} is missing`);
  for (const k of ["today", "deadline"])
    if (p[k] && !validDate(p[k])) errors.push(`project.${k} "${p[k]}" isn't a valid YYYY-MM-DD date`);
  if (!b.team || typeof b.team !== "object") errors.push("team is missing");
  if (!Array.isArray(b.tickets)) { errors.push("tickets is missing or not a list"); return { errors, warnings, b }; }

  const ids = new Set();
  for (const [i, t] of b.tickets.entries()) {
    const who = t.id ? t.id : `ticket #${i + 1}`;
    for (const k of REQUIRED) if (t[k] === undefined) errors.push(`${who}: missing "${k}"`);
    if (t.id && ids.has(t.id)) errors.push(`${who}: duplicate id`);
    if (t.id) ids.add(t.id);
    if (t.status !== undefined && !STATUSES.includes(t.status)) errors.push(`${who}: status "${t.status}" isn't one of ${STATUSES.join(", ")}`);
    for (const k of ["start", "due"]) if (t[k] && !validDate(t[k])) errors.push(`${who}: ${k} "${t[k]}" isn't a valid YYYY-MM-DD date`);
    if (validDate(t.start) && validDate(t.due) && t.due < t.start) errors.push(`${who}: due ${t.due} is before start ${t.start}`);
    if (!!t.start !== !!t.due) warnings.push(`${who}: has a ${t.start ? "start" : "due"} date but no ${t.start ? "due" : "start"} date`);
    if (t.owner && t.owner !== "Everyone" && b.team && !b.team[t.owner]) warnings.push(`${who}: owner "${t.owner}" isn't in team`);
    if (t.waiting !== undefined && !Array.isArray(t.waiting)) errors.push(`${who}: "waiting" must be a list of ticket ids`);
    if (t.comments !== undefined && !Array.isArray(t.comments)) errors.push(`${who}: "comments" must be a list`);
    for (const [j, c] of (Array.isArray(t.comments) ? t.comments : []).entries())
      for (const k of ["author", "text"]) if (!c[k]) errors.push(`${who}: comment #${j + 1} is missing "${k}"`);
    if (t.commentCount !== undefined && !Number.isInteger(t.commentCount)) errors.push(`${who}: "commentCount" must be a whole number`);
  }
  for (const t of b.tickets)
    for (const w of Array.isArray(t.waiting) ? t.waiting : [])
      if (!ids.has(w)) errors.push(`${t.id}: waiting on "${w}", which doesn't exist`);

  if (b.slack !== undefined && !Array.isArray(b.slack)) errors.push("slack must be a list");
  for (const [i, m] of (Array.isArray(b.slack) ? b.slack : []).entries())
    for (const k of ["author", "time", "text"]) if (!m[k]) errors.push(`slack message #${i + 1}: missing "${k}"`);
  if (b.notes && b.notes.bullets !== undefined && !Array.isArray(b.notes.bullets)) errors.push("notes.bullets must be a list");

  return { errors, warnings, b };
}

let failed = false;
const files = fs.readdirSync(BOARDS).filter(f => f.endsWith(".json")).sort();
if (!files.length) { console.log("No boards found in boards/"); process.exit(1); }

for (const f of files) {
  const { errors, warnings, b } = checkBoard(path.join(BOARDS, f));
  const slug = f.replace(/\.json$/, "");
  if (!/^[a-z0-9-]+$/.test(slug)) errors.push(`file name "${f}" should be lowercase letters, numbers, and dashes`);
  const summary = b && Array.isArray(b.tickets)
    ? `${b.tickets.length} tickets, ${(b.slack || []).length} Slack messages, ${b.notes && (b.notes.bullets || []).length ? "notes" : "no notes"}`
    : "";
  console.log(`\n${errors.length ? "FAIL" : "PASS"}  ${slug}${summary ? `  (${summary})` : ""}`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  for (const w of warnings) console.log(`  ! ${w}`);
  if (errors.length) failed = true;
}

// tables.json should only point at boards that exist
try {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, "tables.json"), "utf8"));
  const missing = m.tables.filter(t => t.board && !files.includes(t.board + ".json"));
  const empty = m.tables.filter(t => !t.board).map(t => t.table);
  console.log(`\n${missing.length ? "FAIL" : "PASS"}  tables.json`);
  for (const t of missing) console.log(`  ✗ Table ${t.table} points at "${t.board}", but boards/${t.board}.json doesn't exist`);
  if (empty.length) console.log(`  ! No board yet for table ${empty.join(", ")}`);
  if (missing.length) failed = true;
} catch (e) { console.log(`\nFAIL  tables.json: ${e.message}`); failed = true; }

// Answer keys must never be in this public repo
const leaked = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules"].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (/answer[-_ ]?key/i.test(e.name)) leaked.push(path.relative(ROOT, full));
    else if (e.isDirectory()) walk(full);
  }
})(ROOT);
if (leaked.length) {
  console.log(`\nFAIL  answer keys found in the repo folder. Move them out before committing:`);
  for (const l of leaked) console.log(`  ✗ ${l}`);
  failed = true;
}

console.log(failed ? "\nSome checks failed" : "\nAll boards look good");
process.exit(failed ? 1 : 0);
