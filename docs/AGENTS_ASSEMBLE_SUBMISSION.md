# Agents Assemble: The Healthcare AI Endgame — Submission

**Hackathon:** Agents Assemble - The Healthcare AI Endgame
**Platform:** Devpost / Prompt Opinion
**Deadline:** May 11, 2026
**Track:** Both — Superpower (MCP) + Agent (A2A)
**Prize Pool:** $25,000

---

## Project: BoMed Healthcare Autonomy Platform

### One-Liner
**Permission-gated MCP tools and A2A agents for patient-controlled healthcare — every operation checked against a live trust graph, every resource in FHIR.**

### The Problem

Healthcare AI agents are proliferating, but they operate in one of two modes: full access or no access. A scheduling agent that needs `appointments:read` gets full EMR access. A vitals monitoring bot that needs `vitals:write` gets access to billing records. There is no granular permission layer — and critically, no way for patients to instantly revoke access when trust breaks down.

Existing healthcare AI tools treat permissions as an afterthought. They hard-code API keys, cache access tokens, and require cooperative behavior from agents to respect revocation. None of this works in a world where agents operate autonomously.

### The Solution: BoMed MCP + A2A

BoMed solves this by building the **permission layer** that healthcare AI agents have been missing — exposed as standard **MCP tools** that any agent can use, and an **A2A-compliant agent** that demonstrates autonomous scheduling within patient-defined constraints.

**What we built:**

1. **MCP Server (`@bomed/mcp-healthcare`)** — 10 healthcare tools exposed via Model Context Protocol:
   - `get_patient` → FHIR Patient resource
   - `list_grants` → FHIR Consent Bundle
   - `create_grant` / `revoke_grant` → Permission management with instant revocation
   - `respond_to_request` → Handle incoming access requests
   - `read_vitals` / `record_vital` → FHIR Observation Bundle
   - `book_appointment` → FHIR Appointment with policy enforcement
   - `get_scheduling_policy` → Patient-defined auto-booking constraints
   - `check_permission` → Live permission verification (no caching)

2. **A2A AutoBook Agent** — Autonomous scheduling agent that:
   - Discovers patients with auto-book policies via permission grants
   - Finds optimal appointment slots within policy constraints (hours, days, buffer, weekly limits)
   - Books directly through the permission-gated relay
   - Returns FHIR Appointment resources
   - Exposes skills: `schedule-appointment`, `manage-permissions`, `monitor-vitals`, `propagate-insurance`

3. **FHIR Resource Mapping** — All data flows through FHIR R4:
   - Patient → `Patient` (with World ID verification extension)
   - Vital Signs → `Observation` (LOINC-coded: temperature, heart rate, SpO2, BP)
   - Appointments → `Appointment` (SNOMED service types)
   - Permission Grants → `Consent` (with BoMed scope extensions)
   - Insurance → `Coverage` (US Core profile)

4. **SHARP Context Propagation** — Every MCP tool accepts SHARP parameters for:
   - Patient identification (`sharp_patient_id`, `sharp_patient_handle`)
   - FHIR server connection (`sharp_fhir_server`, `sharp_fhir_token`)
   - Session context (`sharp_session`, `sharp_user_role`)
   - Bolospot auth (`sharp_bolo_token`)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Prompt Opinion Platform                    │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  Other Agents │  │  Clinician       │  │  Patient App  │ │
│  │  (A2A)       │  │  Workspace       │  │  (World ID)   │ │
│  └──────┬───────┘  └────────┬─────────┘  └───────┬───────┘ │
│         │                   │                     │         │
│  ┌──────▼───────────────────▼─────────────────────▼───────┐ │
│  │              SHARP Context Propagation                  │ │
│  │    (patient ID, FHIR token, session, user role)        │ │
│  └──────┬───────────────────┬─────────────────────┬───────┘ │
└─────────┼───────────────────┼─────────────────────┼─────────┘
          │                   │                     │
  ┌───────▼───────┐  ┌───────▼───────┐  ┌─────────▼─────────┐
  │  BoMed MCP    │  │  A2A AutoBook │  │  A2A Vitals Agent │
  │  Server       │  │  Agent        │  │  (Ladybug.bot)    │
  │               │  │               │  │                   │
  │  10 FHIR      │  │  Scheduling   │  │  Vital sign       │
  │  tools        │◄─┤  policy       │  │  monitoring       │
  │               │  │  engine       │  │                   │
  └───────┬───────┘  └───────┬───────┘  └─────────┬─────────┘
          │                   │                     │
  ┌───────▼───────────────────▼─────────────────────▼─────────┐
  │                  Bolospot Permission Layer                  │
  │                                                            │
  │  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐ │
  │  │  Trust Graph  │  │  Relay        │  │  Grant Registry│ │
  │  │  (live check) │  │  (messages)   │  │  (scopes)      │ │
  │  └──────────────┘  └───────────────┘  └────────────────┘ │
  │                                                            │
  │  Every API call checked against live permissions.          │
  │  No caching. Revocation is instant.                        │
  └────────────────────────────────────────────────────────────┘
          │
  ┌───────▼───────────────────────────────────────────────────┐
  │                  World Chain (Identity)                     │
  │                                                            │
  │  BoMedRegistry.sol — World ID verification for both        │
  │  patients AND providers. Bilateral trust.                   │
  └────────────────────────────────────────────────────────────┘
```

### How SHARP Works in BoMed

SHARP (SMART Health Application & Resource Protocol) context propagates patient identity and FHIR credentials through multi-agent call chains. When a Prompt Opinion workspace invokes a BoMed MCP tool:

1. **EHR session** → SHARP extracts patient ID and FHIR access token
2. **MCP tool call** → SHARP params passed as `sharp_patient_id`, `sharp_fhir_token`, etc.
3. **Permission check** → BoMed verifies the caller has the required grant scope
4. **FHIR response** → Data returned as standard FHIR R4 resources
5. **Context forwarded** → If an A2A agent calls another agent, SHARP context propagates

This means any MCP tool or A2A agent in the Prompt Opinion ecosystem can invoke BoMed's healthcare tools with the correct patient context — no custom integration needed.

### Why This Wins

**The AI Factor:**
- GenAI-powered autonomous scheduling with patient-defined policy constraints
- Agent composes multiple MCP tools to handle complex workflows (check permission → read vitals → book appointment → send confirmation)
- Not rule-based: agent reasons about policy constraints, availability, and patient preferences

**Potential Impact:**
- Solves the #1 pain point in healthcare AI: uncontrolled data access
- Patients control exactly what each agent can see (8 granular scopes)
- Instant revocation — not "after the next block" or "if the agent cooperates"
- Insurance propagation saves ~15 minutes per provider switch
- Auto-booking with policy constraints eliminates phone tag

**Feasibility:**
- Built on real standards: MCP, A2A, FHIR R4, US Core, LOINC, SNOMED
- HIPAA-aligned: PHI never stored on-chain, patient controls all access
- Live demo at https://world.bomed.ai with real Bolospot integration
- Both patients AND providers verified via World ID (bilateral trust)
- Production-ready: Docker, Cloud Run, standalone MCP server

### Technical Stack

| Component | Technology |
|---|---|
| MCP Server | `@modelcontextprotocol/sdk`, TypeScript, stdio transport |
| A2A Agent | HTTP + JSON-RPC, Agent Card spec, FHIR artifacts |
| FHIR Resources | R4, US Core profiles, LOINC/SNOMED coding |
| SHARP Context | Custom extension params, compatible with Prompt Opinion |
| Identity | World ID (orb verification), Bolospot @handles |
| Permissions | Bolospot grants API (live trust graph, no caching) |
| Smart Contracts | Solidity on World Chain (BoMedRegistry.sol) |
| Frontend | Next.js 14, React 18, Tailwind CSS 4 |
| Deployment | Docker, Google Cloud Run |

### Running the Project

```bash
# 1. Install dependencies
npm install
cd mcp-server && npm install && cd ..

# 2. Configure environment
cp .env.local.example .env.local
# Add your BOLO_API_KEY, World ID credentials, etc.

# 3. Start the Next.js app (includes A2A endpoints)
npm run dev

# 4. Start the MCP server (stdio transport)
npm run mcp:dev

# 5. Start the standalone A2A agent (HTTP, port 3001)
npm run agent:a2a

# 6. Run the original auto-booking daemon
npm run agent:autobook

# 7. Run the Ladybug.bot vitals agent
npm run agent:ladybug -- --patient @handle --continuous
```

### MCP Server Configuration (for Prompt Opinion)

Add to your MCP client config:

```json
{
  "mcpServers": {
    "bomed-healthcare": {
      "command": "npx",
      "args": ["-y", "@bomed/mcp-healthcare"],
      "env": {
        "BOLO_API_KEY": "your-key",
        "BOLO_API_URL": "https://api.bolospot.com"
      }
    }
  }
}
```

### A2A Agent Discovery

Agent card available at:
- **Next.js app:** `GET https://world.bomed.ai/.well-known/agent.json`
- **Standalone:** `GET http://localhost:3001/.well-known/agent.json`

### Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/.well-known/agent.json` | GET | A2A agent card (capabilities, skills) |
| `/api/a2a` | GET | Agent card (alternative path) |
| `/api/a2a` | POST | A2A JSON-RPC task handling |
| `/api/verify` | POST | World ID proof verification |
| `/api/grants` | GET | List patient permission grants |
| `/api/grants/revoke` | POST | Instant grant revocation |
| `/api/requests` | GET | Incoming access requests |
| `/api/requests/respond` | POST | Approve/deny with policy |
| `/api/vitals` | GET | Patient vital signs |
| `/api/relay/inbox` | GET | Permission-gated relay messages |

### Demo Video Script (Under 3 Minutes)

**0:00-0:20 — The Problem**
"Healthcare AI agents are everywhere — scheduling bots, vitals monitors, insurance processors. But they all face the same problem: there's no permission layer. An agent that needs to read appointments gets full EMR access. And when trust breaks, there's no kill switch."

**0:20-0:50 — The Superpower (MCP)**
"BoMed's MCP server exposes 10 permission-gated healthcare tools. Every tool returns standard FHIR resources. Every call is checked against a live trust graph. Watch — I invoke `read_vitals` through Prompt Opinion, and it returns a FHIR Observation Bundle. Now I revoke vitals access... and the next call fails instantly. No caching. No cooperative behavior required."

**0:50-1:30 — The Agent (A2A)**
"The AutoBook Agent uses these tools autonomously. It discovers patients with auto-book policies, finds slots matching their constraints — allowed hours, days, buffer time, weekly limits — and books directly. SHARP context propagates the patient ID and FHIR token through the entire chain. The agent returns FHIR Appointments. The patient stays in control."

**1:30-2:10 — Patient Control**
"Here's the key: the patient defines the policy. Auto-approve? Only weekdays 9-5? Max 3 per week? 30-minute buffer? The agent respects all of it. And if anything changes — one tap, grant revoked, agent blocked. Not after the next block. Not if the agent cooperates. Instantly."

**2:10-2:45 — Why It Matters**
"BoMed is the permission infrastructure healthcare AI has been missing. MCP tools that any agent can use. A2A agents that compose them. FHIR resources that EHRs understand. SHARP context that propagates through Prompt Opinion. And bilateral World ID verification so both sides are trusted. This is healthcare autonomy — patient-controlled, agent-powered, standards-compliant."

### Judging Criteria Alignment

| Criterion | How BoMed Addresses It |
|---|---|
| **The AI Factor** | Autonomous scheduling agent with policy reasoning, not rule-based. Composes MCP tools for multi-step workflows. GenAI-native permission management. |
| **Potential Impact** | Eliminates uncontrolled data access (#1 healthcare AI pain point). Saves 15+ min per insurance update. Eliminates scheduling phone tag. Patient autonomy over health data. |
| **Feasibility** | Built on MCP/A2A/FHIR standards. HIPAA-aligned (no PHI on-chain). Live demo. Production Docker deployment. Real Bolospot + World ID integration. |

---

## Submission Checklist

- [ ] Prompt Opinion account created
- [ ] MCP server published/accessible
- [ ] A2A agent card discoverable at `/.well-known/agent.json`
- [ ] SHARP context integration tested
- [ ] FHIR resources validated (Patient, Observation, Appointment, Consent, Coverage)
- [ ] Demo video recorded (< 3 minutes)
- [ ] Project published to Prompt Opinion Marketplace
- [ ] Devpost submission completed
- [ ] GitHub repo updated with MCP/A2A documentation
