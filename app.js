const COLUMNS = [
  {key:"To Do",color:"var(--todo)"},
  {key:"In Progress",color:"var(--prog)"},
  {key:"Blocked",color:"var(--block)"},
  {key:"In Review",color:"var(--review)"},
  {key:"Done",color:"var(--done)"}
];
// Avatar colors, assigned to team members in the order they appear in the JSON
const PALETTE = ["#7c3aed","#be185d","#0369a1","#c2410c","#047857","#4d7c0f","#b45309","#475569","#9ca3af","#0e7490","#9333ea","#a16207"];

const $ = s => document.querySelector(s);
const D = s => new Date(s + "T00:00:00");
const days = (a,b) => Math.round((D(b)-D(a))/864e5);
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const addDays = (s,n) => { const d = D(s); d.setDate(d.getDate()+n); return iso(d); };
const fmt = s => s ? D(s).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "";
const fmtY = s => s ? D(s).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "";
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const slugOk = s => /^[a-z0-9-]+$/.test(s || "");
const getJSON = url => fetch(url, {cache:"no-cache"}).then(r => { if(!r.ok) throw new Error(r.status); return r.json(); });
// Each project gets a stable color and a short key (the task id prefix, like "PP" from "PP-12"), like Jira projects do
const projColor = slug => PALETTE[[...slug].reduce((h,c)=>(h*31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE.length];
const projKey = b => (String((b.tickets[0]||{}).id || "").match(/^[A-Za-z]+/) || [""])[0].toUpperCase();
const projLead = b => Object.keys(b.team || {}).find(n => n !== "Everyone") || "";
const norm = s => String(s || "").toLowerCase();
function showMsg(html){ $("#msg").innerHTML = html; $("#msg").hidden = false; }

const params = new URLSearchParams(location.search);
if(params.get("board")) loadBoard(params.get("board"));
else if(params.get("table")) loadTable(params.get("table"));
else loadLanding();

/* Landing: a Jira-style projects directory */
async function loadLanding(){
  let m;
  try { m = await getJSON("tables.json"); }
  catch { showMsg("Couldn't load the list of projects. Refresh to try again"); return; }
  document.title = m.title || "Projects";
  // Several tables share a board, so list each board once with its table numbers
  const groups = [];
  for(const t of m.tables){
    const g = groups.find(x => x.board === t.board);
    g ? g.tables.push(t.table) : groups.push({board:t.board, tables:[t.table]});
  }
  const ranges = ns => ns.sort((a,b)=>a-b).reduce((out,n)=>{
    const last = out[out.length-1];
    last && n === last[1]+1 ? last[1] = n : out.push([n,n]); return out;
  },[]).map(([a,b]) => a===b ? `${a}` : `${a}–${b}`).join(", ");
  const boards = await Promise.all(groups.map(g => slugOk(g.board) ? getJSON(`boards/${g.board}.json`).catch(()=>null) : null));
  const rows = groups.map((t,i)=>{
    const b = boards[i];
    if(!b) return `<tr class="soon"><td class="tno">${esc(ranges(t.tables))}</td><td colspan="5">Coming soon</td></tr>`;
    const p = b.project, key = projKey(b), lead = projLead(b);
    const late = b.tickets.filter(x => x.due && x.status !== "Done" && D(x.due) < D(p.today)).length;
    const blocked = b.tickets.filter(x => x.status === "Blocked").length;
    const left = days(p.today, p.deadline);
    const q = norm([...t.tables.map(n=>`table ${n}`), p.name, p.product, key, lead].join(" "));
    return `<tr data-href="?board=${esc(t.board)}" data-q="${esc(q)}">
      <td class="tno">${esc(ranges(t.tables))}</td>
      <td><a class="pcell" href="?board=${esc(t.board)}"><span class="pav sm" style="background:${projColor(t.board)}">${esc(p.name[0])}</span><span><b>${esc(p.name)}</b><small>${esc(p.product || "")}</small></span></a></td>
      <td class="key">${esc(key)}</td>
      <td class="lead"><span class="who"><span class="av" style="background:${PALETTE[0]}">${esc(lead[0]||"?")}</span>${esc(lead)}</span></td>
      <td class="due"><b>${esc(p.deadlineLabel || "Deadline")}</b><small>${fmt(p.deadline)}, ${left} days</small></td>
      <td class="health">${late ? `<span class="chip late">${late} overdue</span>` : ""}${blocked ? `<span class="chip blk">${blocked} blocked</span>` : ""}</td>
    </tr>`;
  }).join("");
  $("#landing").innerHTML = `<div class="lhead"><h1>Projects</h1><p class="sub">${esc(m.subtitle||"")}</p></div>
    <div class="dirwrap"><table class="dir"><thead><tr><th>Tables</th><th>Name</th><th class="key">Key</th><th class="lead">Lead</th><th>Due</th><th>Health</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  $("#landing").className = "landing";
  $("#landing").hidden = false;
  $("#q").placeholder = "Search projects";
  $("#q").addEventListener("input", ()=>{
    const q = norm($("#q").value.trim());
    document.querySelectorAll(".dir tbody tr[data-q]").forEach(r => r.hidden = q && !r.dataset.q.includes(q));
  });
  $("#landing").addEventListener("click", e=>{
    const r = e.target.closest("tr[data-href]");
    if(r && !e.target.closest("a")) location.href = r.dataset.href;
  });
}

// ?table=N redirects to that table's board, so a QR code can stay put if a board is renamed
async function loadTable(n){
  try {
    const m = await getJSON("tables.json");
    const t = m.tables.find(x => String(x.table) === n);
    if(t && slugOk(t.board)){ location.replace(`?board=${t.board}`); return; }
  } catch {}
  showMsg(`Table ${esc(n)} doesn't have a board yet. <a href="./">See all tables</a>`);
}

async function loadBoard(slug){
  let data;
  try {
    if(!slugOk(slug)) throw 0;
    data = await getJSON(`boards/${slug}.json`);
  } catch {
    showMsg(`There's no board called "${esc(slug)}". <a href="./">See all tables</a>`);
    return;
  }
  // The starter prompt is optional; the board still works without it
  const prompt = await fetch("starter-prompt.txt", {cache:"no-cache"}).then(r => r.ok ? r.text() : "").catch(() => "");
  // The show-and-tell deck link lives in tables.json so it can be added without touching code
  const site = await getJSON("tables.json").catch(() => ({}));
  if(site.shareUrl && /^https:\/\//.test(site.shareUrl)){
    $("#sharebtn").href = $("#sharelink").href = site.shareUrl;
    $("#sharebox").hidden = $("#sharelink").hidden = false;
  }
  $("#app").hidden = false;
  initBoard(slug, data, prompt);
}

/* Board page */
function initBoard(SLUG, DATA, PROMPT){
  const PROJECT = DATA.project;
  const T = DATA.tickets;
  const SLACK = DATA.slack || [];
  const NOTES = DATA.notes || {};
  const PEOPLE = {};
  Object.entries(DATA.team || {}).forEach(([n,p],i)=>{ PEOPLE[n] = {role:p.role||"", color:p.color||PALETTE[i % PALETTE.length]}; });
  PEOPLE.Everyone = {role:"",color:"#334155"};
  const LABEL = PROJECT.deadlineLabel || "Deadline";

  const byId = Object.fromEntries(T.map(t=>[t.id,t]));
  const colOf = t => (COLUMNS.find(c=>c.key===t.status) || COLUMNS[0]).color;
  const isLate = t => t.due && t.status!=="Done" && D(t.due) < D(PROJECT.today);
  const initials = n => n ? (n==="Everyone" ? "All" : n[0]) : "?";
  const avatar = n => `<span class="av" style="background:${n && PEOPLE[n] ? PEOPLE[n].color : "#9ca3af"}" title="${esc(n||"No owner")}">${esc(initials(n))}</span>`;
  const waitingStr = t => t.waiting ? t.waiting.join(", ") : (t.waitingText || "");
  const idNum = id => +(String(id).match(/\d+/) || [0])[0];
  // commentCount can be bigger than the comments shown (a ticket "with 43 comments" only shows a few)
  const comments = t => t.comments || [];
  const commentTotal = t => Math.max(t.commentCount || 0, comments(t).length);
  const hasSlack = SLACK.length > 0;
  const hasNotes = !!(NOTES.title || (NOTES.bullets && NOTES.bullets.length));

  document.title = PROJECT.name;
  $("#pname").textContent = PROJECT.name;
  $("#crumbproj").textContent = PROJECT.name;
  $("#spname").textContent = PROJECT.name;
  $("#spsub").textContent = `Project ${projKey(DATA)}`.trim();
  $("#pav").textContent = PROJECT.name[0];
  $("#pav").style.background = projColor(SLUG);
  $("#slackcount").textContent = SLACK.length || "";
  $("#psub").textContent = PROJECT.product || PROJECT.company;
  if(PROJECT.brief){ $("#brief").textContent = PROJECT.brief; $("#brief").hidden = false; }
  const TEAM = Object.entries(DATA.team || {}).filter(([,p]) => p.role);
  $("#teamcount").textContent = TEAM.length;
  $("#teamlist").innerHTML = TEAM.map(([n,p]) => `<li>${avatar(n)}<span><b>${esc(n)}</b> ${esc(p.role)}</span></li>`).join("");
  // Open on wide screens, collapsed on phones
  $("#teampanel").open = matchMedia("(min-width: 761px)").matches;
  const left = days(PROJECT.today, PROJECT.deadline);
  $("#launchpill").textContent = `${LABEL} ${fmt(PROJECT.deadline)}, ` +
    (left > 1 ? `${left} days away` : left === 1 ? "tomorrow" : left === 0 ? "today" : `${-left} days ago`);

  const qOf = t => norm([t.id, t.title, t.owner, t.status, t.desc].join(" "));
  /* Board */
  // Ticket ids in "Waiting on" jump to that ticket, so a chain of blockers can be followed from the card
  const waitChip = t => t.waiting ? `<span class="chip wait">Waiting on ${t.waiting.map(w=>byId[w]
      ? `<span class="jump" data-jump="${esc(w)}" title="${esc(byId[w].title)}">${esc(w)}</span>` : esc(w)).join(", ")}</span>`
    : t.waitingText ? `<span class="chip wait">Waiting on ${esc(t.waitingText)}</span>` : "";
  function renderBoard(){
    $("#board").innerHTML = COLUMNS.map(c=>{
      const cards = T.filter(t=>t.status===c.key);
      return `<div class="column"><div class="colhead"><span class="dot" style="background:${c.color}"></span>${c.key} <span class="count">${cards.length}</span></div>${
        cards.map(t=>`<button class="card${isLate(t)?" late":""}" data-id="${esc(t.id)}" data-q="${esc(qOf(t))}">
          <div class="cid">${esc(t.id)}</div>
          <div class="ctitle">${esc(t.title)}</div>
          <div class="meta">${avatar(t.owner)}
            ${t.due ? `<span class="chip ${isLate(t)?"late":""}">${isLate(t)?"Overdue, was due ":"Due "}${fmt(t.due)}</span>` : `<span class="chip">No due date</span>`}
            ${waitChip(t)}
            ${t.note ? `<span class="note">${esc(t.note)}</span>` : ""}
            ${commentTotal(t) ? `<span class="ccount" title="${commentTotal(t)} comments">&#128172; ${commentTotal(t)}</span>` : ""}
          </div></button>`).join("")}</div>`;
    }).join("");
  }

  /* Timeline: starts the Monday before the earliest recent ticket, ends a week after the deadline or last due date.
     Tickets that ended well before that (stale work) show as a note at the left edge */
  const recent = T.filter(t=>t.start && t.due && days(t.due, PROJECT.today) <= 90).map(t=>t.start);
  let RS = [PROJECT.today, ...recent].sort()[0];
  RS = addDays(RS, -((D(RS).getDay()+6) % 7));
  const RE = addDays([PROJECT.deadline, ...T.map(t=>t.due).filter(Boolean)].sort().pop(), 7);
  function renderTimeline(){
    const W = innerWidth < 600 ? 8 : 11;
    const lx = innerWidth < 600 ? 150 : 230;
    const total = days(RS,RE)+1, trackW = total*W;
    const order = [...T].sort((a,b)=>(a.start||"9")<(b.start||"9")?-1:1);
    let weeks = "";
    for(let d=0; d<total; d+=7) weeks += `<div class="wk" style="left:${d*W}px">${fmt(addDays(RS,d))}</div>`;
    const xOf = s => days(RS,s)*W;
    let rows = `<div class="tlrow tlhead"><div class="tllabel">Ticket</div><div class="tltrack" style="width:${trackW}px;height:36px">${weeks}</div></div>`;
    for(const t of order){
      let inner = "";
      if(!t.start || !t.due){ inner = `<span class="nodates">No dates set</span>`; }
      else if(D(t.due) < D(RS)){
        inner = `<span class="offleft">Started ${fmtY(t.start)}, was due ${fmtY(t.due)}</span>`;
        if(t.status!=="Done") inner += `<div class="overdue" style="left:0;width:${xOf(PROJECT.today)}px"></div>`;
      } else {
        const x = Math.max(0,xOf(t.start)), w = Math.max(W, xOf(t.due)+W - x);
        inner = `<div class="bar" style="left:${x}px;width:${w}px;background:${colOf(t)}">${t.note?esc(t.note):""}</div>`;
        if(isLate(t)) inner += `<div class="overdue" style="left:${x+w}px;width:${xOf(PROJECT.today)-(x+w)+W}px"></div>`;
      }
      rows += `<div class="tlrow" data-q="${esc(qOf(t))}"><button class="tllabel" data-id="${esc(t.id)}">${avatar(t.owner)}<span class="t"><b>${esc(t.id)}</b> ${esc(t.title)}</span></button><div class="tltrack" style="width:${trackW}px">${inner}</div></div>`;
    }
    const lines = [
      {d:PROJECT.today,label:"Today",color:"var(--ink)"},
      {d:PROJECT.deadline,label:LABEL,color:"var(--launch)"}
    ].map(l=>`<div class="vline" style="left:${lx+xOf(l.d)+W/2}px;background:${l.color}"></div><div class="vlabel" style="left:${lx+xOf(l.d)+W/2+3}px;background:${l.color};color:var(--panel)">${esc(l.label)}</div>`).join("");
    $("#tl").style.width = (lx+trackW)+"px";
    $("#tl").innerHTML = rows + lines;
    $("#legend").innerHTML = COLUMNS.map(c=>`<span><i style="background:${c.color}"></i>${c.key}</span>`).join("") +
      `<span><i style="background:repeating-linear-gradient(135deg,var(--late) 0 3px,transparent 3px 6px)"></i>Past due, still open</span>`;
  }

  /* List + Issues */


  /* Slack */
  const mentions = s => esc(s).replace(/(^|[\s(])@([A-Za-z][\w-]*)/g, (m,pre,n)=>`${pre}<span class="mention">@${n}</span>`);
  function renderSlack(){
    const chan = PROJECT.slackChannel || SLUG;
    $("#slack").innerHTML = `<div class="chanhead"># ${esc(chan)} <span>${SLACK.length} message${SLACK.length===1?"":"s"}</span></div>` +
      (hasSlack ? `<div class="msgs">${SLACK.map(m=>`<div class="smsg">${avatar(m.author)}<div><div><span class="sname">${esc(m.author||"Unknown")}</span><span class="stime">${esc(m.time||"")}</span></div><div class="stext">${mentions(m.text||"")}</div></div></div>`).join("")}</div>`
                : `<div class="empty">No messages in this channel</div>`);
  }

  /* Meeting notes */
  function renderNotes(){
    if(!hasNotes){ $("#notes").innerHTML = `<div class="empty">No meeting notes for this project</div>`; return; }
    const att = NOTES.attendees && NOTES.attendees.length ? NOTES.attendees.join(", ") : "";
    $("#notes").innerHTML = `<h2>${esc(NOTES.title||"Meeting notes")}</h2>
      <div class="docmeta">${NOTES.date?`<div>${esc(/^\d{4}-\d{2}-\d{2}$/.test(NOTES.date)?fmtY(NOTES.date):NOTES.date)}</div>`:""}${att?`<div>Attendees: ${esc(att)}</div>`:""}</div>
      <ul>${(NOTES.bullets||[]).map(b=>`<li>${mentions(b)}</li>`).join("")}</ul>`;
  }

  /* Drawer */
  function openTicket(id){
    const t = byId[id]; if(!t) return;
    const wait = t.waiting ? t.waiting.map(w=>`<button class="link" data-jump="${esc(w)}">${esc(w)} ${esc(byId[w] ? byId[w].title : "")}</button>`).join("<br>") : esc(t.waitingText||"Nothing");
    const person = t.owner ? `${esc(t.owner)}${PEOPLE[t.owner]&&PEOPLE[t.owner].role?`, ${esc(PEOPLE[t.owner].role)}`:""}` : "No owner";
    $("#drawerroot").innerHTML = `<div class="scrim" data-close></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="dtitle">
      <button class="close" data-close>Close</button>
      <div class="cid">${esc(t.id)}</div>
      <h2 id="dtitle">${esc(t.title)}</h2>
      <dl>
        <dt>Status</dt><dd>${esc(t.status)}${t.note?`, ${esc(t.note)}`:""}</dd>
        <dt>Owner</dt><dd>${person}</dd>
        <dt>Start</dt><dd>${t.start?fmtY(t.start):"Not set"}</dd>
        <dt>Due</dt><dd>${t.due?fmtY(t.due):"Not set"}${isLate(t)?' <span class="chip late">Overdue</span>':""}</dd>
        <dt>Waiting on</dt><dd>${wait}</dd>
        <dt>Last updated</dt><dd>${esc(t.updated)}</dd>
      </dl>
      <div class="desc">${t.desc?esc(t.desc):"No description"}</div>
      ${commentTotal(t) ? `<h3 class="chead">Comments <span class="count">${commentTotal(t)}</span></h3>
      ${comments(t).map(c=>`<div class="smsg">${avatar(c.author)}<div><div><span class="sname">${esc(c.author||"Unknown")}</span><span class="stime">${esc(c.time||"")}</span></div><div class="stext">${mentions(c.text||"")}</div></div></div>`).join("")}
      ${commentTotal(t) > comments(t).length ? `<p class="more-c">${commentTotal(t) - comments(t).length} older comments hidden. Showing the latest ${comments(t).length}</p>` : ""}` : ""}
    </aside>`;
    $("#drawerroot .close").focus();
  }
  function closeDrawer(){ $("#drawerroot").innerHTML = ""; }
  document.addEventListener("click", e=>{
    const jump = e.target.closest("[data-jump]"); if(jump){ openTicket(jump.dataset.jump); return; }
    const card = e.target.closest("[data-id]"); if(card){ openTicket(card.dataset.id); return; }
    if(e.target.closest("[data-close]")) closeDrawer();
  });
  document.addEventListener("keydown", e=>{
    if(e.key==="Escape") closeDrawer();
    if(e.key==="Enter" && e.target.matches("tr[data-id]")) openTicket(e.target.dataset.id);
  });

  /* Raw data */
  // Reads like three raw exports from different systems: tracker, Slack, meeting notes
  function asExport(){
    const L = [];
    L.push("=== PROJECT BRIEF ===", PROJECT.brief || PROJECT.product || "", `Today: ${PROJECT.today}. ${LABEL}: ${PROJECT.deadline}`, "");
    L.push("=== TEAM ===", ...TEAM.map(([n,p]) => `${n}: ${p.role}`), "");
    L.push("=== EXPORT 1 OF 3: PROJECT TRACKER (all tickets) ===");
    for(const t of T){
      L.push(`${t.id} | ${t.title} | Status: ${t.status}${t.note ? ` ("${t.note}")` : ""} | Owner: ${t.owner || "None"} | Start: ${t.start || "Not set"} | Due: ${t.due || "Not set"} | Waiting on: ${waitingStr(t) || "Nothing"} | Last updated: ${t.updated}`);
      L.push(`Description: ${t.desc || "None"}`);
      if(commentTotal(t)){
        L.push(`Comments (${commentTotal(t)}):`, ...comments(t).map(c => `  ${c.author} (${c.time}): ${c.text}`));
      }
      L.push("");
    }
    L.push("=== EXPORT 2 OF 3: SLACK CHANNEL ===", ...SLACK.map(m => `${m.author} (${m.time}): ${m.text}`), "");
    L.push("=== EXPORT 3 OF 3: MEETING NOTES ===");
    if(hasNotes){
      L.push([NOTES.title, NOTES.date].filter(Boolean).join(", "));
      if(NOTES.attendees && NOTES.attendees.length) L.push(`Attendees: ${NOTES.attendees.join(", ")}`);
      L.push(...(NOTES.bullets || []).map(b => `- ${b}`));
    } else L.push("None");
    return L.join("\n") + "\n";
  }
  function asCSV(){
    const cols = ["id","title","status","status_note","owner","start","due","waiting_on","last_updated","description","comment_count","comments"];
    const q = v => `"${String(v??"").replace(/"/g,'""')}"`;
    return [cols.join(",")].concat(T.map(t=>[t.id,t.title,t.status,t.note,t.owner,t.start,t.due,waitingStr(t),t.updated,t.desc,commentTotal(t),comments(t).map(c=>`${c.author}: ${c.text}`).join(" | ")].map(q).join(","))).join("\n");
  }
  function asJSON(){
    const team = Object.fromEntries(Object.entries(PEOPLE).filter(([,p])=>p.role).map(([n,p])=>[n,{role:p.role}]));
    return JSON.stringify({project:PROJECT,brief:PROJECT.brief||null,team,
      tickets:T.map(t=>({id:t.id,title:t.title,status:t.status,status_note:t.note||null,owner:t.owner||null,start:t.start||null,due:t.due||null,waiting_on:waitingStr(t)||null,last_updated:t.updated,description:t.desc||null,comment_count:commentTotal(t),comments:comments(t)})),
      slack:SLACK, notes:hasNotes?NOTES:null},null,2);
  }
  const FMTS = {md:{fn:asExport,ext:"txt",type:"text/plain"},csv:{fn:asCSV,ext:"csv",type:"text/csv"},json:{fn:asJSON,ext:"json",type:"application/json"}};
  let cur = "md";
  function renderRaw(){
    $("#raw").value = FMTS[cur].fn();
    $("#fmtnote").hidden = cur !== "csv";
  }
  document.querySelectorAll("[data-fmt]").forEach(b=>b.addEventListener("click",()=>{
    cur = b.dataset.fmt;
    document.querySelectorAll("[data-fmt]").forEach(x=>x.setAttribute("aria-pressed", x===b?"true":"false"));
    renderRaw();
  }));
  /* Copy for AI: one paste with the starter prompt and all the data */
  function asAIPrompt(){
    const tpl = PROMPT || "Below are three raw exports from a made-up project that's in trouble. What's really going wrong?\n\n{{data}}";
    const data = asExport();
    return tpl.includes("{{data}}") ? tpl.replace(/\{\{data\}\}/g, data) : tpl + "\n\n" + data;
  }
  async function copyText(text, msg){
    try { await navigator.clipboard.writeText(text); toast(msg); }
    catch {
      const ta = Object.assign(document.createElement("textarea"), {value:text});
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast(msg); } catch { toast("Copy didn't work. Use Other formats and copy by hand"); }
      ta.remove();
    }
  }
  $("#aibtn").addEventListener("click", ()=>copyText(asAIPrompt(), "Copied. Paste it into your AI tool"));
  $("#heroai").addEventListener("click", ()=>copyText(asAIPrompt(), "Copied. Paste it into Claude"));

  function toast(msg){ const el=$("#toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),1800); }
  $("#copybtn").addEventListener("click", ()=>copyText($("#raw").value, "Copied"));
  $("#dlbtn").addEventListener("click", ()=>{
    const url = URL.createObjectURL(new Blob([FMTS[cur].fn()], {type:FMTS[cur].type+";charset=utf-8"}));
    const a = Object.assign(document.createElement("a"), {href:url, download:`${SLUG}.${FMTS[cur].ext}`});
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  });

  /* Tabs */
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(x=>x.setAttribute("aria-selected", x===b?"true":"false"));
    document.querySelectorAll(".view").forEach(v=>v.hidden = v.id!=="view-"+b.dataset.view);
    $("#crumbview").textContent = b.textContent.replace(/\d+/g,"").trim();
    if(b.dataset.view==="timeline"){ renderTimeline(); applySearch(); }
  }));
  // Search filters tasks on the Board and Gantt; typing from another view jumps to the Board
  $("#q").placeholder = "Search tasks";
  function applySearch(){
    const q = norm($("#q").value.trim());
    document.querySelectorAll("#board .card, #tl .tlrow[data-q]").forEach(el => el.hidden = q && !el.dataset.q.includes(q));
  }
  $("#q").addEventListener("input", ()=>{
    const cur = document.querySelector('.tab[aria-selected="true"]').dataset.view;
    if(!["board","timeline"].includes(cur)) document.querySelector('.tab[data-view="board"]').click();
    applySearch();
  });
  addEventListener("resize", ()=>{ if(!$("#view-timeline").hidden){ renderTimeline(); applySearch(); } });

  renderBoard(); renderSlack(); renderNotes(); renderRaw();
}
