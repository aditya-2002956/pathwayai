import { useState, useRef, useCallback, useEffect } from "react";

// ── Demo Data ─────────────────────────────────────────────────────────────────

const DEMO_RESULT = {
  candidateName: "Alex Chen",
  targetRole: "Senior Product Manager",
  readinessScore: 62,
  timeToCompetency: "4–5 weeks",
  resumeSkills: [
    { skill: "SQL", level: "expert", yearsExp: 5, confidence: "high" },
    { skill: "Figma", level: "intermediate", yearsExp: 3, confidence: "high" },
    { skill: "Python", level: "beginner", yearsExp: 1, confidence: "medium" },
    { skill: "Agile / Scrum", level: "expert", yearsExp: 4, confidence: "high" },
    { skill: "A/B Testing", level: "intermediate", yearsExp: 2, confidence: "medium" },
    { skill: "Stakeholder Mgmt", level: "intermediate", yearsExp: 3, confidence: "low" },
  ],
  requiredSkills: [
    { skill: "Product Strategy", importance: "critical" },
    { skill: "OKR Frameworks", importance: "critical" },
    { skill: "B2B SaaS Metrics", importance: "critical" },
    { skill: "SQL", importance: "important" },
    { skill: "Roadmapping Tools", importance: "important" },
    { skill: "Executive Storytelling", importance: "important" },
  ],
  gaps: [
    { skill: "Product Strategy", importance: "critical", currentLevel: "none", targetLevel: "expert" },
    { skill: "OKR Frameworks", importance: "critical", currentLevel: "beginner", targetLevel: "intermediate" },
    { skill: "B2B SaaS Metrics", importance: "critical", currentLevel: "none", targetLevel: "intermediate" },
    { skill: "Executive Storytelling", importance: "important", currentLevel: "beginner", targetLevel: "intermediate" },
    { skill: "Roadmapping Tools", importance: "important", currentLevel: "none", targetLevel: "beginner" },
  ],
  strengths: [
    "5 years SQL expertise — data-driven decisions from day one, no ramp-up needed",
    "Strong Agile background means sprint ceremonies and delivery cadences are already native",
    "A/B testing experience maps directly to the company's experimentation culture",
    "Figma fluency enables direct design collaboration without handoff friction",
  ],
  managerSummary: {
    hiringRisk: "medium",
    topConcern: "No prior exposure to Product Strategy or B2B SaaS Metrics — two core competencies for this role.",
    recommendation: "Approve hire with structured 5-week onboarding plan. Assign a PM mentor for the first sprint.",
    skillsToSkip: ["SQL workflows", "Agile ceremonies", "Figma collaboration"],
    keyRisks: [
      "May struggle with executive-level presentations in first 30 days",
      "B2B SaaS context (ARR, NRR, churn) will need active coaching",
    ],
    roiNote: "Without targeted onboarding, estimated 8–10 weeks to full productivity. With this pathway: 4–5 weeks. Saves ~5 weeks of sub-optimal output.",
  },
  pathway: [
    {
      phase: 1, title: "Foundation Sprint", duration: "Week 1–2",
      modules: [
        { id: "m1", name: "B2B SaaS Metrics Crash Course", description: "ARR, NRR, churn, LTV/CAC — every metric your team references daily.", type: "video", estimatedHours: 4, skills: ["B2B SaaS Metrics"] },
        { id: "m2", name: "OKR Workshop", description: "Write your first quarter's OKRs alongside the team. Learn the company goal-setting language.", type: "workshop", estimatedHours: 3, skills: ["OKR Frameworks"] },
        { id: "m3", name: "Roadmap Tool Onboarding", description: "Get up to speed on Linear / Productboard workflows and team conventions.", type: "reading", estimatedHours: 2, skills: ["Roadmapping Tools"] },
      ],
    },
    {
      phase: 2, title: "Strategy & Storytelling", duration: "Week 3",
      modules: [
        { id: "m4", name: "Product Strategy Fundamentals", description: "Jobs-to-be-done, positioning, anchoring every decision to company strategy.", type: "reading", estimatedHours: 5, skills: ["Product Strategy"] },
        { id: "m5", name: "Executive Storytelling Lab", description: "Write and present a mock product review. Get feedback from your PM lead.", type: "workshop", estimatedHours: 4, skills: ["Executive Storytelling"] },
      ],
    },
    {
      phase: 3, title: "Applied Practice", duration: "Week 4–5",
      modules: [
        { id: "m6", name: "Shadow & Co-pilot Sprint", description: "Shadow a senior PM through a full cycle, then co-own a feature end-to-end.", type: "project", estimatedHours: 10, skills: ["Product Strategy", "OKR Frameworks"] },
        { id: "m7", name: "30-Day Review Assessment", description: "Present your first product proposal to leadership for real feedback.", type: "assessment", estimatedHours: 3, skills: ["Executive Storytelling", "Product Strategy"] },
      ],
    },
  ],
};

// ── Typography ────────────────────────────────────────────────────────────────

const SANS = "'Inter', sans-serif";
const MONO = "'JetBrains Mono', monospace";

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg: "#0C0E12", surface: "#111318", surfaceHover: "#161920",
  border: "#1E2028", borderHover: "#2A2D38",
  text: "#F1F3F5", textMid: "#9CA3AF", textDim: "#6B7280", textFaint: "#374151",
  accent: "#3B82F6", accentBg: "#1E3A5F40", accentBorder: "#3B82F630", accentText: "#93C5FD",
  green: "#22C55E", greenText: "#86EFAC", greenBg: "#14532D30", greenBorder: "#14532D50",
  yellow: "#FCD34D", yellowBg: "#78350F30", yellowBorder: "#78350F50",
  red: "#FCA5A5", redBg: "#7F1D1D30", redBorder: "#7F1D1D50",
  purple: "#C4B5FD", purpleBg: "#2E106530", purpleBorder: "#4C1D9530",
};

const typeStyle = {
  video:      { color: "#93C5FD", bg: "#1E3A5F40", border: "#3B82F630" },
  workshop:   { color: "#FCD34D", bg: "#78350F30", border: "#78350F50" },
  reading:    { color: "#9CA3AF", bg: "#1E2028",   border: "#2A2D38"   },
  project:    { color: "#86EFAC", bg: "#14532D30", border: "#14532D50" },
  assessment: { color: "#FCA5A5", bg: "#7F1D1D30", border: "#7F1D1D50" },
};

// ── File helpers ──────────────────────────────────────────────────────────────

const readFileAsText   = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(f); });
const readFileAsBase64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });
const fileToBlock = async (file, label) => {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (isPdf) { const b64 = await readFileAsBase64(file); return { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 }, title: label }; }
  return { type: "text", text: `${label}:\n${await readFileAsText(file)}` };
};

const ANTHROPIC_API_KEY = import.meta?.env?.VITE_ANTHROPIC_API_KEY;

const ANALYSIS_PROMPT = `You are an expert L&D analyst. Analyze the resume and job description. Return ONLY valid JSON — no markdown, no backticks.
{"candidateName":"string","targetRole":"string","resumeSkills":[{"skill":"string","level":"beginner|intermediate|expert","yearsExp":0,"confidence":"high|medium|low"}],"requiredSkills":[{"skill":"string","importance":"critical|important|nice-to-have"}],"gaps":[{"skill":"string","importance":"critical|important|nice-to-have","currentLevel":"none|beginner|intermediate","targetLevel":"intermediate|expert"}],"strengths":["string"],"managerSummary":{"hiringRisk":"low|medium|high","topConcern":"string","recommendation":"string","skillsToSkip":["string"],"keyRisks":["string"],"roiNote":"string"},"pathway":[{"phase":1,"title":"string","duration":"string","modules":[{"id":"string","name":"string","description":"string","type":"video|workshop|reading|project|assessment","estimatedHours":0,"skills":["string"]}]}],"timeToCompetency":"string","readinessScore":0}
Assign module ids as m1, m2, etc. confidence = how explicitly the skill was demonstrated. roiNote = quantify time saved vs unstructured onboarding.`;

const QUIZ_PROMPT = `You are an adaptive skills diagnostic engine. Given a role/JD, generate exactly 8 diagnostic questions. Return ONLY valid JSON — no markdown, no backticks.
{"role":"string","questions":[{"id":1,"skill":"string","question":"string","options":[{"label":"string","level":"none|beginner|intermediate|expert"}]}]}`;

async function callClaude(system, userContent) {
  const content = typeof userContent === "string" ? [{ type: "text", text: userContent }] : userContent;
  const headers = { "Content-Type": "application/json" };
  if (ANTHROPIC_API_KEY) headers["x-api-key"] = ANTHROPIC_API_KEY;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers,
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, system, messages: [{ role: "user", content }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim());
}

// ── ROI ───────────────────────────────────────────────────────────────────────

function computeROI(pathway) {
  const totalHours = pathway.reduce((s, p) => s + p.modules.reduce((ss, m) => ss + m.estimatedHours, 0), 0);
  const rate = 45;
  const trainingCost = totalHours * rate;
  const structuredWeeks = parseFloat((totalHours / 10).toFixed(1));
  const weeksSaved = Math.max(0, 8 - structuredWeeks).toFixed(1);
  const productivityGain = (weeksSaved * 40 * rate).toFixed(0);
  return { totalHours, trainingCost, weeksSaved, productivityGain, structuredWeeks };
}

// ── UI atoms ──────────────────────────────────────────────────────────────────

function Badge({ children, color, bg, border, style = {} }) {
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: "4px", fontFamily: MONO, fontSize: "11px", fontWeight: 500, color, background: bg, border: `1px solid ${border}`, whiteSpace: "nowrap", ...style }}>{children}</span>;
}
function ImportanceBadge({ importance }) {
  const s = { critical: { color: C.red, bg: C.redBg, border: C.redBorder }, important: { color: C.yellow, bg: C.yellowBg, border: C.yellowBorder }, "nice-to-have": { color: C.textDim, bg: C.border, border: C.borderHover } }[importance] || { color: C.textDim, bg: C.border, border: C.borderHover };
  return <Badge color={s.color} bg={s.bg} border={s.border}>{importance}</Badge>;
}
function LevelBadge({ level }) {
  const s = { expert: { color: C.greenText, bg: C.greenBg, border: C.greenBorder }, intermediate: { color: C.yellow, bg: C.yellowBg, border: C.yellowBorder }, beginner: { color: C.textMid, bg: C.border, border: C.borderHover }, none: { color: C.textDim, bg: C.bg, border: C.border } }[level] || { color: C.textDim, bg: C.bg, border: C.border };
  return <Badge color={s.color} bg={s.bg} border={s.border}>{level}</Badge>;
}
function TypeBadge({ type }) {
  const s = typeStyle[type] || typeStyle.reading;
  return <Badge color={s.color} bg={s.bg} border={s.border}>{type}</Badge>;
}
function ConfidenceDot({ confidence }) {
  const col = { high: C.green, medium: C.yellow, low: C.red }[confidence] || C.textDim;
  return <span title={`${confidence} confidence`} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: MONO, fontSize: "10px", color: col }}><span style={{ width: "6px", height: "6px", borderRadius: "50%", background: col, display: "inline-block" }} />{confidence}</span>;
}
function MetaLabel({ children, color = C.textDim, style = {} }) {
  return <div style={{ fontFamily: MONO, fontSize: "10px", color, textTransform: "uppercase", letterSpacing: "0.1em", ...style }}>{children}</div>;
}
function Divider({ style = {} }) { return <div style={{ height: "1px", background: C.border, ...style }} />; }
function Spinner({ label = "Running analysis…" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: "18px" }}>
      <div style={{ display: "flex", gap: "7px" }}>{[0,1,2].map(i => <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: C.accent, animation: `dot 1.1s ease-in-out ${i*0.18}s infinite` }} />)}</div>
      <div style={{ fontFamily: SANS, fontSize: "14px", color: C.textDim }}>{label}</div>
    </div>
  );
}
function StatCard({ label, value, sub, color = C.text }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "16px 18px", flex: 1 }}>
      <MetaLabel style={{ marginBottom: "8px" }}>{label}</MetaLabel>
      <div style={{ fontFamily: MONO, fontSize: "22px", fontWeight: 700, color, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: SANS, fontSize: "12px", color: C.textDim, marginTop: "5px" }}>{sub}</div>}
    </div>
  );
}

// ── DropZone ──────────────────────────────────────────────────────────────────

function DropZone({ label, file, onFile }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  const handle = f => { if (!f) return; if (["application/pdf","text/plain"].includes(f.type) || f.name.endsWith(".pdf") || f.name.endsWith(".txt")) onFile(f); };
  const isPdf = file?.name?.endsWith(".pdf") || file?.type === "application/pdf";
  return (
    <div onClick={() => ref.current.click()} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files[0]);}}
      style={{ flex:1, border:`1px dashed ${drag?C.accent:file?C.borderHover:C.border}`, borderRadius:"8px", padding:"22px 16px", cursor:"pointer", background:drag?`${C.accent}08`:C.surface, transition:"all 0.15s", textAlign:"center" }}>
      <input ref={ref} type="file" accept=".txt,.pdf" style={{ display:"none" }} onChange={e=>handle(e.target.files[0])} />
      <MetaLabel style={{ marginBottom:"8px" }}>{label}</MetaLabel>
      <div style={{ fontFamily:SANS, fontSize:"14px", color:file?C.accentText:C.textDim }}>{file ? file.name : "Drop or click to upload"}</div>
      {file && <div style={{ fontFamily:MONO, fontSize:"10px", color:isPdf?C.accent:C.textDim, marginTop:"4px" }}>{isPdf ? "PDF · native parse" : "plain text"}</div>}
    </div>
  );
}

// ── Readiness Meter ───────────────────────────────────────────────────────────

function ReadinessMeter({ score, completed = 0, total = 0 }) {
  const [val, setVal] = useState(0);
  const boosted = Math.min(100, Math.round(score + (completed / Math.max(total,1)) * (100 - score) * 0.8));
  useEffect(() => { const t = setTimeout(() => setVal(boosted), 250); return () => clearTimeout(t); }, [boosted]);
  const color = val >= 70 ? C.greenText : val >= 40 ? C.yellow : C.red;
  const label = val >= 70 ? "Strong match" : val >= 40 ? "Partial match" : "Needs development";
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"20px 24px", marginBottom:"20px", display:"flex", alignItems:"center", gap:"24px" }}>
      <div style={{ minWidth:"100px" }}>
        <MetaLabel style={{ marginBottom:"8px" }}>Readiness Score</MetaLabel>
        <div style={{ fontFamily:MONO, fontSize:"44px", fontWeight:700, color, lineHeight:1, letterSpacing:"-0.03em" }}>{val}<span style={{ fontSize:"18px", color:C.textDim, fontWeight:400 }}>/100</span></div>
        <div style={{ fontFamily:SANS, fontSize:"13px", color, marginTop:"6px", fontWeight:500 }}>{label}</div>
        {completed > 0 && <div style={{ fontFamily:MONO, fontSize:"10px", color:C.green, marginTop:"4px" }}>↑ {completed} module{completed>1?"s":""} done</div>}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ height:"5px", background:C.border, borderRadius:"999px", overflow:"hidden", marginBottom:"6px" }}>
          <div style={{ height:"100%", width:`${val}%`, background:color, borderRadius:"999px", transition:"width 1.1s cubic-bezier(0.4,0,0.2,1)" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom: total > 0 ? "10px" : "0" }}>
          <span style={{ fontFamily:MONO, fontSize:"10px", color:C.textDim }}>0</span>
          <span style={{ fontFamily:MONO, fontSize:"10px", color:C.textDim }}>100</span>
        </div>
        {total > 0 && <>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
            <span style={{ fontFamily:SANS, fontSize:"12px", color:C.textDim }}>Training progress</span>
            <span style={{ fontFamily:MONO, fontSize:"11px", color:C.textMid }}>{completed}/{total} modules</span>
          </div>
          <div style={{ height:"3px", background:C.border, borderRadius:"999px", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(completed/total)*100}%`, background:C.green, borderRadius:"999px", transition:"width 0.5s ease" }} />
          </div>
        </>}
      </div>
    </div>
  );
}

// ── Module row ────────────────────────────────────────────────────────────────

function ModuleRow({ mod, isLast, completed, onToggle }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:"12px", padding:"14px 0", borderBottom:isLast?"none":`1px solid ${C.border}`, opacity:completed?0.55:1, transition:"opacity 0.2s" }}>
      <button onClick={()=>onToggle(mod.id)} style={{ width:"20px", height:"20px", borderRadius:"5px", border:`1.5px solid ${completed?C.green:C.border}`, background:completed?C.greenBg:"transparent", flexShrink:0, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", marginTop:"2px" }}>
        {completed && <span style={{ color:C.green, fontSize:"11px", fontWeight:700 }}>✓</span>}
      </button>
      <div style={{ paddingTop:"2px", flexShrink:0 }}><TypeBadge type={mod.type} /></div>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:SANS, fontSize:"15px", fontWeight:600, color:completed?C.textDim:C.text, marginBottom:"5px", textDecoration:completed?"line-through":"none" }}>{mod.name}</div>
        <div style={{ fontFamily:SANS, fontSize:"13px", color:C.textDim, lineHeight:1.65 }}>{mod.description}</div>
      </div>
      <div style={{ fontFamily:MONO, fontSize:"11px", color:C.textDim, flexShrink:0, paddingTop:"3px" }}>{mod.estimatedHours}h</div>
    </div>
  );
}

// ── Phase card ────────────────────────────────────────────────────────────────

function PhaseCard({ phase, defaultOpen, completedModules, onToggle }) {
  const [open, setOpen] = useState(defaultOpen);
  const totalH = phase.modules.reduce((s,m) => s+m.estimatedHours, 0);
  const doneCount = phase.modules.filter(m => completedModules[m.id]).length;
  const allDone = doneCount === phase.modules.length;
  return (
    <div style={{ background:C.surface, border:`1px solid ${allDone?C.greenBorder:open?C.borderHover:C.border}`, borderRadius:"10px", overflow:"hidden", marginBottom:"8px", transition:"border-color 0.15s" }}>
      <div onClick={()=>setOpen(!open)} style={{ display:"flex", alignItems:"center", gap:"14px", padding:"16px 20px", cursor:"pointer", background:open?C.surfaceHover:"transparent", transition:"background 0.15s" }}>
        <div style={{ width:"26px", height:"26px", borderRadius:"50%", background:allDone?C.greenBg:open?C.accent:C.border, border:allDone?`1px solid ${C.greenBorder}`:"none", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:MONO, fontSize:"11px", color:allDone?C.greenText:open?"#fff":C.textDim, fontWeight:600, transition:"all 0.15s", flexShrink:0 }}>
          {allDone ? "✓" : phase.phase}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:SANS, fontSize:"16px", fontWeight:600, color:open?C.text:C.textMid }}>{phase.title}</div>
          <div style={{ fontFamily:MONO, fontSize:"11px", color:C.textDim, marginTop:"3px" }}>{phase.duration} · {totalH}h · {doneCount}/{phase.modules.length} done</div>
        </div>
        {doneCount > 0 && !allDone && <div style={{ height:"4px", width:"60px", background:C.border, borderRadius:"999px", overflow:"hidden" }}><div style={{ height:"100%", width:`${(doneCount/phase.modules.length)*100}%`, background:C.green, borderRadius:"999px" }} /></div>}
        <div style={{ color:C.textDim, fontSize:"12px", transition:"transform 0.2s", transform:open?"rotate(180deg)":"none" }}>▼</div>
      </div>
      {open && <div style={{ padding:"0 20px 6px", borderTop:`1px solid ${C.border}` }}>{phase.modules.map((m,i) => <ModuleRow key={m.id} mod={m} isLast={i===phase.modules.length-1} completed={!!completedModules[m.id]} onToggle={onToggle} />)}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── CANDIDATE RESULTS ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function CandidateResults({ result, onReset, isDemo }) {
  const [tab, setTab] = useState("pathway");
  const [completedModules, setCompletedModules] = useState({});
  const allModules = result.pathway?.flatMap(p => p.modules) || [];
  const completedCount = Object.values(completedModules).filter(Boolean).length;
  const toggleModule = useCallback(id => setCompletedModules(prev => ({ ...prev, [id]: !prev[id] })), []);

  const TABS = [
    { id: "pathway",   label: "My Pathway"                     },
    { id: "gaps",      label: `Skill Gaps (${result.gaps?.length})` },
    { id: "strengths", label: "Strengths"                      },
  ];

  return (
    <div style={{ animation:"fadeUp 0.3s ease both" }}>
      {isDemo && (
        <div style={{ background:`${C.accent}12`, border:`1px solid ${C.accentBorder}`, borderRadius:"8px", padding:"11px 16px", marginBottom:"20px", display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:C.green, flexShrink:0 }} />
          <span style={{ fontFamily:SANS, fontSize:"13px", color:C.accentText }}>Demo mode — sample candidate output for Alex Chen → Senior PM</span>
          <button onClick={onReset} style={{ marginLeft:"auto", background:"none", border:`1px solid ${C.border}`, borderRadius:"6px", padding:"5px 12px", cursor:"pointer", fontFamily:SANS, fontSize:"13px", color:C.textDim }}>Try real →</button>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px" }}>
        <div>
          <MetaLabel style={{ marginBottom:"8px" }}>Your onboarding plan</MetaLabel>
          <div style={{ fontFamily:SANS, fontSize:"24px", fontWeight:700, color:C.text, letterSpacing:"-0.02em" }}>{result.candidateName}</div>
          <div style={{ fontFamily:SANS, fontSize:"15px", color:C.textDim, marginTop:"4px" }}>→ {result.targetRole}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <MetaLabel style={{ marginBottom:"8px" }}>Competency in</MetaLabel>
          <div style={{ fontFamily:MONO, fontSize:"16px", color:C.accent, fontWeight:500 }}>{result.timeToCompetency}</div>
          {!isDemo && <button onClick={onReset} style={{ marginTop:"10px", display:"block", marginLeft:"auto", background:"none", border:`1px solid ${C.border}`, borderRadius:"6px", padding:"6px 14px", cursor:"pointer", fontFamily:SANS, fontSize:"13px", color:C.textDim }} onMouseEnter={e=>e.currentTarget.style.borderColor=C.borderHover} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>← Start over</button>}
        </div>
      </div>

      <ReadinessMeter score={result.readinessScore} completed={completedCount} total={allModules.length} />

      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:"20px" }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={()=>setTab(id)} style={{ padding:"10px 16px", border:"none", background:"none", cursor:"pointer", fontFamily:SANS, fontSize:"14px", fontWeight:tab===id?600:400, color:tab===id?C.text:C.textDim, borderBottom:`2px solid ${tab===id?C.accent:"transparent"}`, marginBottom:"-1px", transition:"all 0.15s", whiteSpace:"nowrap" }}>{label}</button>
        ))}
      </div>

      {tab === "pathway" && (
        <div>
          <div style={{ fontFamily:SANS, fontSize:"13px", color:C.textDim, marginBottom:"16px", display:"flex", alignItems:"center", gap:"8px" }}>
            <span style={{ color:C.green }}>✓</span> Tick modules as you complete them — your readiness score updates live.
          </div>
          {result.pathway?.map((p,i) => <PhaseCard key={i} phase={p} defaultOpen={i===0} completedModules={completedModules} onToggle={toggleModule} />)}
        </div>
      )}

      {tab === "gaps" && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"10px", overflow:"hidden" }}>
          {result.gaps?.map((g,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"14px", padding:"16px 20px", borderBottom:i<result.gaps.length-1?`1px solid ${C.border}`:"none" }}>
              <ImportanceBadge importance={g.importance} />
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:SANS, fontSize:"15px", fontWeight:600, color:C.text }}>{g.skill}</div>
                <div style={{ fontFamily:SANS, fontSize:"13px", color:C.textDim, marginTop:"3px" }}>{g.currentLevel==="none"?"Not on resume":g.currentLevel} → {g.targetLevel}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "strengths" && (
        <div>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"10px", overflow:"hidden", marginBottom:"20px" }}>
            {result.strengths?.map((s,i) => (
              <div key={i} style={{ display:"flex", gap:"14px", padding:"16px 20px", borderBottom:i<result.strengths.length-1?`1px solid ${C.border}`:"none" }}>
                <span style={{ color:C.green, flexShrink:0, fontSize:"15px" }}>✓</span>
                <span style={{ fontFamily:SANS, fontSize:"14px", color:C.textMid, lineHeight:1.7 }}>{s}</span>
              </div>
            ))}
          </div>
          <MetaLabel style={{ marginBottom:"12px" }}>Detected Skills — Extraction Confidence</MetaLabel>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"10px", overflow:"hidden" }}>
            {result.resumeSkills?.map((s,i) => (
              <div key={s.skill} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"13px 20px", borderBottom:i<result.resumeSkills.length-1?`1px solid ${C.border}`:"none" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:SANS, fontSize:"14px", fontWeight:500, color:C.text }}>{s.skill}</div>
                  {s.yearsExp > 0 && <div style={{ fontFamily:MONO, fontSize:"10px", color:C.textDim, marginTop:"2px" }}>{s.yearsExp} yr{s.yearsExp>1?"s":""}</div>}
                </div>
                <LevelBadge level={s.level} />
                {s.confidence && <ConfidenceDot confidence={s.confidence} />}
              </div>
            ))}
          </div>
          <div style={{ marginTop:"10px", fontFamily:SANS, fontSize:"12px", color:C.textDim, lineHeight:1.6 }}>Confidence = how explicitly the skill was demonstrated in the resume (high = years cited, medium = mentioned, low = inferred).</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MANAGER RESULTS ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function ManagerResults({ result, onReset, isDemo }) {
  const [tab, setTab] = useState("summary");
  const ms = result.managerSummary;
  const roi = computeROI(result.pathway);

  const riskColor  = { low: C.greenText, medium: C.yellow, high: C.red }[ms?.hiringRisk] || C.textMid;
  const riskBg     = { low: C.greenBg,   medium: C.yellowBg, high: C.redBg }[ms?.hiringRisk] || C.border;
  const riskBorder = { low: C.greenBorder, medium: C.yellowBorder, high: C.redBorder }[ms?.hiringRisk] || C.borderHover;

  const TABS = [
    { id: "summary",  label: "Hire Summary"  },
    { id: "gaps",     label: "Skill Gaps"    },
    { id: "pathway",  label: "Onboarding Plan"},
    { id: "roi",      label: "ROI"           },
  ];

  return (
    <div style={{ animation:"fadeUp 0.3s ease both" }}>
      {isDemo && (
        <div style={{ background:`${C.accent}12`, border:`1px solid ${C.accentBorder}`, borderRadius:"8px", padding:"11px 16px", marginBottom:"20px", display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:C.green, flexShrink:0 }} />
          <span style={{ fontFamily:SANS, fontSize:"13px", color:C.accentText }}>Demo mode — sample manager report for Alex Chen → Senior PM</span>
          <button onClick={onReset} style={{ marginLeft:"auto", background:"none", border:`1px solid ${C.border}`, borderRadius:"6px", padding:"5px 12px", cursor:"pointer", fontFamily:SANS, fontSize:"13px", color:C.textDim }}>Try real →</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px" }}>
        <div>
          <MetaLabel style={{ marginBottom:"8px" }}>Hiring report</MetaLabel>
          <div style={{ fontFamily:SANS, fontSize:"24px", fontWeight:700, color:C.text, letterSpacing:"-0.02em" }}>{result.candidateName}</div>
          <div style={{ fontFamily:SANS, fontSize:"15px", color:C.textDim, marginTop:"4px" }}>Candidate for {result.targetRole}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          {!isDemo && <button onClick={onReset} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:"6px", padding:"6px 14px", cursor:"pointer", fontFamily:SANS, fontSize:"13px", color:C.textDim }} onMouseEnter={e=>e.currentTarget.style.borderColor=C.borderHover} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>← New report</button>}
        </div>
      </div>

      {/* Top KPI row */}
      <div style={{ display:"flex", gap:"10px", marginBottom:"20px", flexWrap:"wrap" }}>
        <div style={{ flex:1, background:riskBg, border:`1px solid ${riskBorder}`, borderRadius:"10px", padding:"16px 20px" }}>
          <MetaLabel style={{ marginBottom:"8px", color:riskColor }}>Hiring Risk</MetaLabel>
          <div style={{ fontFamily:MONO, fontSize:"26px", fontWeight:700, color:riskColor, textTransform:"capitalize", letterSpacing:"-0.02em" }}>{ms?.hiringRisk || "—"}</div>
        </div>
        <StatCard label="Readiness" value={`${result.readinessScore}/100`} sub="Before onboarding" color={result.readinessScore>=70?C.greenText:result.readinessScore>=40?C.yellow:C.red} />
        <StatCard label="Time to competency" value={result.timeToCompetency} sub="With this pathway" color={C.accentText} />
        <StatCard label="Weeks saved" value={`${roi.weeksSaved}w`} sub="vs unstructured" color={C.greenText} />
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:"20px", overflowX:"auto" }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={()=>setTab(id)} style={{ padding:"10px 16px", border:"none", background:"none", cursor:"pointer", fontFamily:SANS, fontSize:"14px", fontWeight:tab===id?600:400, color:tab===id?C.text:C.textDim, borderBottom:`2px solid ${tab===id?C.accent:"transparent"}`, marginBottom:"-1px", transition:"all 0.15s", whiteSpace:"nowrap" }}>{label}</button>
        ))}
      </div>

      {/* Summary tab */}
      {tab === "summary" && ms && (
        <div style={{ animation:"fadeUp 0.2s ease both" }}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"20px", marginBottom:"12px" }}>
            <MetaLabel style={{ marginBottom:"10px" }}>Recommendation</MetaLabel>
            <div style={{ fontFamily:SANS, fontSize:"16px", color:C.text, lineHeight:1.7, fontWeight:500 }}>{ms.recommendation}</div>
          </div>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"20px", marginBottom:"12px" }}>
            <MetaLabel style={{ marginBottom:"10px", color:C.red }}>Top Concern</MetaLabel>
            <div style={{ fontFamily:SANS, fontSize:"15px", color:C.textMid, lineHeight:1.7 }}>{ms.topConcern}</div>
          </div>
          <div style={{ display:"flex", gap:"12px" }}>
            <div style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"18px 20px" }}>
              <MetaLabel style={{ marginBottom:"10px", color:C.greenText }}>Skip in onboarding</MetaLabel>
              {ms.skillsToSkip?.map((s,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"7px 0", borderBottom:i<ms.skillsToSkip.length-1?`1px solid ${C.border}`:"none" }}>
                  <span style={{ color:C.green, fontSize:"13px" }}>✓</span>
                  <span style={{ fontFamily:SANS, fontSize:"13px", color:C.textMid }}>{s}</span>
                </div>
              ))}
            </div>
            <div style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"18px 20px" }}>
              <MetaLabel style={{ marginBottom:"10px", color:C.red }}>Watch closely</MetaLabel>
              {ms.keyRisks?.map((r,i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"8px", padding:"7px 0", borderBottom:i<ms.keyRisks.length-1?`1px solid ${C.border}`:"none" }}>
                  <span style={{ color:C.red, fontSize:"13px", marginTop:"1px", flexShrink:0 }}>!</span>
                  <span style={{ fontFamily:SANS, fontSize:"13px", color:C.textMid, lineHeight:1.6 }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gaps tab */}
      {tab === "gaps" && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"10px", overflow:"hidden" }}>
          {result.gaps?.map((g,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"14px", padding:"16px 20px", borderBottom:i<result.gaps.length-1?`1px solid ${C.border}`:"none" }}>
              <ImportanceBadge importance={g.importance} />
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:SANS, fontSize:"15px", fontWeight:600, color:C.text }}>{g.skill}</div>
                <div style={{ fontFamily:SANS, fontSize:"13px", color:C.textDim, marginTop:"3px" }}>{g.currentLevel==="none"?"Not on resume":g.currentLevel} → {g.targetLevel}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pathway tab — read-only for manager */}
      {tab === "pathway" && (
        <div>
          <div style={{ fontFamily:SANS, fontSize:"13px", color:C.textDim, marginBottom:"16px" }}>
            This is the recommended onboarding plan for the new hire. Share it with them on day one.
          </div>
          {result.pathway?.map((phase, i) => {
            const totalH = phase.modules.reduce((s,m) => s+m.estimatedHours, 0);
            return (
              <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"10px", marginBottom:"8px", overflow:"hidden" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"14px", padding:"16px 20px", background:C.surfaceHover }}>
                  <div style={{ width:"26px", height:"26px", borderRadius:"50%", background:C.accent, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:MONO, fontSize:"11px", color:"#fff", fontWeight:600, flexShrink:0 }}>{phase.phase}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:SANS, fontSize:"16px", fontWeight:600, color:C.text }}>{phase.title}</div>
                    <div style={{ fontFamily:MONO, fontSize:"11px", color:C.textDim, marginTop:"3px" }}>{phase.duration} · {totalH}h · {phase.modules.length} modules</div>
                  </div>
                </div>
                <div style={{ padding:"0 20px" }}>
                  {phase.modules.map((m,mi) => (
                    <div key={m.id} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"12px 0", borderBottom:mi<phase.modules.length-1?`1px solid ${C.border}`:"none" }}>
                      <TypeBadge type={m.type} />
                      <div style={{ flex:1, fontFamily:SANS, fontSize:"14px", fontWeight:500, color:C.text }}>{m.name}</div>
                      <div style={{ fontFamily:MONO, fontSize:"11px", color:C.textDim }}>{m.estimatedHours}h</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ROI tab */}
      {tab === "roi" && (
        <div style={{ animation:"fadeUp 0.2s ease both" }}>
          <div style={{ display:"flex", gap:"10px", marginBottom:"16px", flexWrap:"wrap" }}>
            <StatCard label="Total training hours" value={`${roi.totalHours}h`} sub="Across all phases" color={C.accentText} />
            <StatCard label="Est. training cost" value={`$${Number(roi.trainingCost).toLocaleString()}`} sub="@ $45/hr blended rate" color={C.yellow} />
            <StatCard label="Weeks saved" value={`${roi.weeksSaved}w`} sub="vs unstructured onboarding" color={C.greenText} />
            <StatCard label="Productivity gain" value={`$${Number(roi.productivityGain).toLocaleString()}`} sub="Recovered output value" color={C.greenText} />
          </div>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"20px", marginBottom:"12px" }}>
            <MetaLabel style={{ marginBottom:"10px" }}>ROI Analysis</MetaLabel>
            <div style={{ fontFamily:SANS, fontSize:"14px", color:C.textMid, lineHeight:1.75 }}>{ms?.roiNote || `This ${roi.totalHours}-hour pathway compresses time-to-competency from ~8 weeks to ${roi.structuredWeeks} weeks, saving an estimated ${roi.weeksSaved} weeks of reduced productivity.`}</div>
          </div>
          <div style={{ background:`${C.accent}10`, border:`1px solid ${C.accentBorder}`, borderRadius:"10px", padding:"16px 20px" }}>
            <div style={{ fontFamily:SANS, fontSize:"13px", color:C.textDim, lineHeight:1.65 }}>Assumes 2h/day dedicated learning time. Cost at $45/hr blended L&D rate. Productivity gain vs 8-week unstructured onboarding baseline.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ROLE SELECTOR ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function RoleSelector({ onSelect }) {
  const [hovered, setHovered] = useState(null);
  const roles = [
    {
      id: "candidate",
      icon: "👤",
      title: "I'm the new hire",
      subtitle: "Get my learning pathway",
      desc: "Upload your resume or take a diagnostic quiz. Get a personalised training roadmap that skips what you already know and focuses on exactly what the role requires.",
      cta: "Build my pathway →",
      color: C.accent,
      colorBg: C.accentBg,
      colorBorder: C.accentBorder,
      colorText: C.accentText,
      features: ["Personalised pathway", "Progress tracker", "Skill gap view", "Confidence scores"],
    },
    {
      id: "manager",
      icon: "💼",
      title: "I'm the hiring manager",
      subtitle: "Get a hire report",
      desc: "Upload the candidate's resume and the job description. Get a structured hiring report with risk assessment, onboarding plan, and ROI breakdown.",
      cta: "Generate hire report →",
      color: "#8B5CF6",
      colorBg: C.purpleBg,
      colorBorder: C.purpleBorder,
      colorText: C.purple,
      features: ["Hiring risk score", "Skill gap analysis", "Onboarding plan", "ROI estimate"],
    },
  ];

  return (
    <div style={{ animation:"fadeUp 0.35s ease both" }}>
      <div style={{ paddingTop:"56px", paddingBottom:"40px", textAlign:"center" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:"7px", padding:"4px 12px", borderRadius:"5px", background:`${C.accent}15`, border:`1px solid ${C.accentBorder}`, marginBottom:"24px" }}>
          <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:C.green }} />
          <span style={{ fontFamily:MONO, fontSize:"10px", color:C.accentText, letterSpacing:"0.06em" }}>PathwayAI · Adaptive Onboarding Engine</span>
        </div>
        <h1 style={{ fontFamily:SANS, fontSize:"32px", fontWeight:700, color:C.text, letterSpacing:"-0.03em", lineHeight:1.2, marginBottom:"12px" }}>Who are you?</h1>
        <p style={{ fontFamily:SANS, fontSize:"15px", color:C.textDim, lineHeight:1.75 }}>We'll tailor the experience to what you actually need.</p>
      </div>

      <div style={{ display:"flex", gap:"16px" }}>
        {roles.map(role => (
          <div key={role.id}
            onClick={() => onSelect(role.id)}
            onMouseEnter={() => setHovered(role.id)}
            onMouseLeave={() => setHovered(null)}
            style={{ flex:1, background:C.surface, border:`1.5px solid ${hovered===role.id ? role.color : C.border}`, borderRadius:"12px", padding:"28px", cursor:"pointer", transition:"all 0.2s", position:"relative", overflow:"hidden" }}>
            {/* Subtle glow on hover */}
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:hovered===role.id?role.color:"transparent", transition:"background 0.2s" }} />

            <div style={{ fontSize:"28px", marginBottom:"16px" }}>{role.icon}</div>
            <div style={{ fontFamily:SANS, fontSize:"19px", fontWeight:700, color:C.text, marginBottom:"4px" }}>{role.title}</div>
            <div style={{ fontFamily:MONO, fontSize:"10px", color:role.colorText, marginBottom:"14px", letterSpacing:"0.04em" }}>{role.subtitle}</div>
            <div style={{ fontFamily:SANS, fontSize:"14px", color:C.textDim, lineHeight:1.75, marginBottom:"20px" }}>{role.desc}</div>

            {/* Feature list */}
            <div style={{ display:"flex", flexDirection:"column", gap:"6px", marginBottom:"24px" }}>
              {role.features.map(f => (
                <div key={f} style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                  <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:role.color, flexShrink:0 }} />
                  <span style={{ fontFamily:SANS, fontSize:"13px", color:C.textMid }}>{f}</span>
                </div>
              ))}
            </div>

            <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", padding:"10px 18px", borderRadius:"8px", background:hovered===role.id?role.color:role.colorBg, border:`1px solid ${role.colorBorder}`, fontFamily:SANS, fontSize:"14px", fontWeight:600, color:hovered===role.id?"#fff":role.colorText, transition:"all 0.2s" }}>
              {role.cta}
            </div>
          </div>
        ))}
      </div>

      <Divider style={{ margin:"32px 0 24px" }} />
      <div style={{ textAlign:"center" }}>
        <span style={{ fontFamily:SANS, fontSize:"13px", color:C.textDim }}>Just want to see how it works? </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── SHARED UPLOAD (used by both flows) ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function UploadView({ role, onComplete }) {
  const isManager = role === "manager";
  const [resumeFile, setResumeFile] = useState(null);
  const [jdFile, setJdFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [useText, setUseText] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState(null);
  const msgs = ["Parsing resume…", "Extracting requirements…", "Computing skill gaps…", "Generating report…"];
  const canGo = resumeFile && (jdFile || jdText.trim());

  const analyze = useCallback(async () => {
    if (!canGo) return;
    setLoading(true); setError(null); setMsg(msgs[0]);
    let i = 0; const iv = setInterval(() => { i=(i+1)%msgs.length; setMsg(msgs[i]); }, 1800);
    try {
      const rb = await fileToBlock(resumeFile, "RESUME");
      const jb = useText ? { type:"text", text:`JOB DESCRIPTION:\n${jdText}` } : await fileToBlock(jdFile, "JOB DESCRIPTION");
      const data = await callClaude(ANALYSIS_PROMPT, [rb, jb, { type:"text", text:"Return only the JSON." }]);
      onComplete(data);
    } catch(e) { setError(e.message || "Analysis failed. Please try again."); }
    finally { clearInterval(iv); setLoading(false); }
  }, [resumeFile, jdFile, jdText, useText]);

  if (loading) return <Spinner label={msg} />;

  return (
    <div style={{ animation:"fadeUp 0.3s ease both" }}>
      <MetaLabel style={{ marginBottom:"8px" }}>{isManager ? "Upload documents" : "Upload documents"}</MetaLabel>
      <div style={{ fontFamily:SANS, fontSize:"22px", fontWeight:700, color:C.text, letterSpacing:"-0.02em", marginBottom:"8px" }}>
        {isManager ? "Candidate Resume + Job Description" : "Your Resume + Job Description"}
      </div>
      <div style={{ fontFamily:SANS, fontSize:"15px", color:C.textDim, lineHeight:1.7, marginBottom:"24px" }}>
        {isManager
          ? "Upload the candidate's resume and the target job description. We'll generate a full hiring report with risk assessment, gap analysis, and ROI."
          : "Upload your resume and the job description. We'll extract your skills, find the gaps, and build your personalised training pathway."}
      </div>

      <div style={{ display:"flex", gap:"12px", marginBottom:"14px" }}>
        <DropZone label={isManager ? "Candidate resume" : "Your resume (.pdf or .txt)"} file={resumeFile} onFile={setResumeFile} />
        {!useText && <DropZone label="Job description" file={jdFile} onFile={setJdFile} />}
      </div>

      <button onClick={()=>{ setUseText(!useText); setJdFile(null); setJdText(""); }} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:SANS, fontSize:"13px", color:useText?C.accent:C.textDim, padding:0, marginBottom:"14px", textDecoration:"underline" }}>
        {useText ? "← Upload JD as file" : "Paste job description as text →"}
      </button>

      {useText && <textarea value={jdText} onChange={e=>setJdText(e.target.value)} placeholder="Paste the full job description here…" style={{ width:"100%", minHeight:"120px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"12px 14px", color:C.text, fontFamily:SANS, fontSize:"14px", lineHeight:1.65, outline:"none", resize:"vertical", marginBottom:"14px" }} />}

      {error && <div style={{ background:C.redBg, border:`1px solid ${C.redBorder}`, borderRadius:"8px", padding:"12px 14px", marginBottom:"14px", fontFamily:SANS, fontSize:"13px", color:C.red }}>{error}</div>}

      <button onClick={analyze} disabled={!canGo} style={{ width:"100%", padding:"13px", borderRadius:"8px", background:canGo?C.accent:C.border, color:canGo?"#fff":C.textDim, border:"none", cursor:canGo?"pointer":"not-allowed", fontFamily:SANS, fontSize:"15px", fontWeight:600, transition:"all 0.2s" }}>
        {isManager ? "Generate Hire Report →" : "Run Analysis →"}
      </button>
    </div>
  );
}

// ── Quiz (candidate only) ─────────────────────────────────────────────────────

function QuizView({ onComplete }) {
  const [step, setStep] = useState("setup");
  const [jdText, setJdText] = useState("");
  const [name, setName] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [cur, setCur] = useState(0);
  const [error, setError] = useState(null);
  const [loadMsg, setLoadMsg] = useState("");

  const start = async () => {
    if (!jdText.trim()) return;
    setStep("loading"); setLoadMsg("Generating your diagnostic…"); setError(null);
    try { const d = await callClaude(QUIZ_PROMPT, `Role/JD: ${jdText}`); setQuiz(d); setAnswers({}); setCur(0); setStep("questions"); }
    catch(e) { setError(e.message); setStep("setup"); }
  };

  const pick = (qi, oi) => { setAnswers(a=>({...a,[qi]:oi})); if (qi < quiz.questions.length-1) setTimeout(()=>setCur(qi+1), 300); };

  const submit = async () => {
    setStep("loading"); setLoadMsg("Building your pathway…");
    try {
      const summary = quiz.questions.map((q,i)=>{ const o=q.options[answers[i]]; return `${q.skill}: ${o?.label} (${o?.level})`; }).join("\n");
      const data = await callClaude(ANALYSIS_PROMPT, `Candidate: ${name||"New Hire"}\nRole: ${quiz.role}\n\nQuiz results:\n${summary}`);
      onComplete(data);
    } catch(e) { setError(e.message); setStep("questions"); }
  };

  const allDone = quiz && Object.keys(answers).length === quiz.questions.length;
  const inp = { width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"11px 14px", color:C.text, fontFamily:SANS, fontSize:"14px", outline:"none" };

  if (step==="loading") return <Spinner label={loadMsg} />;

  if (step==="setup") return (
    <div style={{ animation:"fadeUp 0.3s ease both" }}>
      <MetaLabel style={{ marginBottom:"8px" }}>Diagnostic Quiz</MetaLabel>
      <div style={{ fontFamily:SANS, fontSize:"22px", fontWeight:700, color:C.text, letterSpacing:"-0.02em", marginBottom:"8px" }}>No resume needed.</div>
      <div style={{ fontFamily:SANS, fontSize:"15px", color:C.textDim, lineHeight:1.7, marginBottom:"28px" }}>Describe the target role and answer 8 adaptive questions. We'll infer your skill level and build a personalised pathway.</div>
      <div style={{ marginBottom:"16px" }}>
        <label style={{ fontFamily:SANS, fontSize:"13px", fontWeight:500, color:C.textMid, display:"block", marginBottom:"7px" }}>Your name <span style={{ color:C.textDim }}>(optional)</span></label>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Priya Sharma" style={inp} />
      </div>
      <div style={{ marginBottom:"24px" }}>
        <label style={{ fontFamily:SANS, fontSize:"13px", fontWeight:500, color:C.textMid, display:"block", marginBottom:"7px" }}>Target role or job description</label>
        <textarea value={jdText} onChange={e=>setJdText(e.target.value)} placeholder={`"Senior Data Engineer at a fintech startup" — or paste the full JD`} style={{ ...inp, minHeight:"120px", resize:"vertical", lineHeight:1.65 }} />
      </div>
      {error && <div style={{ background:C.redBg, border:`1px solid ${C.redBorder}`, borderRadius:"8px", padding:"12px 14px", marginBottom:"16px", fontFamily:SANS, fontSize:"13px", color:C.red }}>{error}</div>}
      <button onClick={start} disabled={!jdText.trim()} style={{ width:"100%", padding:"13px", borderRadius:"8px", background:jdText.trim()?C.accent:C.border, color:jdText.trim()?"#fff":C.textDim, border:"none", cursor:jdText.trim()?"pointer":"not-allowed", fontFamily:SANS, fontSize:"15px", fontWeight:600, transition:"all 0.2s" }}>Generate Diagnostic →</button>
    </div>
  );

  if (step==="questions" && quiz) {
    const q = quiz.questions[cur];
    const ls = { none:{color:C.textDim,bg:C.bg,border:C.border,sel:C.borderHover}, beginner:{color:C.textMid,bg:C.surface,border:C.border,sel:C.borderHover}, intermediate:{color:C.yellow,bg:C.yellowBg,border:C.yellowBorder,sel:"#FCD34D"}, expert:{color:C.greenText,bg:C.greenBg,border:C.greenBorder,sel:"#86EFAC"} };
    return (
      <div style={{ animation:"fadeUp 0.2s ease both" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
          <span style={{ fontFamily:SANS, fontSize:"13px", color:C.textDim }}>{quiz.role}</span>
          <span style={{ fontFamily:MONO, fontSize:"11px", color:C.textDim }}>{Object.keys(answers).length}/{quiz.questions.length}</span>
        </div>
        <div style={{ height:"3px", background:C.border, borderRadius:"999px", overflow:"hidden", marginBottom:"28px" }}>
          <div style={{ height:"100%", width:`${((cur+1)/quiz.questions.length)*100}%`, background:C.accent, borderRadius:"999px", transition:"width 0.3s ease" }} />
        </div>
        <div style={{ marginBottom:"10px" }}><Badge color={C.greenText} bg={C.greenBg} border={C.greenBorder}>{q.skill}</Badge></div>
        <div style={{ fontFamily:SANS, fontSize:"18px", fontWeight:600, color:C.text, lineHeight:1.5, marginBottom:"22px" }}>{q.question}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"24px" }}>
          {q.options.map((opt,oi) => {
            const sel = answers[cur]===oi;
            const s = ls[opt.level]||ls.none;
            return (
              <button key={oi} onClick={()=>pick(cur,oi)} style={{ textAlign:"left", padding:"14px 16px", borderRadius:"8px", border:`1px solid ${sel?s.sel:C.border}`, background:sel?s.bg:C.surface, cursor:"pointer", transition:"all 0.13s", display:"flex", alignItems:"center", gap:"12px" }}>
                <div style={{ width:"16px", height:"16px", borderRadius:"50%", border:`2px solid ${sel?s.color:C.borderHover}`, background:sel?s.color:"transparent", flexShrink:0, transition:"all 0.13s" }} />
                <span style={{ fontFamily:SANS, fontSize:"14px", color:sel?C.text:C.textMid, flex:1 }}>{opt.label}</span>
                {sel && <Badge color={s.color} bg="transparent" border="transparent">{opt.level}</Badge>}
              </button>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          {cur>0 && <button onClick={()=>setCur(cur-1)} style={{ padding:"11px 16px", borderRadius:"8px", border:`1px solid ${C.border}`, background:"none", cursor:"pointer", fontFamily:SANS, fontSize:"14px", color:C.textDim }}>←</button>}
          {cur<quiz.questions.length-1
            ? <button onClick={()=>setCur(cur+1)} disabled={answers[cur]===undefined} style={{ flex:1, padding:"11px", borderRadius:"8px", border:`1px solid ${C.border}`, background:"none", cursor:answers[cur]!==undefined?"pointer":"not-allowed", fontFamily:SANS, fontSize:"14px", color:answers[cur]!==undefined?C.textMid:C.textDim }}>Next →</button>
            : <button onClick={submit} disabled={!allDone} style={{ flex:1, padding:"12px", borderRadius:"8px", border:"none", background:allDone?C.accent:C.border, color:allDone?"#fff":C.textDim, cursor:allDone?"pointer":"not-allowed", fontFamily:SANS, fontSize:"15px", fontWeight:600, transition:"all 0.2s" }}>{allDone?"Generate My Pathway →":`${Object.keys(answers).length}/${quiz.questions.length} answered`}</button>
          }
        </div>
        <div style={{ display:"flex", justifyContent:"center", gap:"6px", marginTop:"20px" }}>
          {quiz.questions.map((_,i) => <div key={i} onClick={()=>setCur(i)} style={{ width:"6px", height:"6px", borderRadius:"50%", cursor:"pointer", background:i===cur?C.accent:answers[i]!==undefined?C.borderHover:C.border, transition:"all 0.15s", transform:i===cur?"scale(1.4)":"scale(1)" }} />)}
        </div>
        {error && <div style={{ marginTop:"14px", fontFamily:SANS, fontSize:"13px", color:C.red }}>{error}</div>}
      </div>
    );
  }
  return null;
}

// ── Candidate landing (after role select) ─────────────────────────────────────

function CandidateLanding({ onMode }) {
  return (
    <div style={{ animation:"fadeUp 0.3s ease both" }}>
      <MetaLabel style={{ marginBottom:"8px" }}>New hire onboarding</MetaLabel>
      <div style={{ fontFamily:SANS, fontSize:"24px", fontWeight:700, color:C.text, letterSpacing:"-0.02em", marginBottom:"8px" }}>How do you want to start?</div>
      <div style={{ fontFamily:SANS, fontSize:"15px", color:C.textDim, lineHeight:1.7, marginBottom:"28px" }}>Choose how we assess your current skill level.</div>
      <div style={{ display:"flex", gap:"12px" }}>
        {[
          { mode:"upload", num:"01", dot:C.accent, dotText:C.accentText, title:"Upload Resume + JD", desc:"Have a resume? Upload it alongside the job description for automatic skill extraction and gap analysis.", tags:["PDF support","Native parsing","Confidence scores"] },
          { mode:"quiz",   num:"02", dot:"#8B5CF6", dotText:C.purple,   title:"Diagnostic Quiz",   desc:"No resume? Answer 8 adaptive questions tailored to your role. We infer your skill level and build your pathway.", tags:["No resume needed","8 questions","Adaptive scoring"] },
        ].map(({ mode, num, dot, dotText, title, desc, tags }) => (
          <div key={mode} onClick={()=>onMode(mode)}
            style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"22px", cursor:"pointer", transition:"border-color 0.15s", position:"relative" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.borderHover}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{ display:"flex", alignItems:"center", gap:"7px", marginBottom:"14px" }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:dot }} />
              <span style={{ fontFamily:MONO, fontSize:"10px", color:dotText }}>{num} / {mode}</span>
            </div>
            <div style={{ fontFamily:SANS, fontSize:"16px", fontWeight:600, color:C.text, marginBottom:"10px" }}>{title}</div>
            <div style={{ fontFamily:SANS, fontSize:"14px", color:C.textDim, lineHeight:1.7, marginBottom:"16px" }}>{desc}</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"5px" }}>{tags.map(t=><Badge key={t} color={C.textDim} bg={C.bg} border={C.border}>{t}</Badge>)}</div>
            <div style={{ position:"absolute", bottom:"20px", right:"20px", fontFamily:SANS, fontSize:"16px", color:C.borderHover }}>→</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ROOT APP ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
  // screen: role-select | candidate-landing | candidate-upload | candidate-quiz | candidate-results
  //         manager-upload | manager-results
  const [screen, setScreen] = useState("role-select");
  const [role, setRole]     = useState(null); // "candidate" | "manager"
  const [result, setResult] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  const handleRoleSelect = r => { setRole(r); setScreen(r === "manager" ? "manager-upload" : "candidate-landing"); };
  const handleResult     = data => { setResult(data); setIsDemo(false); setScreen(role === "manager" ? "manager-results" : "candidate-results"); };
  const handleDemo       = () => { setResult(DEMO_RESULT); setIsDemo(true); setScreen(role === "manager" ? "manager-results" : "candidate-results"); };
  const handleReset      = () => { setResult(null); setIsDemo(false); setScreen("role-select"); setRole(null); };

  const roleLabel = role === "manager" ? "Manager" : role === "candidate" ? "Candidate" : null;
  const roleColor = role === "manager" ? C.purple : C.accent;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html, body { background:#0C0E12; color:#F1F3F5; min-height:100vh; font-family:'Inter',sans-serif; font-size:16px; -webkit-font-smoothing:antialiased; }
        input, textarea { color-scheme:dark; }
        input:focus, textarea:focus { border-color:#3B82F6 !important; box-shadow:0 0 0 3px #3B82F620; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dot { 0%,100%{opacity:.15;transform:scale(.7)} 50%{opacity:1;transform:scale(1)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#1E2028;border-radius:2px}
      `}</style>

      <div style={{ minHeight:"100vh", background:"#0C0E12" }}>
        {/* Header */}
        <div style={{ borderBottom:`1px solid ${C.border}`, background:C.bg, padding:"0 24px", position:"sticky", top:0, zIndex:10 }}>
          <div style={{ maxWidth:"720px", margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:"52px" }}>
            <div onClick={handleReset} style={{ display:"flex", alignItems:"center", gap:"10px", cursor:"pointer" }}>
              <div style={{ width:"22px", height:"22px", borderRadius:"5px", background:C.accent, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="11" height="11" viewBox="0 0 10 10" fill="#fff"><polygon points="5,1 9,5 5,9 1,5"/></svg>
              </div>
              <span style={{ fontFamily:SANS, fontSize:"15px", fontWeight:700, color:C.text, letterSpacing:"-0.01em" }}>PathwayAI</span>
              <span style={{ fontFamily:MONO, fontSize:"10px", color:C.accent, background:`${C.accent}15`, border:`1px solid ${C.accentBorder}`, borderRadius:"4px", padding:"2px 6px" }}>v1.0</span>
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              {/* Show current role pill */}
              {roleLabel && (
                <span style={{ fontFamily:MONO, fontSize:"10px", color:roleColor, background:`${roleColor}15`, border:`1px solid ${roleColor}30`, borderRadius:"4px", padding:"3px 8px" }}>
                  {roleLabel} mode
                </span>
              )}
              {/* Demo button — only after role is selected */}
              {role && screen !== "role-select" && (
                <button onClick={handleDemo} style={{ display:"inline-flex", alignItems:"center", gap:"7px", padding:"5px 12px", borderRadius:"6px", border:`1px solid ${C.border}`, background:"none", cursor:"pointer", fontFamily:SANS, fontSize:"13px", color:C.textDim, fontWeight:500, transition:"all 0.15s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderHover;e.currentTarget.style.color=C.text;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textDim;}}>
                  <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:C.green }} /> Demo
                </button>
              )}
              {/* Switch role */}
              {role && (
                <button onClick={()=>{ setRole(null); setScreen("role-select"); setResult(null); }} style={{ padding:"5px 12px", borderRadius:"6px", border:`1px solid ${C.border}`, background:"none", cursor:"pointer", fontFamily:SANS, fontSize:"13px", color:C.textDim, transition:"all 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=C.borderHover}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                  Switch role
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth:"720px", margin:"0 auto", padding:"0 24px 80px" }}>
          {screen === "role-select"        && <RoleSelector onSelect={handleRoleSelect} />}
          {screen === "candidate-landing"  && <div style={{ paddingTop:"40px" }}><CandidateLanding onMode={m => setScreen(m==="upload"?"candidate-upload":"candidate-quiz")} /></div>}
          {screen === "candidate-upload"   && <div style={{ paddingTop:"40px" }}><UploadView role="candidate" onComplete={handleResult} /></div>}
          {screen === "candidate-quiz"     && <div style={{ paddingTop:"40px" }}><QuizView onComplete={handleResult} /></div>}
          {screen === "candidate-results"  && <div style={{ paddingTop:"32px" }}><CandidateResults result={result} onReset={handleReset} isDemo={isDemo} /></div>}
          {screen === "manager-upload"     && <div style={{ paddingTop:"40px" }}><UploadView role="manager" onComplete={handleResult} /></div>}
          {screen === "manager-results"    && <div style={{ paddingTop:"32px" }}><ManagerResults result={result} onReset={handleReset} isDemo={isDemo} /></div>}
        </div>
      </div>
    </>
  );
}
