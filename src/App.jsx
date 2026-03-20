import { useState, useRef, useCallback, useEffect } from "react";

// ── Demo Data ─────────────────────────────────────────────────────────────────

const DEMO_RESULT = {
  candidateName: "Alex Chen",
  targetRole: "Senior Product Manager",
  readinessScore: 62,
  timeToCompetency: "4–5 weeks",
  resumeSkills: [
    { skill: "SQL", level: "expert", yearsExp: 5 },
    { skill: "Figma", level: "intermediate", yearsExp: 3 },
    { skill: "Python", level: "beginner", yearsExp: 1 },
    { skill: "Agile / Scrum", level: "expert", yearsExp: 4 },
    { skill: "A/B Testing", level: "intermediate", yearsExp: 2 },
    { skill: "Stakeholder Mgmt", level: "intermediate", yearsExp: 3 },
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
  pathway: [
    {
      phase: 1, title: "Foundation Sprint", duration: "Week 1–2",
      modules: [
        { name: "B2B SaaS Metrics Crash Course", description: "ARR, NRR, churn, LTV/CAC — every metric your team references daily.", type: "video", estimatedHours: 4, skills: ["B2B SaaS Metrics"] },
        { name: "OKR Workshop", description: "Write your first quarter's OKRs alongside the team. Learn the company goal-setting language.", type: "workshop", estimatedHours: 3, skills: ["OKR Frameworks"] },
        { name: "Roadmap Tool Onboarding", description: "Get up to speed on Linear / Productboard workflows and team conventions.", type: "reading", estimatedHours: 2, skills: ["Roadmapping Tools"] },
      ],
    },
    {
      phase: 2, title: "Strategy & Storytelling", duration: "Week 3",
      modules: [
        { name: "Product Strategy Fundamentals", description: "Jobs-to-be-done, positioning, anchoring every decision to company strategy.", type: "reading", estimatedHours: 5, skills: ["Product Strategy"] },
        { name: "Executive Storytelling Lab", description: "Write and present a mock product review. Get feedback from your PM lead.", type: "workshop", estimatedHours: 4, skills: ["Executive Storytelling"] },
      ],
    },
    {
      phase: 3, title: "Applied Practice", duration: "Week 4–5",
      modules: [
        { name: "Shadow & Co-pilot Sprint", description: "Shadow a senior PM through a full cycle, then co-own a feature end-to-end.", type: "project", estimatedHours: 10, skills: ["Product Strategy", "OKR Frameworks"] },
        { name: "30-Day Review Assessment", description: "Present your first product proposal to leadership for real feedback.", type: "assessment", estimatedHours: 3, skills: ["Executive Storytelling", "Product Strategy"] },
      ],
    },
  ],
};

// ── Typography scale ──────────────────────────────────────────────────────────
// Inter → all body, headings, descriptions, buttons, inputs
// JetBrains Mono → ONLY badges, short labels, metadata tags, monospace snippets

const SANS = "'Inter', sans-serif";
const MONO = "'JetBrains Mono', monospace";

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:           "#0C0E12",
  surface:      "#111318",
  surfaceHover: "#161920",
  border:       "#1E2028",
  borderHover:  "#2A2D38",
  text:         "#F1F3F5",
  textMid:      "#9CA3AF",
  textDim:      "#6B7280",
  textFaint:    "#374151",
  accent:       "#3B82F6",
  accentBg:     "#1E3A5F40",
  accentBorder: "#3B82F630",
  accentText:   "#93C5FD",
  green:        "#22C55E",
  greenText:    "#86EFAC",
  greenBg:      "#14532D30",
  greenBorder:  "#14532D50",
  yellow:       "#FCD34D",
  yellowBg:     "#78350F30",
  yellowBorder: "#78350F50",
  red:          "#FCA5A5",
  redBg:        "#7F1D1D30",
  redBorder:    "#7F1D1D50",
  purple:       "#C4B5FD",
  purpleBg:     "#2E106530",
  purpleBorder: "#4C1D9530",
};

const typeStyle = {
  video:      { color: C.accentText, bg: C.accentBg,  border: C.accentBorder },
  workshop:   { color: C.yellow,    bg: C.yellowBg,  border: C.yellowBorder },
  reading:    { color: C.textMid,   bg: C.border,    border: C.borderHover  },
  project:    { color: C.greenText, bg: C.greenBg,   border: C.greenBorder  },
  assessment: { color: C.red,       bg: C.redBg,     border: C.redBorder    },
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
{"candidateName":"string","targetRole":"string","resumeSkills":[{"skill":"string","level":"beginner|intermediate|expert","yearsExp":0}],"requiredSkills":[{"skill":"string","importance":"critical|important|nice-to-have"}],"gaps":[{"skill":"string","importance":"critical|important|nice-to-have","currentLevel":"none|beginner|intermediate","targetLevel":"intermediate|expert"}],"strengths":["string"],"pathway":[{"phase":1,"title":"string","duration":"string","modules":[{"name":"string","description":"string","type":"video|workshop|reading|project|assessment","estimatedHours":0,"skills":["string"]}]}],"timeToCompetency":"string","readinessScore":0}`;

const QUIZ_PROMPT = `You are an adaptive skills diagnostic engine. Given a role/JD, generate exactly 8 diagnostic questions. Return ONLY valid JSON — no markdown, no backticks.
{"role":"string","questions":[{"id":1,"skill":"string","question":"string","options":[{"label":"string","level":"none|beginner|intermediate|expert"}]}]}`;

async function callClaude(system, userContent) {
  const content = typeof userContent === "string" ? [{ type: "text", text: userContent }] : userContent;
  const headers = { "Content-Type": "application/json" };
  if (ANTHROPIC_API_KEY) headers["x-api-key"] = ANTHROPIC_API_KEY;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers,
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 3000, system, messages: [{ role: "user", content }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim());
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────

// Badge — mono, small, pill. Used ONLY for: status tags, type tags, level tags.
function Badge({ children, color, bg, border }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: "4px", fontFamily: MONO, fontSize: "11px", fontWeight: 500, color, background: bg, border: `1px solid ${border}`, whiteSpace: "nowrap", letterSpacing: "0.01em" }}>
      {children}
    </span>
  );
}

function ImportanceBadge({ importance }) {
  const s = {
    critical:       { color: C.red,      bg: C.redBg,    border: C.redBorder    },
    important:      { color: C.yellow,   bg: C.yellowBg, border: C.yellowBorder },
    "nice-to-have": { color: C.textDim,  bg: C.border,   border: C.borderHover  },
  }[importance] || { color: C.textDim, bg: C.border, border: C.borderHover };
  return <Badge color={s.color} bg={s.bg} border={s.border}>{importance}</Badge>;
}

function LevelBadge({ level }) {
  const s = {
    expert:       { color: C.greenText, bg: C.greenBg,  border: C.greenBorder  },
    intermediate: { color: C.yellow,   bg: C.yellowBg,  border: C.yellowBorder },
    beginner:     { color: C.textMid,  bg: C.border,    border: C.borderHover  },
    none:         { color: C.textDim,  bg: C.bg,        border: C.border       },
  }[level] || { color: C.textDim, bg: C.bg, border: C.border };
  return <Badge color={s.color} bg={s.bg} border={s.border}>{level}</Badge>;
}

function TypeBadge({ type }) {
  const s = typeStyle[type] || typeStyle.reading;
  return <Badge color={s.color} bg={s.bg} border={s.border}>{type}</Badge>;
}

// MetaLabel — mono, uppercase, tiny. Only for section headers like "ANALYSIS COMPLETE".
function MetaLabel({ children, color = C.textDim, style = {} }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: "10px", color, textTransform: "uppercase", letterSpacing: "0.1em", ...style }}>
      {children}
    </div>
  );
}

function Divider({ style = {} }) {
  return <div style={{ height: "1px", background: C.border, ...style }} />;
}

function Spinner({ label = "Running analysis…" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: "18px" }}>
      <div style={{ display: "flex", gap: "7px" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: C.accent, animation: `dot 1.1s ease-in-out ${i * 0.18}s infinite` }} />
        ))}
      </div>
      <div style={{ fontFamily: SANS, fontSize: "14px", color: C.textDim }}>{label}</div>
    </div>
  );
}

// ── DropZone ──────────────────────────────────────────────────────────────────

function DropZone({ label, file, onFile }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  const handle = f => {
    if (!f) return;
    if (["application/pdf", "text/plain"].includes(f.type) || f.name.endsWith(".pdf") || f.name.endsWith(".txt")) onFile(f);
  };
  const isPdf = file?.name?.endsWith(".pdf") || file?.type === "application/pdf";
  return (
    <div
      onClick={() => ref.current.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      style={{ flex: 1, border: `1px dashed ${drag ? C.accent : file ? C.borderHover : C.border}`, borderRadius: "8px", padding: "22px 16px", cursor: "pointer", background: drag ? `${C.accent}08` : C.surface, transition: "all 0.15s", textAlign: "center" }}
    >
      <input ref={ref} type="file" accept=".txt,.pdf" style={{ display: "none" }} onChange={e => handle(e.target.files[0])} />
      <MetaLabel style={{ marginBottom: "8px" }}>{label}</MetaLabel>
      <div style={{ fontFamily: SANS, fontSize: "14px", color: file ? C.accentText : C.textDim }}>
        {file ? file.name : "Drop or click to upload"}
      </div>
      {file && (
        <div style={{ fontFamily: MONO, fontSize: "10px", color: isPdf ? C.accent : C.textDim, marginTop: "4px" }}>
          {isPdf ? "PDF · native parse" : "plain text"}
        </div>
      )}
    </div>
  );
}

// ── Readiness Meter ───────────────────────────────────────────────────────────

function ReadinessMeter({ score }) {
  const [val, setVal] = useState(0);
  useEffect(() => { const t = setTimeout(() => setVal(score), 250); return () => clearTimeout(t); }, [score]);
  const color = score >= 70 ? C.greenText : score >= 40 ? C.yellow : C.red;
  const label = score >= 70 ? "Strong match" : score >= 40 ? "Partial match" : "Needs development";
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "20px 24px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "24px" }}>
      <div style={{ minWidth: "90px" }}>
        <MetaLabel style={{ marginBottom: "8px" }}>Readiness Score</MetaLabel>
        <div style={{ fontFamily: MONO, fontSize: "44px", fontWeight: 700, color, lineHeight: 1, letterSpacing: "-0.03em" }}>
          {val}<span style={{ fontSize: "18px", color: C.textDim, fontWeight: 400 }}>/100</span>
        </div>
        <div style={{ fontFamily: SANS, fontSize: "13px", color, marginTop: "6px", fontWeight: 500 }}>{label}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ height: "5px", background: C.border, borderRadius: "999px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${val}%`, background: color, borderRadius: "999px", transition: "width 1.1s cubic-bezier(0.4,0,0.2,1)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
          <span style={{ fontFamily: MONO, fontSize: "10px", color: C.textDim }}>0</span>
          <span style={{ fontFamily: MONO, fontSize: "10px", color: C.textDim }}>100</span>
        </div>
      </div>
    </div>
  );
}

// ── Module row ────────────────────────────────────────────────────────────────

function ModuleRow({ mod, isLast }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 0", borderBottom: isLast ? "none" : `1px solid ${C.border}` }}>
      <div style={{ paddingTop: "2px", flexShrink: 0 }}><TypeBadge type={mod.type} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: SANS, fontSize: "15px", fontWeight: 600, color: C.text, marginBottom: "5px" }}>{mod.name}</div>
        <div style={{ fontFamily: SANS, fontSize: "13px", color: C.textMid, lineHeight: 1.65 }}>{mod.description}</div>
      </div>
      <div style={{ fontFamily: MONO, fontSize: "11px", color: C.textDim, flexShrink: 0, paddingTop: "3px" }}>{mod.estimatedHours}h</div>
    </div>
  );
}

// ── Phase card ────────────────────────────────────────────────────────────────

function PhaseCard({ phase, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const totalH = phase.modules.reduce((s, m) => s + m.estimatedHours, 0);
  return (
    <div style={{ background: C.surface, border: `1px solid ${open ? C.borderHover : C.border}`, borderRadius: "10px", overflow: "hidden", marginBottom: "8px", transition: "border-color 0.15s" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px", cursor: "pointer", background: open ? C.surfaceHover : "transparent", transition: "background 0.15s" }}>
        <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: open ? C.accent : C.border, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: "11px", color: open ? "#fff" : C.textDim, fontWeight: 600, transition: "all 0.15s", flexShrink: 0 }}>{phase.phase}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: SANS, fontSize: "16px", fontWeight: 600, color: open ? C.text : C.textMid }}>{phase.title}</div>
          <div style={{ fontFamily: MONO, fontSize: "11px", color: C.textDim, marginTop: "3px" }}>{phase.duration} · {totalH}h · {phase.modules.length} modules</div>
        </div>
        <div style={{ color: C.textDim, fontSize: "12px", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>▼</div>
      </div>
      {open && (
        <div style={{ padding: "0 20px 6px", borderTop: `1px solid ${C.border}` }}>
          {phase.modules.map((m, i) => <ModuleRow key={i} mod={m} isLast={i === phase.modules.length - 1} />)}
        </div>
      )}
    </div>
  );
}

// ── Results view ──────────────────────────────────────────────────────────────

function ResultsView({ result, onReset, isDemo }) {
  const [tab, setTab] = useState("pathway");

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      {isDemo && (
        <div style={{ background: `${C.accent}12`, border: `1px solid ${C.accentBorder}`, borderRadius: "8px", padding: "11px 16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.green, flexShrink: 0 }} />
          <span style={{ fontFamily: SANS, fontSize: "13px", color: C.accentText }}>Demo mode — sample output for Alex Chen → Senior PM</span>
          <button onClick={onReset} style={{ marginLeft: "auto", background: "none", border: `1px solid ${C.border}`, borderRadius: "6px", padding: "5px 12px", cursor: "pointer", fontFamily: SANS, fontSize: "13px", color: C.textDim }}>Try real →</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <MetaLabel style={{ marginBottom: "8px" }}>Analysis complete</MetaLabel>
          <div style={{ fontFamily: SANS, fontSize: "24px", fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>{result.candidateName}</div>
          <div style={{ fontFamily: SANS, fontSize: "15px", color: C.textDim, marginTop: "4px" }}>→ {result.targetRole}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <MetaLabel style={{ marginBottom: "8px" }}>Competency in</MetaLabel>
          <div style={{ fontFamily: MONO, fontSize: "16px", color: C.accent, fontWeight: 500 }}>{result.timeToCompetency}</div>
          {!isDemo && (
            <button onClick={onReset} style={{ marginTop: "10px", display: "block", marginLeft: "auto", background: "none", border: `1px solid ${C.border}`, borderRadius: "6px", padding: "6px 14px", cursor: "pointer", fontFamily: SANS, fontSize: "13px", color: C.textDim, transition: "border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.borderHover}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              ← New analysis
            </button>
          )}
        </div>
      </div>

      <ReadinessMeter score={result.readinessScore} />

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: "20px" }}>
        {[["pathway", "Pathway"], ["gaps", `Gaps (${result.gaps?.length})`], ["strengths", "Strengths"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: "10px 18px", border: "none", background: "none", cursor: "pointer", fontFamily: SANS, fontSize: "14px", fontWeight: tab === id ? 600 : 400, color: tab === id ? C.text : C.textDim, borderBottom: `2px solid ${tab === id ? C.accent : "transparent"}`, marginBottom: "-1px", transition: "all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Pathway */}
      {tab === "pathway" && (
        <div>{result.pathway?.map((p, i) => <PhaseCard key={i} phase={p} defaultOpen={i === 0} />)}</div>
      )}

      {/* Gaps */}
      {tab === "gaps" && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "10px", overflow: "hidden" }}>
          {result.gaps?.map((g, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px", borderBottom: i < result.gaps.length - 1 ? `1px solid ${C.border}` : "none", animation: `fadeUp 0.2s ease ${i * 0.04}s both` }}>
              <ImportanceBadge importance={g.importance} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: SANS, fontSize: "15px", fontWeight: 600, color: C.text }}>{g.skill}</div>
                <div style={{ fontFamily: SANS, fontSize: "13px", color: C.textDim, marginTop: "3px" }}>
                  {g.currentLevel === "none" ? "Not on resume" : g.currentLevel} → {g.targetLevel}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Strengths */}
      {tab === "strengths" && (
        <div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "10px", overflow: "hidden", marginBottom: "20px" }}>
            {result.strengths?.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: "14px", padding: "16px 20px", borderBottom: i < result.strengths.length - 1 ? `1px solid ${C.border}` : "none", animation: `fadeUp 0.2s ease ${i * 0.05}s both` }}>
                <span style={{ color: C.green, flexShrink: 0, fontSize: "15px", marginTop: "1px" }}>✓</span>
                <span style={{ fontFamily: SANS, fontSize: "14px", color: C.textMid, lineHeight: 1.7 }}>{s}</span>
              </div>
            ))}
          </div>
          <MetaLabel style={{ marginBottom: "12px" }}>Detected Skills</MetaLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {result.resumeSkills?.map(s => (
              <span key={s.skill} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderRadius: "6px", background: C.surface, border: `1px solid ${C.border}`, fontFamily: SANS, fontSize: "13px", color: C.textMid }}>
                {s.skill} <LevelBadge level={s.level} />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Quiz view ─────────────────────────────────────────────────────────────────

function QuizView({ onComplete, onBack }) {
  const [step, setStep]     = useState("setup");
  const [jdText, setJdText] = useState("");
  const [name, setName]     = useState("");
  const [quiz, setQuiz]     = useState(null);
  const [answers, setAnswers] = useState({});
  const [cur, setCur]       = useState(0);
  const [error, setError]   = useState(null);
  const [loadMsg, setLoadMsg] = useState("");

  const start = async () => {
    if (!jdText.trim()) return;
    setStep("loading"); setLoadMsg("Generating your diagnostic…"); setError(null);
    try { const d = await callClaude(QUIZ_PROMPT, `Role/JD: ${jdText}`); setQuiz(d); setAnswers({}); setCur(0); setStep("questions"); }
    catch (e) { setError(e.message); setStep("setup"); }
  };

  const pick = (qi, oi) => {
    setAnswers(a => ({ ...a, [qi]: oi }));
    if (qi < quiz.questions.length - 1) setTimeout(() => setCur(qi + 1), 300);
  };

  const submit = async () => {
    setStep("loading"); setLoadMsg("Building your pathway…");
    try {
      const summary = quiz.questions.map((q, i) => { const o = q.options[answers[i]]; return `${q.skill}: ${o?.label} (${o?.level})`; }).join("\n");
      const data = await callClaude(ANALYSIS_PROMPT, `Candidate: ${name || "New Hire"}\nRole: ${quiz.role}\n\nQuiz results:\n${summary}`);
      onComplete(data);
    } catch (e) { setError(e.message); setStep("questions"); }
  };

  const allDone = quiz && Object.keys(answers).length === quiz.questions.length;

  const inputStyle = {
    width: "100%", background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: "8px", padding: "11px 14px", color: C.text,
    fontFamily: SANS, fontSize: "14px", outline: "none",
  };

  if (step === "loading") return <Spinner label={loadMsg} />;

  if (step === "setup") return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: SANS, fontSize: "14px", color: C.textDim, padding: 0, marginBottom: "28px" }}>← Back</button>
      <MetaLabel style={{ marginBottom: "8px" }}>Diagnostic Quiz</MetaLabel>
      <div style={{ fontFamily: SANS, fontSize: "22px", fontWeight: 700, color: C.text, letterSpacing: "-0.02em", marginBottom: "8px" }}>No resume needed.</div>
      <div style={{ fontFamily: SANS, fontSize: "15px", color: C.textDim, lineHeight: 1.7, marginBottom: "28px" }}>Describe the target role and answer 8 adaptive questions. We'll infer your skill level and generate a personalised pathway.</div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 500, color: C.textMid, display: "block", marginBottom: "7px" }}>Your name <span style={{ color: C.textDim }}>(optional)</span></label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Sharma" style={inputStyle} />
      </div>
      <div style={{ marginBottom: "24px" }}>
        <label style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 500, color: C.textMid, display: "block", marginBottom: "7px" }}>Target role or job description</label>
        <textarea value={jdText} onChange={e => setJdText(e.target.value)} placeholder={`e.g. "Senior Data Engineer at a fintech startup" — or paste the full JD`} style={{ ...inputStyle, minHeight: "120px", resize: "vertical", lineHeight: 1.65 }} />
      </div>

      {error && <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: "8px", padding: "12px 14px", marginBottom: "16px", fontFamily: SANS, fontSize: "13px", color: C.red }}>{error}</div>}

      <button onClick={start} disabled={!jdText.trim()} style={{ width: "100%", padding: "13px", borderRadius: "8px", background: jdText.trim() ? C.accent : C.border, color: jdText.trim() ? "#fff" : C.textDim, border: "none", cursor: jdText.trim() ? "pointer" : "not-allowed", fontFamily: SANS, fontSize: "15px", fontWeight: 600, transition: "all 0.2s" }}>
        Generate Diagnostic →
      </button>
    </div>
  );

  if (step === "questions" && quiz) {
    const q = quiz.questions[cur];
    const levelStyle = {
      none:         { color: C.textDim,   bg: C.bg,       border: C.border,        selBorder: C.borderHover },
      beginner:     { color: C.textMid,   bg: C.surface,  border: C.border,        selBorder: C.borderHover },
      intermediate: { color: C.yellow,    bg: C.yellowBg, border: C.yellowBorder,  selBorder: "#FCD34D"     },
      expert:       { color: C.greenText, bg: C.greenBg,  border: C.greenBorder,   selBorder: "#86EFAC"     },
    };

    return (
      <div style={{ animation: "fadeUp 0.2s ease both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ fontFamily: SANS, fontSize: "13px", color: C.textDim }}>{quiz.role}</span>
          <span style={{ fontFamily: MONO, fontSize: "11px", color: C.textDim }}>{Object.keys(answers).length}/{quiz.questions.length} answered</span>
        </div>
        <div style={{ height: "3px", background: C.border, borderRadius: "999px", overflow: "hidden", marginBottom: "28px" }}>
          <div style={{ height: "100%", width: `${((cur + 1) / quiz.questions.length) * 100}%`, background: C.accent, borderRadius: "999px", transition: "width 0.3s ease" }} />
        </div>

        <div style={{ marginBottom: "10px" }}><Badge color={C.greenText} bg={C.greenBg} border={C.greenBorder}>{q.skill}</Badge></div>
        <div style={{ fontFamily: SANS, fontSize: "18px", fontWeight: 600, color: C.text, lineHeight: 1.5, marginBottom: "22px" }}>{q.question}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
          {q.options.map((opt, oi) => {
            const sel = answers[cur] === oi;
            const ls = levelStyle[opt.level] || levelStyle.none;
            return (
              <button key={oi} onClick={() => pick(cur, oi)} style={{ textAlign: "left", padding: "14px 16px", borderRadius: "8px", border: `1px solid ${sel ? ls.selBorder : C.border}`, background: sel ? ls.bg : C.surface, cursor: "pointer", transition: "all 0.13s", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: `2px solid ${sel ? ls.color : C.borderHover}`, background: sel ? ls.color : "transparent", flexShrink: 0, transition: "all 0.13s" }} />
                <span style={{ fontFamily: SANS, fontSize: "14px", color: sel ? C.text : C.textMid, flex: 1 }}>{opt.label}</span>
                {sel && <Badge color={ls.color} bg="transparent" border="transparent">{opt.level}</Badge>}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {cur > 0 && (
            <button onClick={() => setCur(cur - 1)} style={{ padding: "11px 16px", borderRadius: "8px", border: `1px solid ${C.border}`, background: "none", cursor: "pointer", fontFamily: SANS, fontSize: "14px", color: C.textDim }}>←</button>
          )}
          {cur < quiz.questions.length - 1
            ? <button onClick={() => setCur(cur + 1)} disabled={answers[cur] === undefined} style={{ flex: 1, padding: "11px", borderRadius: "8px", border: `1px solid ${C.border}`, background: "none", cursor: answers[cur] !== undefined ? "pointer" : "not-allowed", fontFamily: SANS, fontSize: "14px", color: answers[cur] !== undefined ? C.textMid : C.textDim }}>Next →</button>
            : <button onClick={submit} disabled={!allDone} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", background: allDone ? C.accent : C.border, color: allDone ? "#fff" : C.textDim, cursor: allDone ? "pointer" : "not-allowed", fontFamily: SANS, fontSize: "15px", fontWeight: 600, transition: "all 0.2s" }}>
                {allDone ? "Generate My Pathway →" : `${Object.keys(answers).length}/${quiz.questions.length} answered`}
              </button>
          }
        </div>

        {/* Dot nav */}
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "20px" }}>
          {quiz.questions.map((_, i) => (
            <div key={i} onClick={() => setCur(i)} style={{ width: "6px", height: "6px", borderRadius: "50%", cursor: "pointer", background: i === cur ? C.accent : answers[i] !== undefined ? C.borderHover : C.border, transition: "all 0.15s", transform: i === cur ? "scale(1.4)" : "scale(1)" }} />
          ))}
        </div>
        {error && <div style={{ marginTop: "14px", fontFamily: SANS, fontSize: "13px", color: C.red }}>{error}</div>}
      </div>
    );
  }
  return null;
}

// ── Upload view ───────────────────────────────────────────────────────────────

function UploadView({ onComplete }) {
  const [resumeFile, setResumeFile] = useState(null);
  const [jdFile, setJdFile]         = useState(null);
  const [jdText, setJdText]         = useState("");
  const [useText, setUseText]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState("");
  const [error, setError]           = useState(null);

  const msgs = ["Parsing resume…", "Extracting requirements…", "Computing skill gaps…", "Generating pathway…"];
  const canGo = resumeFile && (jdFile || jdText.trim());

  const analyze = useCallback(async () => {
    if (!canGo) return;
    setLoading(true); setError(null); setMsg(msgs[0]);
    let i = 0; const iv = setInterval(() => { i = (i + 1) % msgs.length; setMsg(msgs[i]); }, 1800);
    try {
      const rb = await fileToBlock(resumeFile, "RESUME");
      const jb = useText ? { type: "text", text: `JOB DESCRIPTION:\n${jdText}` } : await fileToBlock(jdFile, "JOB DESCRIPTION");
      const data = await callClaude(ANALYSIS_PROMPT, [rb, jb, { type: "text", text: "Return only the JSON." }]);
      onComplete(data);
    } catch (e) { setError(e.message || "Analysis failed. Please try again."); }
    finally { clearInterval(iv); setLoading(false); }
  }, [resumeFile, jdFile, jdText, useText]);

  if (loading) return <Spinner label={msg} />;

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      <MetaLabel style={{ marginBottom: "8px" }}>Upload Documents</MetaLabel>
      <div style={{ fontFamily: SANS, fontSize: "22px", fontWeight: 700, color: C.text, letterSpacing: "-0.02em", marginBottom: "8px" }}>Resume + Job Description</div>
      <div style={{ fontFamily: SANS, fontSize: "15px", color: C.textDim, lineHeight: 1.7, marginBottom: "24px" }}>Upload both files. The engine extracts your skills, computes the gap, and generates a sequenced training roadmap.</div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
        <DropZone label="Resume (.pdf or .txt)" file={resumeFile} onFile={setResumeFile} />
        {!useText && <DropZone label="Job Description" file={jdFile} onFile={setJdFile} />}
      </div>

      <button onClick={() => { setUseText(!useText); setJdFile(null); setJdText(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: SANS, fontSize: "13px", color: useText ? C.accent : C.textDim, padding: 0, marginBottom: "14px", textDecoration: "underline" }}>
        {useText ? "← Upload JD as file" : "Paste job description as text →"}
      </button>

      {useText && (
        <textarea value={jdText} onChange={e => setJdText(e.target.value)} placeholder="Paste the full job description here…" style={{ width: "100%", minHeight: "120px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "12px 14px", color: C.text, fontFamily: SANS, fontSize: "14px", lineHeight: 1.65, outline: "none", resize: "vertical", marginBottom: "14px" }} />
      )}

      {error && <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: "8px", padding: "12px 14px", marginBottom: "14px", fontFamily: SANS, fontSize: "13px", color: C.red }}>{error}</div>}

      <button onClick={analyze} disabled={!canGo} style={{ width: "100%", padding: "13px", borderRadius: "8px", background: canGo ? C.accent : C.border, color: canGo ? "#fff" : C.textDim, border: "none", cursor: canGo ? "pointer" : "not-allowed", fontFamily: SANS, fontSize: "15px", fontWeight: 600, transition: "all 0.2s" }}>
        Run Analysis →
      </button>
    </div>
  );
}

// ── Landing view ──────────────────────────────────────────────────────────────

function LandingView({ onMode, onDemo }) {
  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      <div style={{ paddingTop: "52px", paddingBottom: "40px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "4px 12px", borderRadius: "5px", background: `${C.accent}15`, border: `1px solid ${C.accentBorder}`, marginBottom: "20px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.green }} />
          <span style={{ fontFamily: MONO, fontSize: "10px", color: C.accentText, letterSpacing: "0.06em" }}>Adaptive Onboarding Engine · v1.0</span>
        </div>

        <h1 style={{ fontFamily: SANS, fontSize: "36px", fontWeight: 700, color: C.text, letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: "16px" }}>
          Personalised learning<br />pathways. At hire time.
        </h1>
        <p style={{ fontFamily: SANS, fontSize: "16px", color: C.textDim, lineHeight: 1.75, maxWidth: "460px", marginBottom: "28px" }}>
          Parses your existing skills. Maps the gap to the role. Generates a sequenced training roadmap that skips what you already know.
        </p>

        <button onClick={onDemo} style={{ display: "inline-flex", alignItems: "center", gap: "9px", padding: "10px 18px", borderRadius: "8px", border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", fontFamily: SANS, fontSize: "14px", color: C.textMid, transition: "all 0.15s", fontWeight: 500 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.color = C.text; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid; }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.green }} />
          View demo output →
        </button>
      </div>

      <Divider style={{ marginBottom: "32px" }} />

      <div style={{ display: "flex", gap: "12px" }}>
        {[
          { mode: "upload", num: "01", dot: C.accent,    dotText: C.accentText, title: "Upload Resume + JD",   desc: "Have a resume? Upload it alongside the job description for automatic skill extraction and gap analysis.", tags: ["PDF support", "Native parsing", "Instant gaps"] },
          { mode: "quiz",   num: "02", dot: "#8B5CF6",   dotText: C.purple,     title: "Diagnostic Quiz",      desc: "No resume? Answer 8 adaptive questions tailored to your target role and we'll build your pathway.", tags: ["No resume needed", "8 questions", "Adaptive scoring"] },
        ].map(({ mode, num, dot, dotText, title, desc, tags }) => (
          <div key={mode} onClick={() => onMode(mode)}
            style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "22px", cursor: "pointer", transition: "border-color 0.15s", position: "relative" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.borderHover}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "14px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: dot }} />
              <span style={{ fontFamily: MONO, fontSize: "10px", color: dotText }}>{num} / {mode}</span>
            </div>
            <div style={{ fontFamily: SANS, fontSize: "16px", fontWeight: 600, color: C.text, marginBottom: "10px" }}>{title}</div>
            <div style={{ fontFamily: SANS, fontSize: "14px", color: C.textDim, lineHeight: 1.7, marginBottom: "16px" }}>{desc}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {tags.map(t => <Badge key={t} color={C.textDim} bg={C.bg} border={C.border}>{t}</Badge>)}
            </div>
            <div style={{ position: "absolute", bottom: "20px", right: "20px", fontFamily: SANS, fontSize: "16px", color: C.borderHover }}>→</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState("landing");
  const [result, setResult] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  const done  = data => { setResult(data);        setIsDemo(false); setScreen("results"); };
  const demo  = ()   => { setResult(DEMO_RESULT); setIsDemo(true);  setScreen("results"); };
  const reset = ()   => { setResult(null);         setIsDemo(false); setScreen("landing"); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #0C0E12; color: #F1F3F5; min-height: 100vh; font-family: 'Inter', sans-serif; font-size: 16px; -webkit-font-smoothing: antialiased; }
        input, textarea { color-scheme: dark; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dot { 0%,100% { opacity: 0.15; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1E2028; border-radius: 2px; }
        input:focus, textarea:focus { border-color: #3B82F6 !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0C0E12" }}>
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${C.border}`, background: C.bg, padding: "0 24px", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ maxWidth: "700px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "52px" }}>
            <div onClick={reset} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "5px", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="11" height="11" viewBox="0 0 10 10" fill="#fff"><polygon points="5,1 9,5 5,9 1,5"/></svg>
              </div>
              <span style={{ fontFamily: SANS, fontSize: "15px", fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>PathwayAI</span>
              <span style={{ fontFamily: MONO, fontSize: "10px", color: C.accent, background: `${C.accent}15`, border: `1px solid ${C.accentBorder}`, borderRadius: "4px", padding: "2px 6px" }}>v1.0</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {screen !== "landing" && screen !== "results" && (
                <>
                  {[["upload", "Upload"], ["quiz", "Quiz"]].map(([m, l]) => (
                    <button key={m} onClick={() => setScreen(m)} style={{ padding: "5px 12px", borderRadius: "6px", border: `1px solid ${screen === m ? C.borderHover : C.border}`, background: screen === m ? C.surface : "none", cursor: "pointer", fontFamily: SANS, fontSize: "13px", fontWeight: screen === m ? 500 : 400, color: screen === m ? C.text : C.textDim, transition: "all 0.15s" }}>{l}</button>
                  ))}
                  <div style={{ width: "1px", height: "16px", background: C.border, margin: "0 2px" }} />
                </>
              )}
              <button onClick={demo} style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "5px 12px", borderRadius: "6px", border: `1px solid ${C.border}`, background: "none", cursor: "pointer", fontFamily: SANS, fontSize: "13px", color: C.textDim, transition: "all 0.15s", fontWeight: 500 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.color = C.text; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.green }} />
                Demo
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: "700px", margin: "0 auto", padding: "0 24px 80px" }}>
          {screen === "landing"  && <LandingView onMode={setScreen} onDemo={demo} />}
          {screen === "upload"   && <div style={{ paddingTop: "40px" }}><UploadView  onComplete={done} /></div>}
          {screen === "quiz"     && <div style={{ paddingTop: "40px" }}><QuizView    onComplete={done} onBack={() => setScreen("landing")} /></div>}
          {screen === "results"  && <div style={{ paddingTop: "32px" }}><ResultsView result={result} onReset={reset} isDemo={isDemo} /></div>}
        </div>
      </div>
    </>
  );
}
