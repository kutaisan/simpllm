# ⚡ SimpLLM — Intelligent AI Model Router for GitHub Copilot

**SimpLLM** automatically selects the optimal AI model for each task in GitHub Copilot, maximizing developer productivity while minimizing credit consumption.

> One prompt goes through two passes: first a free classifier model analyzes the task, then the best-fit model handles the actual work.

---

## 🎯 The Problem

GitHub Copilot Enterprise offers **18+ AI models** with different credit costs (0x to 3x). Developers typically:

- Use the **default model** for everything (wasting credits on simple tasks)
- Manually switch models (context switching = lost productivity)
- Run out of credits mid-month (blocked from premium models when needed most)

## ✅ The Solution

SimpLLM uses a **two-pass architecture:**

```
Developer → @simpllm Write unit tests for UserService

     ┌──────────────────────────────┐
     │  PASS 1: Classification      │
     │  Classifier: GPT-4o (0x)     │
     │  Result: TASK:test            │
     └──────────────┬───────────────┘
                    │
     ┌──────────────▼───────────────┐
     │  PASS 2: Execution           │
     │  Model: Claude Sonnet 4.5    │
     │  Credit: 1x                  │
     └──────────────┬───────────────┘
                    │
     ┌──────────────▼───────────────┐
     │  Response + 👍👎 + Retry     │
     │  Budget: 67% remaining       │
     └──────────────────────────────┘
```

---

## 🚀 Quick Start

```bash
# Clone & build
git clone https://github.com/your-org/simpllm.git
cd simpllm/extension
npm install && npm run compile
```

### Use

```
@simpllm Write a function that validates email addresses
@simpllm /stats          ← Detailed usage statistics
@simpllm /budget         ← Credit budget status
```

### Force a Specific Model

```
@simpllm @opus Analyze this architecture
@simpllm @gpt4o Quick syntax question
@simpllm @sonnet4.5 Write comprehensive tests
```

---

## 🏢 Admin Dashboard

SimpLLM includes a **self-hosted admin dashboard** (Docker) for centralized management.

### Setup

```bash
cd dashboard
docker compose up -d
# Dashboard: http://localhost:3000
```

### Features

| Page | Description |
|------|-------------|
| **Dashboard** | Overview cards, daily usage trends, model/task distribution charts |
| **Users** | Per-user usage, credits consumed, satisfaction rate |
| **Feedback** | 👍👎 review, override analysis, export |
| **Settings** | Classifier model, routing rules, budgets, blocked models |
| **Credit Requests** | Approve/reject queue for user credit requests |

### Admin Controls
- **Classifier Model** — Which model classifies prompts (recommended: GPT-4o at 0x)
- **Routing Rules** — Task type → model mapping (test → Sonnet 4.5, debug → GPT-4o, etc.)
- **Monthly Budget** — Credit limit per user
- **Blocked Models** — Restrict expensive models

> All data stays on your servers. Zero third-party data leakage.

---

## ⚙️ Extension Settings (User)

Users have limited configuration:

| Setting | Default | Description |
|---------|---------|-------------|
| `simpllm.enabled` | `true` | Enable/disable routing |
| `simpllm.showModelInfo` | `true` | Show model info in responses |

Admin-controlled settings are pushed via managed configuration.

---

## 📊 Available Models

| Model | Credit | Best For |
|-------|--------|----------|
| GPT-4.1 | 0x | General, debugging |
| GPT-4o | 0x | General, classification |
| GPT-5 Mini | 0x | Quick questions |
| Claude Haiku 4.5 | 0.33x | Quick edits |
| Gemini 3 Flash | 0.33x | Fast tasks |
| GPT-5.1-Codex-Mini | 0.33x | Autocomplete |
| Claude Sonnet 4 | 1x | Code quality |
| Claude Sonnet 4.5 | 1x | Tests, review |
| Gemini 2.5 Pro | 1x | Large codebases (1M context) |
| Gemini 3 Pro | 1x | Modern frameworks |
| GPT-5 | 1x | Complex reasoning |
| GPT-5-Codex | 1x | Code generation |
| GPT-5.1 | 1x | Complex tasks |
| GPT-5.1-Codex | 1x | Code generation |
| GPT-5.1-Codex-Max | 1x | Large refactoring |
| GPT-5.2 | 1x | Latest features |
| GPT-5.2-Codex | 1x | Latest code patterns |
| Claude Opus 4.5 | 3x | Architecture, security |

---

## 🗺 Roadmap

- [ ] Adaptive routing — learn from feedback
- [ ] A/B testing — compare models
- [ ] Token budget — per-user tracking
- [ ] GitHub Enterprise audit log integration
- [ ] Centralized web analytics dashboard

---

## 📄 License

MIT License
