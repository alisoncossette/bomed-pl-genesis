# BoMed Healthcare Autonomy Platform

> *Permission-gated MCP tools and A2A agents for patient-controlled healthcare.*

**Live:** [world.bomed.ai](https://world.bomed.ai) · **Agent Card:** [/.well-known/agent.json](https://world.bomed.ai/.well-known/agent.json) · **Video:** [YouTube](https://www.youtube.com/watch?v=OA-1iItaHSg)

---

## What BoMed Does

Healthcare AI agents need a permission layer. Today they operate in two modes: full access or no access. BoMed provides the missing middle — **10 MCP tools** that expose patient-controlled operations, an **A2A agent** that schedules autonomously within patient-defined constraints, and **FHIR R4 resources** that EHRs understand.

Every operation is checked against a live trust graph. Revocation is instant. Both sides are World ID verified. SHARP context propagates patient identity through multi-agent chains.

---

## Architecture

```
Prompt Opinion Platform
    │
    ├── SHARP Context Propagation (patient ID, FHIR token, session)
    │
    ├── BoMed MCP Server ──── 10 FHIR tools (Patient, Observation, Appointment, Consent, Coverage)
    │
    ├── A2A AutoBook Agent ── Autonomous scheduling with policy constraints
    │
    └── A2A Vitals Agent ──── Ladybug.bot vital sign monitoring
          │
    Bolospot Permission Layer (live trust graph, no caching)
          │
    World Chain (bilateral World ID verification)
```

---

## MCP Server (Superpower)

The `@bomed/mcp-healthcare` MCP server exposes 10 permission-gated healthcare tools:

| Tool | Description | FHIR Resource |
|------|-------------|---------------|
| `get_patient` | Patient demographics + verification status | Patient |
| `list_grants` | Active permission grants | Bundle of Consent |
| `create_grant` | Grant scoped access to a provider | Consent |
| `revoke_grant` | Instant revocation (no caching) | — |
| `respond_to_request` | Approve/deny incoming access requests | Consent |
| `read_vitals` | Patient vital signs (LOINC-coded) | Bundle of Observation |
| `record_vital` | Record a new vital reading | Observation |
| `book_appointment` | Book with policy enforcement | Appointment |
| `get_scheduling_policy` | Patient auto-booking constraints | Policy JSON |
| `check_permission` | Live permission check for a scope | — |

**Permission Scopes:** `appointments:read`, `appointments:request`, `insurance:read`, `insurance:transmit`, `demographics:read`, `vitals:write`, `vitals:read`, `records:read`

### MCP Configuration

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

---

## A2A Agent

The AutoBook Agent implements the A2A protocol with 4 skills:

| Skill | Description |
|-------|-------------|
| `schedule-appointment` | Find and book optimal slots within patient policy |
| `manage-permissions` | Handle grants, revocations, access requests |
| `monitor-vitals` | Read and record vital signs via relay |
| `propagate-insurance` | Share coverage with authorized providers |

**Agent Card:** `GET /.well-known/agent.json`
**Task Endpoint:** `POST /api/a2a` (JSON-RPC)

---

## FHIR R4 Resources

All data flows through standard FHIR R4 with US Core profiles:

- **Patient** — World ID verification extension, Bolospot @handle identifier
- **Observation** — LOINC-coded vitals (temperature 8310-5, heart rate 8867-4, SpO2 2708-6, BP 85354-9)
- **Appointment** — SNOMED service types, auto-book extension
- **Consent** — Granular scope mapping to FHIR resource types
- **Coverage** — US Core profile, insurance plan details

---

## SHARP Context

Every MCP tool accepts SHARP parameters for Prompt Opinion integration:

| Parameter | Description |
|-----------|-------------|
| `sharp_patient_id` | Patient identifier (FHIR Patient ID) |
| `sharp_patient_handle` | Bolospot @handle |
| `sharp_fhir_server` | FHIR server base URL |
| `sharp_fhir_token` | FHIR access token |
| `sharp_bolo_token` | Bolospot auth token |
| `sharp_session` | Session ID for context tracking |
| `sharp_user_role` | Role: patient, provider, or agent |

---

## The Patient Experience

```
1. Verify with World ID — prove you're a real human
2. Claim your @handle — your permanent health address
3. Connect your calendar — agents book around your availability
4. Set your policy — allowed hours, days, buffer, weekly max
5. Providers request access — you see exactly what they're asking for
6. You approve by scope — appointments ✅  insurance ✅  records ❌
7. Agent books autonomously — within YOUR constraints, in YOUR calendar
8. Visit ends — one tap revokes everything, instantly
```

---

## Setup

```bash
# Clone and install
git clone https://github.com/alisoncossette/bomed-pl-genesis.git
cd bomed-pl-genesis
npm install

# Install MCP server dependencies
cd mcp-server && npm install && cd ..

# Configure environment
cp .env.local.example .env.local

# Start the Next.js app (includes A2A endpoints)
npm run dev

# Start the MCP server (stdio transport)
npm run mcp:dev

# Start the standalone A2A agent (HTTP, port 3001)
npm run agent:a2a

# Run auto-booking daemon
npm run agent:autobook

# Run Ladybug.bot vitals agent
npm run agent:ladybug -- --patient @handle --continuous
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `BOLO_API_KEY` | Bolospot API key |
| `BOLO_API_URL` | Bolospot API URL (default: `https://api.bolospot.com`) |
| `BOLO_WIDGET_SLUG` | Widget slug (default: `bomed`) |
| `NEXT_PUBLIC_WORLD_APP_ID` | World Developer Portal app ID |
| `NEXT_PUBLIC_WORLD_ACTION` | World ID action (default: `verify-patient`) |
| `GOOGLE_CLIENT_ID` | Google OAuth for calendar |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `A2A_PORT` | A2A agent HTTP port (default: `3001`) |

---

## Stack

| Component | Technology |
|-----------|------------|
| MCP Server | `@modelcontextprotocol/sdk`, TypeScript, stdio |
| A2A Agent | HTTP + JSON-RPC, Agent Card spec |
| FHIR | R4, US Core, LOINC, SNOMED |
| SHARP | Custom extension params for Prompt Opinion |
| Identity | World ID (orb verification) + Bolospot @handles |
| Permissions | Bolospot grants API (live trust graph) |
| Contracts | Solidity on World Chain (BoMedRegistry.sol) |
| Frontend | Next.js 14, React 18, Tailwind CSS 4 |
| Deployment | Docker, Google Cloud Run |

---

## Hackathon Tracks

- **Agents Assemble** — Superpower (MCP) + Agent (A2A)
- **PL Genesis** — Fresh Code, World Build 3, AI & Robotics, Infrastructure & Digital Rights

---

*Built on [Bolospot](https://bolospot.com) — the permission protocol for the agentic world.*
