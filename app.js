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
function showMsg(html){ $("#msg").innerHTML = html; $("#msg").hidden = false; }

const params = new URLSearchParams(location.search);
if(params.get("board")) loadBoard(params.get("board"));
else if(params.get("table")) loadTable(params.get("table"));
else loadLanding();

/* Landing */
async function loadLanding(){
  let m;
  try { m = await getJSON("tables.json"); }
  catch { showMsg("Couldn't load the list of tables. Refresh to try again"); return; }
  document.title = m.title || "Project boards";
  const boards = await Promise.all(m.tables.map(t => slugOk(t.board) ? getJSON(`boards/${t.board}.json`).catch(()=>null) : null));
  $("#landing").innerHTML = `<h1>${esc(m.title||"")}</h1><p class="sub">${esc(m.subtitle||"")}</p><ul class="tables">${
    m.tables.map((t,i)=>{
      const b = boards[i];
      const num = `<span class="tnum">Table<b>${esc(t.table)}</b></span>`;
      if(!b) return `<li><div class="tablecard soon">${num}<div><div class="tname">Coming soon</div></div></div></li>`;
      return `<li><a class="tablecard" href="?board=${esc(t.board)}">${num}<div><div class="tname">${esc(b.project.name)}</div><div class="tdesc">${esc(b.project.company)}</div></div></a></li>`;
    }).join("")}</ul>`;
  $("#landing").className = "landing";
  $("#landing").hidden = false;
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
  // Starter prompt and site settings are optional; the board still works without them
  const [prompt, site] = await Promise.all([
    fetch("starter-prompt.txt", {cache:"no-cache"}).then(r => r.ok ? r.text() : "").catch(() => ""),
    getJSON("tables.json").catch(() => ({}))
  ]);
  $("#app").hidden = false;
  initBoard(slug, data, prompt, site);
}

/* Board page */
function initBoard(SLUG, DATA, PROMPT, SITE){
  const PROJECT = DATA.project;
  const T = DATA.tickets;
  const SLACK = DATA.slack || [];
  const NOTES = DATA.notes || {};
  const PEOPLE = {};
  Object.entries(DATA.team || {}).forEach(([n,p],i)=>{ PEOPLE[n] = {role:p.role||"", color:p.color||PALETTE[i % PALETTE.length]}; });
  PEOPLE.Everyone = PEOPLE.Everyone || {role:"",color:"#334155"};
  const LABEL = PROJECT.deadlineLabel || "Deadline";

  const byId = Object.fromEntries(T.map(t=>[t.id,t]));
  const colOf = t => (COLUMNS.find(c=>c.key===t.status) || COLUMNS[0]).color;
  const isLate = t => t.due && t.status!=="Done" && D(t.due) < D(PROJECT.today);
  const initials = n => n ? (n==="Everyone" ? "All" : n[0]) : "?";
  const avatar = n => `<span class="av" style="background:${n && PEOPLE[n] ? PEOPLE[n].color : "#9ca3af"}" title="${esc(n||"No owner")}">${esc(initials(n))}</span>`;
  const waitingStr = t => t.waiting ? t.waiting.join(", ") : (t.waitingText || "");
  const idNum = id => +(String(id).match(/\d+/) || [0])[0];
  const hasSlack = SLACK.length > 0;
  const hasNotes = !!(NOTES.title || (NOTES.bullets && NOTES.bullets.length));

  document.title = PROJECT.name;
  $("#pname").textContent = PROJECT.name;
  $("#psub").textContent = PROJECT.company;
  const left = days(PROJECT.today, PROJECT.deadline);
  $("#launchpill").textContent = `${LABEL} ${fmt(PROJECT.deadline)}, ` +
    (left > 1 ? `${left} days away` : left === 1 ? "tomorrow" : left === 0 ? "today" : `${-left} days ago`);

  /* Board */
  function renderBoard(){
    $("#board").innerHTML = COLUMNS.map(c=>{
      const cards = T.filter(t=>t.status===c.key);
      return `<div class="column"><div class="colhead"><span class="dot" style="background:${c.color}"></span>${c.key} <span class="count">${cards.length}</span></div>${
        cards.map(t=>`<button class="card" data-id="${esc(t.id)}">
          <div class="cid">${esc(t.id)}</div>
          <div class="ctitle">${esc(t.title)}</div>
          <div class="meta">${avatar(t.owner)}
            ${t.due ? `<span class="chip ${isLate(t)?"late":""}">${isLate(t)?"Overdue, was due ":"Due "}${fmt(t.due)}</span>` : `<span class="chip">No due date</span>`}
            ${waitingStr(t) ? `<span class="chip wait">Waiting on ${esc(waitingStr(t))}</span>` : ""}
            ${t.note ? `<span class="note">${esc(t.note)}</span>` : ""}
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
      rows += `<div class="tlrow"><button class="tllabel" data-id="${esc(t.id)}">${avatar(t.owner)}<span class="t"><b>${esc(t.id)}</b> ${esc(t.title)}</span></button><div class="tltrack" style="width:${trackW}px">${inner}</div></div>`;
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
  const dueChip = t => t.due ? `<span class="chip ${isLate(t)?"late":""}">${isLate(t)?"Overdue, ":""}${fmt(t.due)}</span>` : `<span class="chip">No date</span>`;
  function renderList(){
    $("#list").innerHTML = COLUMNS.map(c=>{
      const r = T.filter(t=>t.status===c.key);
      return `<div class="lsec"><span class="dot" style="background:${c.color}"></span>${c.key} <span class="count">${r.length}</span></div>` +
        r.map(t=>`<button class="lrow" data-id="${esc(t.id)}"><span class="circ ${t.status==="Done"?"done":""}"></span><span>${esc(t.title)} <span class="cid">${esc(t.id)}</span></span><span class="lown">${avatar(t.owner)}${esc(t.owner||"No owner")}</span><span>${dueChip(t)}</span></button>`).join("");
    }).join("");
  }
  function renderIssues(){
    const sorted = [...T].sort((a,b)=>idNum(a.id)-idNum(b.id) || String(a.id).localeCompare(b.id));
    $("#issues").innerHTML = sorted.map(t=>`<tr data-id="${esc(t.id)}" tabindex="0"><td class="key">${esc(t.id)}</td><td>${esc(t.title)}</td><td><span class="loz" style="--c:${colOf(t)}">${esc(t.status)}</span></td><td><span class="who">${avatar(t.owner)}${esc(t.owner||"Unassigned")}</span></td><td>${dueChip(t)}</td><td class="muted">${esc(t.updated)}</td></tr>`).join("");
  }

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
    </aside>`;
    $("#drawerroot .close").focus();
  }
  function closeDrawer(){ $("#drawerroot").innerHTML = ""; }
  document.addEventListener("click", e=>{
    const card = e.target.closest("[data-id]"); if(card){ openTicket(card.dataset.id); return; }
    const jump = e.target.closest("[data-jump]"); if(jump){ openTicket(jump.dataset.jump); return; }
    if(e.target.closest("[data-close]")) closeDrawer();
  });
  document.addEventListener("keydown", e=>{
    if(e.key==="Escape") closeDrawer();
    if(e.key==="Enter" && e.target.matches("tr[data-id]")) openTicket(e.target.dataset.id);
  });

  /* Raw data */
  function asMarkdown(){
    let s = `# ${PROJECT.name}\n\nCompany: ${PROJECT.company}\nProduct: ${PROJECT.product}\nToday: ${fmtY(PROJECT.today)}\n${LABEL}: ${fmtY(PROJECT.deadline)}. ${PROJECT.context||""}\n\n## Team\n`;
    for(const [n,p] of Object.entries(PEOPLE)) if(p.role) s += `- ${n}: ${p.role}\n`;
    s += `\n# Tickets\n`;
    for(const c of COLUMNS){
      s += `\n## ${c.key}\n`;
      for(const t of T.filter(x=>x.status===c.key)){
        s += `\n${t.id}: ${t.title}\nOwner: ${t.owner||"None"}\nStart: ${t.start||"Not set"}\nDue: ${t.due||"Not set"}\n`;
        if(t.note) s += `Status note: ${t.note}\n`;
        if(waitingStr(t)) s += `Waiting on: ${waitingStr(t)}\n`;
        s += `Last updated: ${t.updated}\nDescription: ${t.desc||"None"}\n`;
      }
    }
    if(hasSlack){
      s += `\n# Slack: #${PROJECT.slackChannel || SLUG}\n\n`;
      for(const m of SLACK) s += `[${m.time||""}] ${m.author||"Unknown"}: ${m.text||""}\n`;
    }
    if(hasNotes){
      s += `\n# Meeting notes: ${NOTES.title||""}\n\n`;
      if(NOTES.date) s += `Date: ${NOTES.date}\n`;
      if(NOTES.attendees && NOTES.attendees.length) s += `Attendees: ${NOTES.attendees.join(", ")}\n`;
      s += "\n" + (NOTES.bullets||[]).map(b=>`- ${b}`).join("\n") + "\n";
    }
    return s;
  }
  function asCSV(){
    const cols = ["id","title","status","status_note","owner","start","due","waiting_on","last_updated","description"];
    const q = v => `"${String(v??"").replace(/"/g,'""')}"`;
    return [cols.join(",")].concat(T.map(t=>[t.id,t.title,t.status,t.note,t.owner,t.start,t.due,waitingStr(t),t.updated,t.desc].map(q).join(","))).join("\n");
  }
  function asJSON(){
    const team = Object.fromEntries(Object.entries(PEOPLE).filter(([,p])=>p.role).map(([n,p])=>[n,{role:p.role}]));
    return JSON.stringify({project:PROJECT,team,
      tickets:T.map(t=>({id:t.id,title:t.title,status:t.status,status_note:t.note||null,owner:t.owner||null,start:t.start||null,due:t.due||null,waiting_on:waitingStr(t)||null,last_updated:t.updated,description:t.desc||null})),
      slack:SLACK, notes:hasNotes?NOTES:null},null,2);
  }
  const FMTS = {md:{fn:asMarkdown,ext:"md",type:"text/markdown"},csv:{fn:asCSV,ext:"csv",type:"text/csv"},json:{fn:asJSON,ext:"json",type:"application/json"}};
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
  /* Step 1: the team's sentence unlocks Copy for AI */
  const KEY = "sentence:" + SLUG;
  const store = {
    get(){ try { return localStorage.getItem(KEY) || ""; } catch { return ""; } },
    set(v){ try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch {} }
  };
  const sentence = () => $("#sentence").value.trim().replace(/\.$/, "");
  function setLocked(locked){
    $("#sentence").readOnly = locked;
    $("#lockbtn").textContent = locked ? "Edit our sentence" : "Lock in our sentence";
    $("#lockbtn").classList.toggle("primary", !locked);
    $("#locked").hidden = locked;
    $("#unlocked").hidden = !locked;
    const url = SITE.submitUrl;
    $("#submitlink").hidden = !(locked && url);
    if(locked && url) $("#submitlink").href = url
      .replace("{board}", encodeURIComponent(SLUG))
      .replace("{project}", encodeURIComponent(PROJECT.name))
      .replace("{sentence}", encodeURIComponent(sentence()));
  }
  $("#lockbtn").addEventListener("click", ()=>{
    if(!$("#sentence").readOnly){
      if(sentence().length < 5){ toast("Finish the sentence first"); $("#sentence").focus(); return; }
      store.set(sentence()); setLocked(true);
    } else { setLocked(false); $("#sentence").focus(); }
  });
  if(store.get()){ $("#sentence").value = store.get(); setLocked(true); }

  /* Step 2: one paste with the starter prompt, the sentence, and all the data */
  function asAIPrompt(){
    const tpl = PROMPT || "Below is a made-up project. Our team thinks the thing that will sink it is {{sentence}}. What do you think, and what did we miss?\n\n{{data}}";
    const data = "---\n\n" + asMarkdown();
    const out = tpl.replace(/\{\{sentence\}\}/g, sentence());
    return out.includes("{{data}}") ? out.replace(/\{\{data\}\}/g, data) : out + "\n\n" + data;
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
    $("#hint").hidden = !["board","list","issues","timeline"].includes(b.dataset.view);
    if(b.dataset.view==="timeline") renderTimeline();
  }));
  addEventListener("resize", ()=>{ if(!$("#view-timeline").hidden) renderTimeline(); });

  renderBoard(); renderList(); renderIssues(); renderSlack(); renderNotes(); renderRaw();
}
