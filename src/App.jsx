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
    { skill: "Stakeholder Management", level: "intermediate", yearsExp: 3 },
  ],
  requiredSkills: [
    { skill: "Product Strategy", importance: "critical" },
    { skill: "OKR Frameworks", importance: "critical" },
    { skill: "B2B SaaS Metrics", importance: "critical" },
    { skill: "SQL", importance: "important" },
    { skill: "Roadmapping Tools", importance: "important" },
    { skill: "Executive Storytelling", importance: "important" },
    { skill: "Competitive Analysis", importance: "nice-to-have" },
  ],
  gaps: [
    { skill: "Product Strategy", importance: "critical", currentLevel: "none", targetLevel: "expert" },
    { skill: "OKR Frameworks", importance: "critical", currentLevel: "beginner", targetLevel: "intermediate" },
    { skill: "B2B SaaS Metrics", importance: "critical", currentLevel: "none", targetLevel: "intermediate" },
    { skill: "Executive Storytelling", importance: "important", currentLevel: "beginner", targetLevel: "intermediate" },
    { skill: "Roadmapping Tools", importance: "important", currentLevel: "none", targetLevel: "beginner" },
  ],
  strengths: [
    "5 years of SQL expertise — will excel at data-driven product decisions immediately",
    "Strong Agile background means sprint ceremonies and delivery cadences need zero ramp-up",
    "Existing A/B testing experience maps directly to experimentation culture at the company",
    "Figma proficiency enables direct collaboration with design without handoff friction",
  ],
  pathway: [
    {
      phase: 1,
      title: "Foundation Sprint",
      duration: "Week 1–2",
      modules: [
        { name: "B2B SaaS Metrics Crash Course", description: "ARR, NRR, churn, LTV/CAC — understand every metric your team will reference daily.", type: "video", estimatedHours: 4, skills: ["B2B SaaS Metrics"] },
        { name: "OKR Workshop", description: "Write your first quarter's OKRs alongside the team. Learn the company's goal-setting language.", type: "workshop", estimatedHours: 3, skills: ["OKR Frameworks"] },
        { name: "Roadmap Tool Onboarding", description: "Get up to speed on Linear / Productboard setup, workflows, and team conventions.", type: "reading", estimatedHours: 2, skills: ["Roadmapping Tools"] },
      ],
    },
    {
      phase: 2,
      title: "Strategy & Storytelling",
      duration: "Week 3",
      modules: [
        { name: "Product Strategy Fundamentals", description: "Jobs-to-be-done, positioning, and how to anchor every decision to company strategy.", type: "reading", estimatedHours: 5, skills: ["Product Strategy"] },
        { name: "Executive Storytelling Lab", description: "Write and present a mock product review. Get feedback from your PM lead.", type: "workshop", estimatedHours: 4, skills: ["Executive Storytelling"] },
      ],
    },
    {
      phase: 3,
      title: "Applied Practice",
      duration: "Week 4–5",
      modules: [
        { name: "Shadow & Co-pilot Sprint", description: "Shadow a senior PM through a full sprint cycle, then co-own a feature end-to-end.", type: "project", estimatedHours: 10, skills: ["Product Strategy", "OKR Frameworks", "B2B SaaS Metrics"] },
        { name: "30-Day Review Assessment", description: "Present your first product proposal to the leadership team for real feedback.", type: "assessment", estimatedHours: 3, skills: ["Executive Storytelling", "Product Strategy"] },
      ],
    },
  ],
};

// ── File Helpers ──────────────────────────────────────────────────────────────

const readFileAsText = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("Read failed"));
    r.readAsText(file);
  });

const readFileAsBase64 = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Read failed"));
    r.readAsDataURL(file);
  });

const fileToContentBlock = async (file, label) => {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    const b64 = await readFileAsBase64(file);
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 }, title: label };
  }
  const text = await readFileAsText(file);
  return { type: "text", text: `${label}:\n${text}` };
};

// ── Claude API ────────────────────────────────────────────────────────────────

const ANALYSIS_SYSTEM_PROMPT = `You are an expert corporate L&D analyst. Given a resume (or quiz answers) and a job description, analyze and return ONLY valid JSON, no markdown, no backticks.

JSON shape:
{"candidateName":"string","targetRole":"string","resumeSkills":[{"skill":"string","level":"beginner|intermediate|expert","yearsExp":0}],"requiredSkills":[{"skill":"string","importance":"critical|important|nice-to-have"}],"gaps":[{"skill":"string","importance":"critical|important|nice-to-have","currentLevel":"none|beginner|intermediate","targetLevel":"intermediate|expert"}],"strengths":["string"],"pathway":[{"phase":1,"title":"string","duration":"string","modules":[{"name":"string","description":"string","type":"video|workshop|reading|project|assessment","estimatedHours":0,"skills":["string"]}]}],"timeToCompetency":"string","readinessScore":0}`;

const QUIZ_SYSTEM_PROMPT = `You are an adaptive skills diagnostic engine. Given a role/JD, generate exactly 8 diagnostic questions. Return ONLY valid JSON, no markdown.

{"role":"string","questions":[{"id":1,"skill":"string","question":"string","options":[{"label":"string","level":"none|beginner|intermediate|expert"}]}]}`;

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

async function callClaude(system, userContent) {
  const content = typeof userContent === "string" ? [{ type: "text", text: userContent }] : userContent;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(ANTHROPIC_API_KEY && { "x-api-key": ANTHROPIC_API_KEY }) },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 3000, system, messages: [{ role: "user", content }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.content.map((b) => b.text || "").join("");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ── Animation Hook ────────────────────────────────────────────────────────────

function useFadeIn(deps = []) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(false); const t = setTimeout(() => setVisible(true), 30); return () => clearTimeout(t); }, deps);
  return { opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)", transition: "opacity 0.35s ease, transform 0.35s ease" };
}

// ── Shared Components ─────────────────────────────────────────────────────────

const typeIcon = { video: "▶", workshop: "⚡", reading: "📖", project: "🛠", assessment: "✦" };
const typeColor = { video: "#6c8ef5", workshop: "#f5c842", reading: "#6b7280", project: "#c8f542", assessment: "#f54242" };

function Tag({ children, color = "#555" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 9px", borderRadius: "999px", border: `1px solid ${color}30`, background: `${color}0d`, fontFamily: "'Space Mono', monospace", fontSize: "10px", color, margin: "2px", letterSpacing: "0.02em" }}>
      <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: color, flexShrink: 0 }} />{children}
    </span>
  );
}

function SkillBadge({ skill, level, importance }) {
  const col = { expert: "#c8f542", intermediate: "#f5c842", beginner: "#6b7280", none: "#f54242" }[level]
    || { critical: "#f54242", important: "#f5c842", "nice-to-have": "#444" }[importance] || "#444";
  return <Tag color={col}>{skill}</Tag>;
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "8px", padding: "8px 0" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#c8f542", animation: `pulse 1.1s ease-in-out ${i * 0.18}s infinite` }} />
      ))}
    </div>
  );
}

function ModuleCard({ mod, idx }) {
  const col = typeColor[mod.type] || "#444";
  return (
    <div style={{ background: "#0a0a0a", border: "1px solid #1c1c1c", borderRadius: "10px", padding: "14px 16px", marginBottom: "8px", borderLeft: `3px solid ${col}`, animation: `fadeUp 0.3s ease ${idx * 0.05}s both` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "5px" }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px", color: "#ddd" }}>
          <span style={{ color: col, marginRight: "7px" }}>{typeIcon[mod.type]}</span>{mod.name}
        </div>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#444", whiteSpace: "nowrap", marginLeft: "10px" }}>{mod.estimatedHours}h</span>
      </div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#4a4a4a", lineHeight: 1.65, marginBottom: "8px" }}>{mod.description}</div>
      <div>{mod.skills?.map((s) => <Tag key={s} color="#333">{s}</Tag>)}</div>
    </div>
  );
}

function PhaseBlock({ phase, isLast, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const totalH = phase.modules.reduce((s, m) => s + (m.estimatedHours || 0), 0);
  return (
    <div style={{ display: "flex", gap: "14px", marginBottom: isLast ? 0 : "4px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "26px", flexShrink: 0 }}>
        <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: open ? "#c8f542" : "#1c1c1c", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Mono', monospace", fontSize: "10px", color: open ? "#000" : "#555", fontWeight: 700, transition: "all 0.2s", flexShrink: 0 }}>{phase.phase}</div>
        {!isLast && <div style={{ width: "1px", flex: 1, background: "#1c1c1c", marginTop: "5px" }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : "16px" }}>
        <div onClick={() => setOpen(!open)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "4px 0", marginBottom: open ? "10px" : 0 }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "14px", color: "#eee" }}>{phase.title}</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#444", marginTop: "2px" }}>{phase.duration} · {totalH}h · {phase.modules.length} modules</div>
          </div>
          <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#111", border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "none" }}>
            <span style={{ color: "#444", fontSize: "10px" }}>▶</span>
          </div>
        </div>
        {open && phase.modules.map((m, i) => <ModuleCard key={i} mod={m} idx={i} />)}
      </div>
    </div>
  );
}

function ReadinessMeter({ score }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => { const t = setTimeout(() => setDisplayed(score), 200); return () => clearTimeout(t); }, [score]);
  const color = score >= 70 ? "#c8f542" : score >= 40 ? "#f5c842" : "#f54242";
  const label = score >= 70 ? "High Readiness" : score >= 40 ? "Partial Readiness" : "Needs Development";
  const segments = 20;
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #1c1c1c", borderRadius: "14px", padding: "22px 24px", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#444", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Role Readiness Score</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "42px", fontWeight: 800, color, letterSpacing: "-0.03em", lineHeight: 1 }}>
            {displayed}<span style={{ fontSize: "18px", color: "#2a2a2a" }}>/100</span>
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color, marginTop: "6px", letterSpacing: "0.05em" }}>{label}</div>
        </div>
        {/* Segmented arc-like bar */}
        <div style={{ display: "flex", gap: "3px", alignItems: "flex-end" }}>
          {Array.from({ length: segments }, (_, i) => {
            const threshold = ((i + 1) / segments) * 100;
            const filled = displayed >= threshold;
            return <div key={i} style={{ width: "6px", height: `${14 + (i / segments) * 18}px`, borderRadius: "2px", background: filled ? color : "#1a1a1a", transition: `background 0.05s ease ${i * 0.03}s` }} />;
          })}
        </div>
      </div>
    </div>
  );
}

// ── Drop Zone ─────────────────────────────────────────────────────────────────

function DropZone({ label, icon, file, onFile }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  const handle = (f) => {
    if (!f) return;
    if (["application/pdf", "text/plain"].includes(f.type) || f.name.endsWith(".pdf") || f.name.endsWith(".txt")) onFile(f);
  };
  const isPdf = file?.name?.endsWith(".pdf") || file?.type === "application/pdf";
  return (
    <div
      onClick={() => ref.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      style={{ flex: 1, border: `1px dashed ${drag ? "#c8f542" : file ? "#2a3a1a" : "#1e1e1e"}`, borderRadius: "10px", padding: "22px 16px", cursor: "pointer", background: drag ? "#c8f54208" : file ? "#c8f54205" : "transparent", transition: "all 0.18s", textAlign: "center" }}
    >
      <input ref={ref} type="file" accept=".txt,.pdf" style={{ display: "none" }} onChange={(e) => handle(e.target.files[0])} />
      <div style={{ fontSize: "22px", marginBottom: "7px" }}>{file ? (isPdf ? "📄" : "📝") : icon}</div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#444", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "3px" }}>{label}</div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: file ? "#c8f542" : "#333" }}>{file ? file.name : "drop or click"}</div>
      {file && isPdf && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "#6c8ef5", marginTop: "3px" }}>✦ PDF</div>}
    </div>
  );
}

// ── Results View ──────────────────────────────────────────────────────────────

function ResultsView({ result, onReset, isDemo }) {
  const [tab, setTab] = useState("pathway");
  const fade = useFadeIn([result]);
  return (
    <div style={fade}>
      {isDemo && (
        <div style={{ background: "#0d0d0d", border: "1px solid #f5c84220", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px" }}>⚡</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#f5c842" }}>Demo mode — showing sample analysis for Alex Chen → Senior PM</span>
          <button onClick={onReset} style={{ marginLeft: "auto", background: "none", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#555" }}>Try real →</button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "20px", color: "#eee", letterSpacing: "-0.02em" }}>
            {result.candidateName} <span style={{ color: "#2a2a2a" }}>→</span> <span style={{ color: "#c8f542" }}>{result.targetRole}</span>
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#444", marginTop: "3px" }}>
            Competency in <span style={{ color: "#aaa" }}>{result.timeToCompetency}</span>
          </div>
        </div>
        {!isDemo && (
          <button onClick={onReset} style={{ background: "none", border: "1px solid #1e1e1e", borderRadius: "8px", padding: "7px 13px", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#444", transition: "border-color 0.15s" }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "#333"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "#1e1e1e"}>
            ← New
          </button>
        )}
      </div>

      <ReadinessMeter score={result.readinessScore} />

      {/* Tabs */}
      <div style={{ display: "flex", gap: "2px", marginBottom: "16px", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "3px" }}>
        {[["pathway", "Pathway"], ["gaps", `Gaps (${result.gaps?.length})`], ["strengths", "Strengths"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "7px", borderRadius: "7px", border: "none", cursor: "pointer", background: tab === id ? "#141414" : "transparent", color: tab === id ? "#c8f542" : "#444", fontFamily: "'Space Mono', monospace", fontSize: "10px", fontWeight: tab === id ? 700 : 400, transition: "all 0.15s", letterSpacing: "0.03em" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "pathway" && (
        <div style={{ background: "#0d0d0d", border: "1px solid #1c1c1c", borderRadius: "14px", padding: "22px" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "14px", color: "#888", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "18px" }}>Training Roadmap</div>
          {result.pathway?.map((p, i) => <PhaseBlock key={i} phase={p} isLast={i === result.pathway.length - 1} defaultOpen={i === 0} />)}
        </div>
      )}

      {tab === "gaps" && (
        <div style={{ background: "#0d0d0d", border: "1px solid #1c1c1c", borderRadius: "14px", padding: "22px" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "14px", color: "#888", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "16px" }}>Skill Gaps to Close</div>
          {result.gaps?.map((g, i) => {
            const col = { critical: "#f54242", important: "#f5c842", "nice-to-have": "#333" }[g.importance];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: i < result.gaps.length - 1 ? "1px solid #111" : "none", animation: `fadeUp 0.25s ease ${i * 0.05}s both` }}>
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: col, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px", color: "#ddd" }}>{g.skill}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#3a3a3a", marginTop: "2px" }}>
                    {g.currentLevel === "none" ? "Not on resume" : `${g.currentLevel}`} → {g.targetLevel}
                  </div>
                </div>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: col, textTransform: "uppercase", letterSpacing: "0.1em", border: `1px solid ${col}30`, borderRadius: "999px", padding: "2px 7px" }}>{g.importance}</span>
              </div>
            );
          })}
        </div>
      )}

      {tab === "strengths" && (
        <div style={{ background: "#0d0d0d", border: "1px solid #1c1c1c", borderRadius: "14px", padding: "22px" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "14px", color: "#888", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "16px" }}>What You Already Bring</div>
          {result.strengths?.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", padding: "10px 0", borderBottom: i < result.strengths.length - 1 ? "1px solid #111" : "none", animation: `fadeUp 0.25s ease ${i * 0.06}s both` }}>
              <span style={{ color: "#c8f542", flexShrink: 0, marginTop: "1px", fontSize: "12px" }}>✓</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#555", lineHeight: 1.7 }}>{s}</span>
            </div>
          ))}
          <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #111" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#333", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>Detected Skills</div>
            <div>{result.resumeSkills?.map((s) => <SkillBadge key={s.skill} skill={s.skill} level={s.level} />)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Quiz View ─────────────────────────────────────────────────────────────────

function QuizView({ onComplete, onBack }) {
  const [step, setStep] = useState("setup");
  const [jdText, setJdText] = useState("");
  const [name, setName] = useState("");
  const [quizData, setQuizData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState(null);
  const fade = useFadeIn([step, current]);

  const startQuiz = async () => {
    if (!jdText.trim()) return;
    setStep("loading"); setError(null);
    try { const d = await callClaude(QUIZ_SYSTEM_PROMPT, `Generate diagnostic for: ${jdText}`); setQuizData(d); setAnswers({}); setCurrent(0); setStep("questions"); }
    catch (e) { setError(e.message); setStep("setup"); }
  };

  const pick = (qi, oi) => {
    setAnswers((a) => ({ ...a, [qi]: oi }));
    if (qi < quizData.questions.length - 1) setTimeout(() => setCurrent(qi + 1), 350);
  };

  const submit = async () => {
    setStep("loading"); setError(null);
    try {
      const summary = quizData.questions.map((q, i) => {
        const opt = q.options[answers[i]];
        return `${q.skill}: ${opt?.label} (${opt?.level})`;
      }).join("\n");
      const data = await callClaude(ANALYSIS_SYSTEM_PROMPT, `Candidate: ${name || "New Hire"}\nRole: ${quizData.role}\n\nQuiz answers:\n${summary}\n\nGenerate pathway JSON.`);
      onComplete(data);
    } catch (e) { setError(e.message); setStep("questions"); }
  };

  const allAnswered = quizData && Object.keys(answers).length === quizData.questions.length;

  if (step === "loading") return (
    <div style={{ background: "#0d0d0d", border: "1px solid #1c1c1c", borderRadius: "14px", padding: "60px 28px", textAlign: "center" }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "16px", color: "#eee", marginBottom: "6px" }}>{quizData ? "Generating Your Pathway…" : "Building Diagnostic…"}</div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#444", marginBottom: "28px" }}>{quizData ? "Mapping answers to a personalized roadmap" : "Crafting role-specific questions"}</div>
      <Spinner />
    </div>
  );

  if (step === "setup") return (
    <div style={{ background: "#0d0d0d", border: "1px solid #1c1c1c", borderRadius: "14px", padding: "28px", ...useFadeIn() }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#444", padding: 0, marginBottom: "20px", display: "flex", alignItems: "center", gap: "4px" }}>← back</button>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "19px", color: "#eee", marginBottom: "6px" }}>Diagnostic Quiz</div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#444", lineHeight: 1.8, marginBottom: "24px" }}>No resume needed. Describe the target role and answer 8 smart questions — we'll map your skills and generate your pathway.</div>
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "#333", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>Your name (optional)</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" style={{ width: "100%", background: "#0a0a0a", border: "1px solid #1e1e1e", borderRadius: "8px", padding: "10px 13px", color: "#ccc", fontFamily: "'Space Mono', monospace", fontSize: "11px", outline: "none" }} />
      </div>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "#333", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>Target role / job description</div>
        <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder={'e.g. "Senior Data Engineer at a fintech company" or paste the full JD…'} style={{ width: "100%", minHeight: "130px", background: "#0a0a0a", border: "1px solid #1e1e1e", borderRadius: "8px", padding: "12px 13px", color: "#ccc", fontFamily: "'Space Mono', monospace", fontSize: "11px", lineHeight: 1.7, outline: "none", resize: "vertical" }} />
      </div>
      {error && <div style={{ background: "#150505", border: "1px solid #f5424230", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#f54242" }}>⚠ {error}</div>}
      <button onClick={startQuiz} disabled={!jdText.trim()} style={{ width: "100%", padding: "13px", borderRadius: "9px", background: jdText.trim() ? "#c8f542" : "#111", color: jdText.trim() ? "#000" : "#2a2a2a", border: "none", cursor: jdText.trim() ? "pointer" : "not-allowed", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "13px", transition: "all 0.2s" }}>
        Generate My Diagnostic →
      </button>
    </div>
  );

  if (step === "questions" && quizData) {
    const q = quizData.questions[current];
    const levelCol = { none: "#333", beginner: "#6b7280", intermediate: "#f5c842", expert: "#c8f542" };
    return (
      <div style={{ background: "#0d0d0d", border: "1px solid #1c1c1c", borderRadius: "14px", padding: "24px", ...fade }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "13px", color: "#555" }}>{quizData.role}</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#333" }}>{Object.keys(answers).length}/{quizData.questions.length} answered</div>
        </div>
        {/* Progress */}
        <div style={{ height: "2px", background: "#111", borderRadius: "999px", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ height: "100%", width: `${((current + 1) / quizData.questions.length) * 100}%`, background: "#c8f542", transition: "width 0.4s ease" }} />
        </div>
        {/* Skill pill */}
        <div style={{ display: "inline-block", padding: "3px 9px", background: "#c8f54210", border: "1px solid #c8f54230", borderRadius: "999px", fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "#c8f542", letterSpacing: "0.08em", marginBottom: "12px" }}>{q.skill}</div>
        {/* Question */}
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "16px", color: "#eee", lineHeight: 1.55, marginBottom: "20px" }}>{q.question}</div>
        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
          {q.options.map((opt, oi) => {
            const sel = answers[current] === oi;
            const col = levelCol[opt.level] || "#333";
            return (
              <button key={oi} onClick={() => pick(current, oi)} style={{ textAlign: "left", padding: "12px 14px", borderRadius: "9px", border: `1px solid ${sel ? col : "#1a1a1a"}`, background: sel ? `${col}12` : "#0a0a0a", cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: `2px solid ${sel ? col : "#222"}`, background: sel ? col : "transparent", flexShrink: 0, transition: "all 0.15s" }} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: sel ? "#ddd" : "#555", lineHeight: 1.5 }}>{opt.label}</span>
                {sel && <span style={{ marginLeft: "auto", fontFamily: "'Space Mono', monospace", fontSize: "9px", color: col, letterSpacing: "0.06em" }}>{opt.level}</span>}
              </button>
            );
          })}
        </div>
        {/* Nav */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {current > 0 && <button onClick={() => setCurrent(current - 1)} style={{ padding: "9px 14px", borderRadius: "8px", border: "1px solid #1a1a1a", background: "transparent", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#444" }}>←</button>}
          {current < quizData.questions.length - 1
            ? <button onClick={() => setCurrent(current + 1)} disabled={answers[current] === undefined} style={{ flex: 1, padding: "9px", borderRadius: "8px", border: "none", background: answers[current] !== undefined ? "#141414" : "#0a0a0a", cursor: answers[current] !== undefined ? "pointer" : "not-allowed", fontFamily: "'Space Mono', monospace", fontSize: "10px", color: answers[current] !== undefined ? "#666" : "#222" }}>Next →</button>
            : <button onClick={submit} disabled={!allAnswered} style={{ flex: 1, padding: "11px", borderRadius: "8px", border: "none", background: allAnswered ? "#c8f542" : "#111", color: allAnswered ? "#000" : "#2a2a2a", cursor: allAnswered ? "pointer" : "not-allowed", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "13px", transition: "all 0.2s" }}>
                {allAnswered ? "Generate My Pathway →" : `${Object.keys(answers).length}/${quizData.questions.length} answered`}
              </button>
          }
        </div>
        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "5px", marginTop: "18px" }}>
          {quizData.questions.map((_, i) => (
            <div key={i} onClick={() => setCurrent(i)} style={{ width: "5px", height: "5px", borderRadius: "50%", cursor: "pointer", transition: "all 0.15s", background: i === current ? "#c8f542" : answers[i] !== undefined ? "#2a3a1a" : "#1a1a1a", transform: i === current ? "scale(1.3)" : "scale(1)" }} />
          ))}
        </div>
        {error && <div style={{ marginTop: "14px", fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#f54242" }}>⚠ {error}</div>}
      </div>
    );
  }
  return null;
}

// ── Upload View ───────────────────────────────────────────────────────────────

function UploadView({ onComplete }) {
  const [resumeFile, setResumeFile] = useState(null);
  const [jdFile, setJdFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [useText, setUseText] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState(null);
  const fade = useFadeIn([]);

  const msgs = ["Parsing your resume…", "Extracting requirements…", "Computing skill gaps…", "Building your pathway…"];
  const canGo = resumeFile && (jdFile || jdText.trim());

  const analyze = useCallback(async () => {
    if (!canGo) return;
    setLoading(true); setError(null); setMsg(msgs[0]);
    let i = 0; const iv = setInterval(() => { i = (i + 1) % msgs.length; setMsg(msgs[i]); }, 1800);
    try {
      const rb = await fileToContentBlock(resumeFile, "RESUME");
      const jb = useText ? { type: "text", text: `JOB DESCRIPTION:\n${jdText}` } : await fileToContentBlock(jdFile, "JOB DESCRIPTION");
      const data = await callClaude(ANALYSIS_SYSTEM_PROMPT, [rb, jb, { type: "text", text: "Return only the JSON." }]);
      onComplete(data);
    } catch (e) { setError(e.message || "Something went wrong."); }
    finally { clearInterval(iv); setLoading(false); }
  }, [resumeFile, jdFile, jdText, useText]);

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #1c1c1c", borderRadius: "14px", padding: "28px", ...fade }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "19px", color: "#eee", marginBottom: "4px" }}>Upload Resume + JD</div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "#333", marginBottom: "22px" }}>PDF and .txt supported · PDFs parsed natively</div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
        <DropZone label="Resume" icon="📄" file={resumeFile} onFile={setResumeFile} />
        {!useText && <DropZone label="Job Description" icon="💼" file={jdFile} onFile={setJdFile} />}
      </div>

      <button onClick={() => { setUseText(!useText); setJdFile(null); setJdText(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "10px", color: useText ? "#c8f542" : "#333", padding: 0, marginBottom: "12px", textDecoration: "underline" }}>
        {useText ? "← upload JD file" : "paste JD as text →"}
      </button>

      {useText && <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste the job description…" style={{ width: "100%", minHeight: "120px", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "12px", color: "#ccc", fontFamily: "'Space Mono', monospace", fontSize: "11px", lineHeight: 1.7, outline: "none", resize: "vertical", marginBottom: "14px" }} />}

      {error && <div style={{ background: "#150505", border: "1px solid #f5424230", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#f54242" }}>⚠ {error}</div>}

      <button onClick={analyze} disabled={!canGo || loading} style={{ width: "100%", padding: "13px", borderRadius: "9px", background: canGo && !loading ? "#c8f542" : "#111", color: canGo && !loading ? "#000" : "#2a2a2a", border: "none", cursor: canGo && !loading ? "pointer" : "not-allowed", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "13px", transition: "all 0.2s" }}>
        {loading ? msg : "Generate Pathway →"}
      </button>
    </div>
  );
}

// ── Landing ───────────────────────────────────────────────────────────────────

function LandingView({ onMode, onDemo }) {
  const fade = useFadeIn([]);
  return (
    <div style={fade}>
      <div style={{ textAlign: "center", padding: "36px 0 28px" }}>
        <div style={{ display: "inline-block", padding: "4px 12px", background: "#c8f54210", border: "1px solid #c8f54225", borderRadius: "999px", fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "#c8f542", letterSpacing: "0.1em", marginBottom: "18px" }}>
          ADAPTIVE ONBOARDING ENGINE
        </div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "30px", color: "#eee", letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: "12px" }}>
          Your personalized<br /><span style={{ color: "#c8f542" }}>learning pathway</span>
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#444", lineHeight: 1.8, maxWidth: "400px", margin: "0 auto 28px" }}>
          Stop wasting time on what you already know. Get a roadmap built exactly for your skill gap.
        </div>
        {/* Demo CTA */}
        <button onClick={onDemo} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "999px", border: "1px solid #f5c84240", background: "#f5c84208", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#f5c842", transition: "all 0.2s", marginBottom: "8px" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f5c84215"; e.currentTarget.style.borderColor = "#f5c84270"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#f5c84208"; e.currentTarget.style.borderColor = "#f5c84240"; }}>
          <span style={{ fontSize: "14px" }}>⚡</span> Try Demo — see a sample result instantly
        </button>
      </div>

      <div style={{ display: "flex", gap: "12px" }}>
        {[
          { mode: "upload", icon: "📄", title: "Upload Resume + JD", desc: "Have a resume? Upload it with the JD for automatic skill extraction and gap analysis.", tags: ["PDF support", "Auto parsing", "Instant gaps"], accent: "#c8f542" },
          { mode: "quiz", icon: "🧠", title: "Take Diagnostic Quiz", desc: "No resume? Answer 8 adaptive questions and get a pathway tailored to your actual skill level.", tags: ["No resume needed", "Role-specific", "Adaptive"], accent: "#6c8ef5" },
        ].map(({ mode, icon, title, desc, tags, accent }) => (
          <div key={mode} onClick={() => onMode(mode)}
            style={{ flex: 1, background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "14px", padding: "24px", cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent + "60"; e.currentTarget.style.background = accent + "05"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1a1a1a"; e.currentTarget.style.background = "#0d0d0d"; }}>
            <div style={{ fontSize: "28px", marginBottom: "14px" }}>{icon}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "15px", color: "#eee", marginBottom: "8px" }}>{title}</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#444", lineHeight: 1.75, marginBottom: "16px" }}>{desc}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {tags.map((t) => <span key={t} style={{ padding: "2px 8px", borderRadius: "999px", border: "1px solid #1e1e1e", fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "#333", letterSpacing: "0.04em" }}>{t}</span>)}
            </div>
            <div style={{ position: "absolute", bottom: "18px", right: "18px", fontFamily: "'Space Mono', monospace", fontSize: "10px", color: accent + "80" }}>→</div>
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

  const handleComplete = (data) => { setResult(data); setIsDemo(false); setScreen("results"); };
  const handleDemo = () => { setResult(DEMO_RESULT); setIsDemo(true); setScreen("results"); };
  const handleReset = () => { setResult(null); setIsDemo(false); setScreen("landing"); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080808; color: #eee; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0a0a0a; } ::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 2px; }
        textarea, input { color-scheme: dark; }
        @keyframes pulse { 0%,100%{opacity:.15;transform:scale(.75)} 50%{opacity:1;transform:scale(1)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#080808" }}>
        {/* Subtle grid background */}
        <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(#0f0f0f 1px, transparent 1px), linear-gradient(90deg, #0f0f0f 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none", zIndex: 0 }} />

        {/* Header */}
        <div style={{ position: "relative", zIndex: 1, borderBottom: "1px solid #111", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(8px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={handleReset}>
            <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "#c8f542", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>⚡</div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "15px", color: "#eee", letterSpacing: "-0.02em" }}>PathwayAI</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "8px", color: "#333", letterSpacing: "0.12em", textTransform: "uppercase" }}>Adaptive Onboarding</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {screen !== "landing" && screen !== "results" && (
              <>
                {[["upload", "📄 Resume"], ["quiz", "🧠 Quiz"]].map(([m, l]) => (
                  <button key={m} onClick={() => setScreen(m)} style={{ padding: "5px 12px", borderRadius: "999px", border: `1px solid ${screen === m ? "#c8f54250" : "#1a1a1a"}`, background: screen === m ? "#c8f54210" : "transparent", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "9px", color: screen === m ? "#c8f542" : "#444", transition: "all 0.15s" }}>{l}</button>
                ))}
                <div style={{ width: "1px", height: "16px", background: "#1a1a1a", margin: "0 4px" }} />
              </>
            )}
            <button onClick={handleDemo} style={{ padding: "5px 12px", borderRadius: "999px", border: "1px solid #f5c84230", background: "transparent", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "#f5c84280", transition: "all 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#f5c842"; e.currentTarget.style.borderColor = "#f5c84260"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#f5c84280"; e.currentTarget.style.borderColor = "#f5c84230"; }}>
              ⚡ Demo
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: "760px", margin: "0 auto", padding: "28px 20px 60px" }}>
          {screen === "landing" && <LandingView onMode={setScreen} onDemo={handleDemo} />}
          {screen === "upload" && <UploadView onComplete={handleComplete} />}
          {screen === "quiz" && <QuizView onComplete={handleComplete} onBack={() => setScreen("landing")} />}
          {screen === "results" && <ResultsView result={result} onReset={handleReset} isDemo={isDemo} />}
        </div>
      </div>
    </>
  );
}
