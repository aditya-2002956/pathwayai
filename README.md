# ⚡ PathwayAI — Adaptive Onboarding Engine

> Stop forcing every new hire through the same training. PathwayAI parses a candidate's existing skills and dynamically maps a personalized learning pathway to close the exact gaps between who they are and what the role requires.

---

## 🧭 What It Does

Corporate onboarding fails because it's one-size-fits-all. A 10-year veteran wastes days on basics. A junior hire drowns in advanced modules. Both lose time. The company loses productivity.

PathwayAI solves this with a three-step engine:

1. **Parse** — Extract skills and proficiency levels from a resume (PDF or text) and required competencies from a job description
2. **Gap** — Compute the delta between what the candidate knows and what the role demands, prioritized by criticality
3. **Map** — Generate a sequenced, phased learning pathway that skips what they already know and accelerates what they don't

---

## ✨ Key Features

- **PDF-native resume parsing** — resumes sent directly to Claude's document API, no pre-processing
- **Dual input modes** — upload Resume + JD files, or take an 8-question AI-generated diagnostic quiz (no resume needed)
- **Readiness Score (0–100)** — instant quantification of how prepared the candidate is right now
- **Phased learning roadmap** — modules sequenced by dependency and criticality, with type tags (video / workshop / project / assessment)
- **Skill gap breakdown** — color-coded by importance: critical → important → nice-to-have
- **Strengths view** — surfaces what can be skipped entirely, saving onboarding time
- **Live demo mode** — pre-loaded sample result for instant showcase without file uploads

---

## 🏗️ Architecture & Workflow

```
┌─────────────────────────────────────────────────────────┐
│                      User Interface                      │
│         (React SPA — Upload path or Quiz path)          │
└────────────────────┬───────────────────────┬────────────┘
                     │                       │
          ┌──────────▼──────┐     ┌──────────▼──────────┐
          │   File Upload    │     │   Diagnostic Quiz   │
          │ Resume + JD      │     │ JD → 8 AI Questions │
          │ (PDF or .txt)    │     │ → Answers collected │
          └──────────┬───────┘     └──────────┬──────────┘
                     │                        │
                     └──────────┬─────────────┘
                                │
                   ┌────────────▼────────────┐
                   │     Claude API           │
                   │  claude-sonnet-4         │
                   │                         │
                   │  Stage 1: Skill Extract  │
                   │  · Resume → skill list   │
                   │  · JD → competency map   │
                   │                         │
                   │  Stage 2: Gap Analysis   │
                   │  · Delta computation     │
                   │  · Priority scoring      │
                   │                         │
                   │  Stage 3: Pathway Gen    │
                   │  · Dependency ordering   │
                   │  · Phase sequencing      │
                   │  · Module typing         │
                   └────────────┬────────────┘
                                │
                   ┌────────────▼────────────┐
                   │    Structured JSON       │
                   │  · readinessScore        │
                   │  · gaps[]                │
                   │  · pathway[phases]       │
                   │  · strengths[]           │
                   └────────────┬────────────┘
                                │
                   ┌────────────▼────────────┐
                   │     Results Dashboard    │
                   │  · Readiness meter       │
                   │  · Pathway roadmap       │
                   │  · Skill gap view        │
                   │  · Strengths view        │
                   └─────────────────────────┘
```

---

## 🧠 Skill-Gap Analysis Logic

### Skill Extraction
The system uses Claude's language understanding to parse unstructured resume text and job descriptions into structured competency objects:

```json
// From resume
{ "skill": "Python", "level": "intermediate", "yearsExp": 3 }

// From JD
{ "skill": "Python", "importance": "critical" }
```

PDF resumes are passed as base64-encoded `document` blocks to Claude's API, enabling native PDF parsing without external libraries.

### Gap Computation
For each required skill in the JD, the engine checks the candidate's resume skills:

| Resume Level | JD Requirement | Gap Status | Action |
|---|---|---|---|
| expert | critical | ✅ None | Skip in pathway |
| intermediate | critical | ⚠️ Partial | Advanced module |
| none | critical | ❌ Full | Full track |
| any | nice-to-have | ✅ Skip | Omit from pathway |

### Adaptive Pathing Algorithm
Modules are sequenced using a **priority-first, dependency-aware ordering**:

1. **Critical gaps first** — skills marked `critical` in the JD are addressed in Phase 1
2. **Foundational before advanced** — if Skill B depends on Skill A, A is scheduled first
3. **Module type diversity** — phases mix video, workshop, reading, project, and assessment types to avoid fatigue
4. **Strengths are skipped entirely** — skills where the candidate is already at or above the required level are excluded from the pathway

This is conceptually equivalent to topological sorting on a directed skill dependency graph, with importance weights applied at each node.

### Readiness Score
```
readinessScore = (matched_critical_skills / total_critical_skills) * 60
              + (matched_important_skills / total_important_skills) * 30
              + (matched_nicetohave_skills / total_nicetohave_skills) * 10
```
Score is computed by the LLM based on the extracted skill profiles, calibrated to the 0–100 range.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (JSX, hooks) |
| Styling | Inline CSS with CSS variables |
| AI Model | `claude-sonnet-4` via Anthropic Messages API |
| PDF Parsing | Claude native document API (base64 PDF blocks) |
| Build Tool | Vite |
| Hosting | Any static host (Vercel, Netlify, GitHub Pages) |

**No backend required.** The app is a fully client-side React SPA that calls the Anthropic API directly.

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+
- An Anthropic API key → [console.anthropic.com](https://console.anthropic.com)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/pathwayai.git
cd pathwayai

# 2. Install dependencies
npm install

# 3. Add your API key
cp .env.example .env
# Edit .env and add: VITE_ANTHROPIC_API_KEY=your_key_here

# 4. Start the development server
npm run dev

# 5. Open http://localhost:5173
```

### Build for Production

```bash
npm run build
npm run preview
```

### Environment Variables

```env
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🐳 Docker (Optional)

```bash
# Build the image
docker build -t pathwayai .

# Run the container
docker run -p 5173:5173 -e VITE_ANTHROPIC_API_KEY=your_key_here pathwayai
```

---

## 📁 Project Structure

```
pathwayai/
├── src/
│   ├── App.jsx          # Root component + screen router
│   ├── main.jsx         # React entry point
│   └── index.css        # Global resets
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.js
├── Dockerfile
├── .env.example
└── README.md
```

---

## 📊 Internal Metrics

| Metric | Description |
|---|---|
| Readiness Score | 0–100 composite score weighted by skill criticality |
| Gap Count | Number of skills below required proficiency threshold |
| Critical Gap Ratio | critical_gaps / total_required_critical skills |
| Time to Competency | Estimated weeks based on total module hours (assumes 2h/day) |
| Pathway Coverage | % of identified gaps addressed by generated modules |

---

## 🔮 Future Roadmap

- **Manager dashboard** — summary view for hiring managers with cohort comparisons
- **LMS integration** — push generated pathways to Workday, Cornerstone, or 360Learning
- **Progress tracking** — mark modules complete and re-score readiness dynamically
- **Diagnostic quiz expansion** — branching questions based on earlier answers
- **Embedding-based skill matching** — vector similarity for fuzzy skill name matching (e.g. "ML" ↔ "Machine Learning")

---

## 👥 Team

Built for the Adaptive Onboarding Hackathon.

---

## 📄 License

MIT
