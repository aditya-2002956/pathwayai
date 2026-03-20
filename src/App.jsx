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

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg: "#0C0E12",
  surface: "#111318",
  surfaceHover: "#161920",
  border: "#1E2028",
  borderHover: "#2A2D38",
  text: "#F1F3F5",
  textMid: "#9CA3AF",
  textDim: "#4B5563",
  textFaint: "#374151",
  accent: "#3B82F6",
  accentBg: "#1E3A5F40",
  accentBorder: "#3B82F630",
  accentText: "#93C5FD",
  green: "#22C55E",
  greenText: "#86EFAC",
  greenBg: "#14532D30",
  greenBorder: "#14532D50",
  yellow: "#FCD34D",
  yellowText: "#FCD34D",
  yellowBg: "#78350F30",
  yellowBorder: "#78350F50",
  red: "#FCA5A5",
  redBg: "#7F1D1D30",
  redBorder: "#7F1D1D50",
  purple: "#C4B5FD",
  purpleBg: "#2E1065,30",
  purpleBorder: "#4C1D9530",
};

const typeStyle = {
  video:      { color: C.accentText,  bg: C.accentBg,  border: C.accentBorder },
  workshop:   { color: C.yellowText,  bg: C.yellowBg,  border: C.yellowBorder },
  reading:    { color: C.textMid,     bg: C.border,    border: C.borderHover  },
  project:    { color: C.greenText,   bg: C.greenBg,   border: C.greenBorder  },
  assessment: { color: C.red,         bg: C.redBg,     border: C.redBorder    },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const readFileAsText = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); });
const readFileAsBase64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });

const fileToBlock = async (file, label) => {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (isPdf) { const b64 = await readFileAsBase64(file); return { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 }, title: label }; }
  return { type: "text", text: `${label}:\n${await readFileAsText(file)}` };
};

const ANTHROPIC_API_KEY = import.meta?.env?.VITE_ANTHROPIC_API_KEY;

const ANALYSIS_PROMPT = `You are an expert L&D analyst. Analyze the resume and job description. Return ONLY valid JSON — no markdown, no backticks, no explanation.
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

// ── Shared components ─────────────────────────────────────────────────────────

function Badge({ children, color, bg, border }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: "3px", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", fontWeight: 500, color, background: bg, border: `1px solid ${border}`, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function ImportanceBadge({ importance }) {
  const styles = {
    critical:     { color: C.red,      bg: C.redBg,    border: C.redBorder    },
    important:    { color: C.yellow,   bg: C.yellowBg, border: C.yellowBorder },
    "nice-to-have": { color: C.textDim, bg: C.border,  border: C.borderHover  },
  };
  const s = styles[importance] || styles["nice-to-have"];
  return <Badge color={s.color} bg={s.bg} border={s.border}>{importance}</Badge>;
}

function LevelBadge({ level }) {
  const styles = {
    expert:       { color: C.greenText, bg: C.greenBg,  border: C.greenBorder  },
    intermediate: { color: C.yellow,   bg: C.yellowBg,  border: C.yellowBorder },
    beginner:     { color: C.textMid,  bg: C.border,    border: C.borderHover  },
    none:         { color: C.textDim,  bg: C.bg,        border: C.border       },
  };
  const s = styles[level] || styles.none;
  return <Badge color={s.color} bg={s.bg} border={s.border}>{level}</Badge>;
}

function TypeBadge({ type }) {
  const s = typeStyle[type] || typeStyle.reading;
  return <Badge color={s.color} bg={s.bg} border={s.border}>{type}</Badge>;
}

function Label({ children, style = {} }) {
  return <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", ...style }}>{children}</div>;
}

function Divider({ style = {} }) {
  return <div style={{ height: "1px", background: C.border, ...style }} />;
}

function Spinner({ label = "Running analysis…" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: "16px" }}>
      <div style={{ display: "flex", gap: "6px" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.accent, animation: `dot 1.1s ease-in-out ${i * 0.18}s infinite` }} />
        ))}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: C.textDim }}>{label}</div>
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
      style={{ flex: 1, border: `1px dashed ${drag ? C.accent : file ? C.borderHover : C.border}`, borderRadius: "7px", padding: "18px 14px", cursor: "pointer", background: drag ? `${C.accent}08` : C.surface, transition: "all 0.15s", textAlign: "center" }}
    >
      <input ref={ref} type="file" accept=".txt,.pdf" style={{ display: "none" }} onChange={e => handle(e.target.files[0])} />
      <Label style={{ marginBottom: "6px" }}>{label}</Label>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: file ? C.accentText : C.textDim }}>
        {file ? file.name : "drop or click"}
      </div>
      {file && <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: isPdf ? C.accent : C.textDim, marginTop: "3px" }}>{isPdf ? "PDF · native parse" : "plain text"}</div>}
    </div>
  );
}

// ── Readiness Meter ───────────────────────────────────────────────────────────

function ReadinessMeter({ score }) {
  const [val, setVal] = useState(0);
  useEffect(() => { const t = setTimeout(() => setVal(score), 250); return () => clearTimeout(t); }, [score]);
  const color = score >= 70 ? C.greenText : score >= 40 ? C.yellow : C.red;
  const label = score >= 70 ? "strong match" : score >= 40 ? "partial match" : "needs development";
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "18px 20px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "20px" }}>
      <div style={{ minWidth: "80px" }}>
        <Label style={{ marginBottom: "6px" }}>readiness score</Label>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "38px", fontWeight: 700, color, lineHeight: 1, letterSpacing: "-0.03em" }}>
          {val}<span style={{ fontSize: "14px", color: C.textDim, fontWeight: 400 }}>/100</span>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color, marginTop: "4px" }}>{label}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ height: "4px", background: C.border, borderRadius: "999px", overflow: "hidden", marginBottom: "10px" }}>
          <div style={{ height: "100%", width: `${val}%`, background: color, borderRadius: "999px", transition: "width 1.1s cubic-bezier(0.4,0,0.2,1)" }} />
        </div>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {/* placeholder skill pills shown in meter */}
        </div>
      </div>
    </div>
  );
}

// ── Module row ────────────────────────────────────────────────────────────────

function ModuleRow({ mod, isLast }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 0", borderBottom: isLast ? "none" : `1px solid ${C.border}` }}>
      <TypeBadge type={mod.type} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "12px", fontWeight: 500, color: C.text, marginBottom: "3px" }}>{mod.name}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: C.textDim, lineHeight: 1.6 }}>{mod.description}</div>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: C.textFaint, flexShrink: 0 }}>{mod.estimatedHours}h</div>
    </div>
  );
}

// ── Phase card ────────────────────────────────────────────────────────────────

function PhaseCard({ phase, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const totalH = phase.modules.reduce((s, m) => s + m.estimatedHours, 0);
  return (
    <div style={{ background: C.surface, border: `1px solid ${open ? C.borderHover : C.border}`, borderRadius: "8px", overflow: "hidden", marginBottom: "6px", transition: "border-color 0.15s" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", cursor: "pointer", background: open ? C.surfaceHover : "transparent", transition: "background 0.15s" }}>
        <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: open ? C.accent : C.border, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: open ? "#fff" : C.textDim, fontWeight: 600, transition: "all 0.15s", flexShrink: 0 }}>{phase.phase}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: open ? C.text : C.textMid }}>{phase.title}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: C.textDim, marginTop: "2px" }}>{phase.duration} · {totalH}h · {phase.modules.length} modules</div>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: C.textFaint, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>▼</div>
      </div>
      {open && (
        <div style={{ padding: "0 16px 4px", borderTop: `1px solid ${C.border}` }}>
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
        <div style={{ background: `${C.accent}12`, border: `1px solid ${C.accentBorder}`, borderRadius: "7px", padding: "9px 14px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.green, flexShrink: 0 }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: C.accentText }}>demo mode — sample output for Alex Chen → Senior PM</span>
          <button onClick={onReset} style={{ marginLeft: "auto", background: "none", border: `1px solid ${C.border}`, borderRadius: "5px", padding: "3px 9px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: C.textDim }}>try real →</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <Label style={{ marginBottom: "6px" }}>analysis complete</Label>
          <div style={{ fontSize: "18px", fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>{result.candidateName}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: C.textDim, marginTop: "3px" }}>→ {result.targetRole}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <Label style={{ marginBottom: "6px" }}>competency in</Label>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px", color: C.accent, fontWeight: 500 }}>{result.timeToCompetency}</div>
          {!isDemo && (
            <button onClick={onReset} style={{ marginTop: "8px", display: "block", marginLeft: "auto", background: "none", border: `1px solid ${C.border}`, borderRadius: "5px", padding: "4px 10px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: C.textDim, transition: "border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.borderHover}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              ← new analysis
            </button>
          )}
        </div>
      </div>

      <ReadinessMeter score={result.readinessScore} />

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: "16px" }}>
        {[["pathway", "pathway"], ["gaps", `gaps (${result.gaps?.length})`], ["strengths", "strengths"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: tab === id ? C.text : C.textDim, borderBottom: `2px solid ${tab === id ? C.accent : "transparent"}`, marginBottom: "-1px", transition: "all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "pathway" && (
        <div>{result.pathway?.map((p, i) => <PhaseCard key={i} phase={p} defaultOpen={i === 0} />)}</div>
      )}

      {tab === "gaps" && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
          {result.gaps?.map((g, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderBottom: i < result.gaps.length - 1 ? `1px solid ${C.border}` : "none", animation: `fadeUp 0.2s ease ${i * 0.04}s both` }}>
              <ImportanceBadge importance={g.importance} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", fontWeight: 500, color: C.text }}>{g.skill}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: C.textDim, marginTop: "2px" }}>
                  {g.currentLevel === "none" ? "not on resume" : g.currentLevel} → {g.targetLevel}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "strengths" && (
        <div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
            {result.strengths?.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: "12px", padding: "12px 16px", borderBottom: i < result.strengths.length - 1 ? `1px solid ${C.border}` : "none", animation: `fadeUp 0.2s ease ${i * 0.05}s both` }}>
                <span style={{ color: C.green, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>✓</span>
                <span style={{ fontSize: "13px", color: C.textMid, lineHeight: 1.65 }}>{s}</span>
              </div>
            ))}
          </div>
          <Label style={{ marginBottom: "10px" }}>detected skills</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {result.resumeSkills?.map(s => (
              <span key={s.skill} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 9px", borderRadius: "4px", background: C.surface, border: `1px solid ${C.border}`, fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: C.textMid }}>
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
    setStep("loading"); setLoadMsg("generating diagnostic…"); setError(null);
    try { const d = await callClaude(QUIZ_PROMPT, `Role/JD: ${jdText}`); setQuiz(d); setAnswers({}); setCur(0); setStep("questions"); }
    catch (e) { setError(e.message); setStep("setup"); }
  };

  const pick = (qi, oi) => {
    setAnswers(a => ({ ...a, [qi]: oi }));
    if (qi < quiz.questions.length - 1) setTimeout(() => setCur(qi + 1), 300);
  };

  const submit = async () => {
    setStep("loading"); setLoadMsg("building your pathway…");
    try {
      const summary = quiz.questions.map((q, i) => { const o = q.options[answers[i]]; return `${q.skill}: ${o?.label} (${o?.level})`; }).join("\n");
      const data = await callClaude(ANALYSIS_PROMPT, `Candidate: ${name || "New Hire"}\nRole: ${quiz.role}\n\nQuiz results:\n${summary}`);
      onComplete(data);
    } catch (e) { setError(e.message); setStep("questions"); }
  };

  const allDone = quiz && Object.keys(answers).length === quiz.questions.length;
  const inputStyle = { width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "9px 12px", color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", outline: "none" };

  if (step === "loading") return <Spinner label={loadMsg} />;

  if (step === "setup") return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: C.textDim, padding: 0, marginBottom: "24px" }}>← back</button>
      <Label style={{ marginBottom: "8px" }}>diagnostic quiz</Label>
      <div style={{ fontSize: "18px", fontWeight: 700, color: C.text, letterSpacing: "-0.02em", marginBottom: "6px" }}>No resume needed.</div>
      <div style={{ fontSize: "13px", color: C.textDim, lineHeight: 1.7, marginBottom: "24px" }}>Describe the target role. Answer 8 adaptive questions. Get a personalised pathway.</div>

      <div style={{ marginBottom: "12px" }}>
        <Label style={{ marginBottom: "6px" }}>candidate name (optional)</Label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Sharma" style={inputStyle} />
      </div>
      <div style={{ marginBottom: "20px" }}>
        <Label style={{ marginBottom: "6px" }}>target role / job description</Label>
        <textarea value={jdText} onChange={e => setJdText(e.target.value)} placeholder={`"Senior Data Engineer at a fintech startup" — or paste the full JD`} style={{ ...inputStyle, minHeight: "110px", resize: "vertical", lineHeight: 1.6 }} />
      </div>

      {error && <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: "6px", padding: "9px 12px", marginBottom: "12px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: C.red }}>error: {error}</div>}

      <button onClick={start} disabled={!jdText.trim()} style={{ width: "100%", padding: "11px", borderRadius: "6px", background: jdText.trim() ? C.accent : C.border, color: jdText.trim() ? "#fff" : C.textDim, border: "none", cursor: jdText.trim() ? "pointer" : "not-allowed", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 500, letterSpacing: "0.02em", transition: "all 0.2s" }}>
        generate diagnostic →
      </button>
    </div>
  );

  if (step === "questions" && quiz) {
    const q = quiz.questions[cur];
    const levelStyle = {
      none:         { color: C.textDim,   bg: C.bg,      border: C.border,       sel_border: C.borderHover },
      beginner:     { color: C.textMid,   bg: C.surface, border: C.border,       sel_border: C.borderHover },
      intermediate: { color: C.yellow,    bg: C.yellowBg,border: C.yellowBorder, sel_border: "#FCD34D"     },
      expert:       { color: C.greenText, bg: C.greenBg, border: C.greenBorder,  sel_border: "#86EFAC"     },
    };
    return (
      <div style={{ animation: "fadeUp 0.2s ease both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <Label>{quiz.role}</Label>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: C.textDim }}>{Object.keys(answers).length}/{quiz.questions.length} answered</span>
        </div>
        <div style={{ height: "2px", background: C.border, borderRadius: "999px", overflow: "hidden", marginBottom: "22px" }}>
          <div style={{ height: "100%", width: `${((cur + 1) / quiz.questions.length) * 100}%`, background: C.accent, borderRadius: "999px", transition: "width 0.3s ease" }} />
        </div>

        <div style={{ marginBottom: "8px" }}><Badge color={C.greenText} bg={C.greenBg} border={C.greenBorder}>{q.skill}</Badge></div>
        <div style={{ fontSize: "14px", fontWeight: 600, color: C.text, lineHeight: 1.55, marginBottom: "18px" }}>{q.question}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "20px" }}>
          {q.options.map((opt, oi) => {
            const sel = answers[cur] === oi;
            const ls = levelStyle[opt.level] || levelStyle.none;
            return (
              <button key={oi} onClick={() => pick(cur, oi)} style={{ textAlign: "left", padding: "11px 13px", borderRadius: "6px", border: `1px solid ${sel ? ls.sel_border : C.border}`, background: sel ? ls.bg : C.surface, cursor: "pointer", transition: "all 0.13s", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "14px", height: "14px", borderRadius: "50%", border: `2px solid ${sel ? ls.color : C.borderHover}`, background: sel ? ls.color : "transparent", flexShrink: 0, transition: "all 0.13s" }} />
                <span style={{ fontSize: "12px", color: sel ? C.text : C.textDim, flex: 1 }}>{opt.label}</span>
                {sel && <Badge color={ls.color} bg="transparent" border="transparent">{opt.level}</Badge>}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "7px" }}>
          {cur > 0 && <button onClick={() => setCur(cur - 1)} style={{ padding: "9px 13px", borderRadius: "6px", border: `1px solid ${C.border}`, background: "none", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: C.textDim }}>←</button>}
          {cur < quiz.questions.length - 1
            ? <button onClick={() => setCur(cur + 1)} disabled={answers[cur] === undefined} style={{ flex: 1, padding: "9px", borderRadius: "6px", border: `1px solid ${C.border}`, background: "none", cursor: answers[cur] !== undefined ? "pointer" : "not-allowed", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: answers[cur] !== undefined ? C.textMid : C.textDim }}>next →</button>
            : <button onClick={submit} disabled={!allDone} style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "none", background: allDone ? C.accent : C.border, color: allDone ? "#fff" : C.textDim, cursor: allDone ? "pointer" : "not-allowed", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 500, transition: "all 0.2s" }}>
                {allDone ? "generate pathway →" : `${Object.keys(answers).length}/${quiz.questions.length} answered`}
              </button>
          }
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "5px", marginTop: "18px" }}>
          {quiz.questions.map((_, i) => (
            <div key={i} onClick={() => setCur(i)} style={{ width: "5px", height: "5px", borderRadius: "50%", cursor: "pointer", background: i === cur ? C.accent : answers[i] !== undefined ? C.borderHover : C.border, transition: "all 0.15s", transform: i === cur ? "scale(1.4)" : "scale(1)" }} />
          ))}
        </div>
        {error && <div style={{ marginTop: "12px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: C.red }}>error: {error}</div>}
      </div>
    );
  }
  return null;
}

// ── Upload view ───────────────────────────────────────────────────────────────

function UploadView({ onComplete }) {
  const [resumeFile, setResumeFile] = useState(null);
  const [jdFile, setJdFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [useText, setUseText] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState(null);
  const msgs = ["parsing resume…", "extracting requirements…", "computing skill gaps…", "generating pathway…"];
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
    } catch (e) { setError(e.message || "analysis failed."); }
    finally { clearInterval(iv); setLoading(false); }
  }, [resumeFile, jdFile, jdText, useText]);

  if (loading) return <Spinner label={msg} />;

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      <Label style={{ marginBottom: "8px" }}>upload documents</Label>
      <div style={{ fontSize: "18px", fontWeight: 700, color: C.text, letterSpacing: "-0.02em", marginBottom: "6px" }}>Resume + Job Description</div>
      <div style={{ fontSize: "13px", color: C.textDim, lineHeight: 1.7, marginBottom: "22px" }}>Upload both files. The engine extracts your skills, computes the gap, and generates a sequenced training roadmap.</div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        <DropZone label="resume.pdf / .txt" file={resumeFile} onFile={setResumeFile} />
        {!useText && <DropZone label="job_description" file={jdFile} onFile={setJdFile} />}
      </div>

      <button onClick={() => { setUseText(!useText); setJdFile(null); setJdText(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: useText ? C.accent : C.textDim, padding: 0, marginBottom: "12px", textDecoration: "underline" }}>
        {useText ? "← upload jd file" : "paste jd as text →"}
      </button>

      {useText && <textarea value={jdText} onChange={e => setJdText(e.target.value)} placeholder="paste the full job description…" style={{ width: "100%", minHeight: "110px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "11px 12px", color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", lineHeight: 1.6, outline: "none", resize: "vertical", marginBottom: "12px" }} />}

      {error && <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: "6px", padding: "9px 12px", marginBottom: "12px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: C.red }}>error: {error}</div>}

      <button onClick={analyze} disabled={!canGo} style={{ width: "100%", padding: "11px", borderRadius: "6px", background: canGo ? C.accent : C.border, color: canGo ? "#fff" : C.textDim, border: "none", cursor: canGo ? "pointer" : "not-allowed", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 500, letterSpacing: "0.02em", transition: "all 0.2s" }}>
        run analysis →
      </button>
    </div>
  );
}

// ── Landing view ──────────────────────────────────────────────────────────────

function LandingView({ onMode, onDemo }) {
  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      <div style={{ paddingTop: "48px", paddingBottom: "36px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 10px", borderRadius: "4px", background: `${C.accent}15`, border: `1px solid ${C.accentBorder}`, marginBottom: "18px" }}>
          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: C.green }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: C.accentText, letterSpacing: "0.08em" }}>adaptive onboarding engine · v1.0</span>
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: C.text, letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: "12px" }}>
          Personalised learning<br />pathways. At hire time.
        </h1>
        <p style={{ fontSize: "13px", color: C.textDim, lineHeight: 1.75, maxWidth: "420px", marginBottom: "24px" }}>
          Parses your existing skills. Maps the gap to the role. Generates a sequenced training roadmap that skips what you already know.
        </p>
        <button onClick={onDemo} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "6px", border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: C.textMid, transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.color = C.text; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid; }}>
          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: C.green }} />
          view demo output →
        </button>
      </div>

      <Divider style={{ marginBottom: "28px" }} />

      <div style={{ display: "flex", gap: "10px" }}>
        {[
          { mode: "upload", id: "01", accent: C.accent, accentText: C.accentText, title: "Upload Resume + JD", desc: "Have a resume? Upload it alongside the job description for automatic skill extraction and gap analysis.", tags: ["PDF support", "native parsing", "instant gaps"] },
          { mode: "quiz",   id: "02", accent: "#8B5CF6", accentText: C.purple,    title: "Diagnostic Quiz",   desc: "No resume? Answer 8 adaptive questions tailored to your target role. We infer skill level and build the pathway.", tags: ["no resume needed", "8 questions", "adaptive scoring"] },
        ].map(({ mode, id, accent, accentText, title, desc, tags }) => (
          <div key={mode} onClick={() => onMode(mode)}
            style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "20px", cursor: "pointer", transition: "border-color 0.15s", position: "relative" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.borderHover}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: accent }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: accentText }}>{id} / {mode}</span>
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: C.text, marginBottom: "8px" }}>{title}</div>
            <div style={{ fontSize: "12px", color: C.textDim, lineHeight: 1.7, marginBottom: "14px" }}>{desc}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {tags.map(t => <Badge key={t} color={C.textDim} bg={C.bg} border={C.border}>{t}</Badge>)}
            </div>
            <div style={{ position: "absolute", bottom: "18px", right: "18px", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: C.borderHover }}>→</div>
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
        html, body { background: ${C.bg}; color: ${C.text}; min-height: 100vh; }
        input, textarea { color-scheme: dark; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dot { 0%,100% { opacity: 0.15; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg }}>
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${C.border}`, background: C.bg, padding: "0 24px", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ maxWidth: "680px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "48px" }}>
            <div onClick={reset} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="#fff"><polygon points="5,1 9,5 5,9 1,5"/></svg>
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>PathwayAI</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: C.accent, background: `${C.accent}15`, border: `1px solid ${C.accentBorder}`, borderRadius: "3px", padding: "1px 5px" }}>v1.0</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {screen !== "landing" && screen !== "results" && (
                <>
                  {[["upload", "upload"], ["quiz", "quiz"]].map(([m, l]) => (
                    <button key={m} onClick={() => setScreen(m)} style={{ padding: "4px 10px", borderRadius: "5px", border: `1px solid ${screen === m ? C.borderHover : C.border}`, background: screen === m ? C.surface : "none", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: screen === m ? C.text : C.textDim, transition: "all 0.15s" }}>{l}</button>
                  ))}
                  <div style={{ width: "1px", height: "14px", background: C.border, margin: "0 2px" }} />
                </>
              )}
              <button onClick={demo} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "5px", border: `1px solid ${C.border}`, background: "none", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: C.textDim, transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.color = C.text; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: C.green }} />
                demo
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0 24px 80px" }}>
          {screen === "landing"  && <LandingView onMode={setScreen} onDemo={demo} />}
          {screen === "upload"   && <div style={{ paddingTop: "36px" }}><UploadView  onComplete={done} /></div>}
          {screen === "quiz"     && <div style={{ paddingTop: "36px" }}><QuizView    onComplete={done} onBack={() => setScreen("landing")} /></div>}
          {screen === "results"  && <div style={{ paddingTop: "28px" }}><ResultsView result={result} onReset={reset} isDemo={isDemo} /></div>}
        </div>
      </div>
    </>
  );
}
