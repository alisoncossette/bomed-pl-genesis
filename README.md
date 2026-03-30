# BoMed — Patient Identity for the AI Age

> *"AI is making decisions about you, for you, every day. And right now? You have no say. Bolospot changes that."*

**Live:** [world.bomed.ai](https://world.bomed.ai) · **Submission:** [devspot.app/projects/1290](https://devspot.app/projects/1290)

## Try It

**Open in World App** — scan with your phone:

[![Open BoMed in World App](https://quickchart.io/qr?text=https%3A%2F%2Fworld.bomed.ai&size=200)](https://world.bomed.ai)

Or visit [world.bomed.ai](https://world.bomed.ai) directly in a browser for demo mode.

## Demo Video

[![BoMed Demo Video](https://img.youtube.com/vi/OA-1iItaHSg/hqdefault.jpg)](https://www.youtube.com/watch?v=OA-1iItaHSg)

BoMed puts patients in control of their healthcare identity. Scan a QR code, verify your humanity with World ID, grant your provider exactly the access they need — in one tap. No clipboards, no phone tag, no faxes. When the visit ends, revoke access instantly. Nothing cached. Nothing lingering.

> *"Every permission a patient grants through BoMed is visible and revocable in their Bolospot account. One place to manage everything — not scattered across apps."*

Built on Bolospot — an open trust protocol for the AI age.

---

## The Problem

Healthcare data infrastructure is broken — not because the medicine is bad, but because the data layer is a disaster. Patients repeat themselves at every office visit. Insurance cards get lost. Records don't follow people. Providers waste hours on administrative overhead before a single diagnosis is made.

The root cause: **nobody built the permission layer**.

Hospitals own your records. Insurers own your claims. Apps own your data. The patient — the actual human — has no say in who sees what, or for how long.

---

## The Solution

BoMed gives every patient a permanent health identity. Not tied to a hospital. Not owned by an insurer. **Theirs.**

1. **Verify** — Prove personhood with World ID (orb verification). You're a real, unique human — not a bot, not a duplicate.

   <img src="docs/bomed%20login.png" width="220" alt="Login screen" /> <img src="docs/bomed%20verify.png" width="220" alt="World ID verification" />

2. **Link** — Connect your Bolospot @handle. Your permanent health address.
3. **Manage** — See incoming permission requests from providers.
4. **Control** — Granular scope-level consent: ✅ appointments, ✅ insurance, ❌ full records.
5. **Revoke** — Instant, complete revocation. Not eventually. Now.

   <img src="docs/bomed%20app.png" width="220" alt="Patient app — grants and permissions" />

On the provider side, a live dashboard populates in real time with verified patient data before the appointment begins. When insurance changes, patients update it once — it propagates everywhere. When the visit ends, one tap removes access entirely.

<img src="docs/Dashboard%20Before.png" width="340" alt="Provider dashboard — awaiting patient" /> <img src="docs/Dashboard%20After.png" width="340" alt="Provider dashboard — patient verified" />

---

## Architecture

### The Core Principle
> **What you ARE is permanent. What you ALLOW is revocable.**

This single principle drives every architectural decision in BoMed and the Bolospot protocol.

### The Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Humanity** | World ID | Prove you're a real, unique human |
| **Identity** | Bolospot @handle | Your permanent health address |
| **Access Control** | Bolospot protocol | Grant, scope, and revoke permissions |
| **Frontend** | Next.js + World MiniKit | Patient portal + provider dashboard |

### Why Patient Data Never Touches a Decentralized Network

This is an intentional design decision, not a limitation.

BoMed is built on a core principle: **instant, complete revocation**. If a patient revokes a provider's access, that access is gone — not eventually, not after a block confirmation, *instantly*. This is fundamentally incompatible with on-chain storage, where immutability is a feature, not a bug.

We deliberately chose to keep patient data in a permissioned, off-chain system controlled by the patient through Bolospot. The access layer is always real-time, always revocable, always patient-controlled.

Decentralized storage and on-chain verification are used for **provider credentials** — public data like NPI numbers and medical licenses that *should* be immutable and publicly verifiable. A patient should be able to confirm their doctor is who they say they are. That record is permanent by design. The *access grant* is not.

This isn't a compromise. It's the architecture.

### What Belongs On-Chain vs Off-Chain

```
ON-CHAIN (immutable, permanent, public)     OFF-CHAIN (revocable, private, controlled)
─────────────────────────────────────────   ──────────────────────────────────────────
Provider NPI + license verification         Patient insurance details
@handle registration                        Patient demographics
Consent audit trail hashes                  Appointment history
Widget activation records                   Active grants
Professional credentials (BoHire)           Permission scopes
Relationship status (BoLove)                Any patient PII
```

---

## The Bolospot Protocol

BoMed is the first application on Bolospot. Healthcare was first because that's where trust matters most — where the stakes of getting access control wrong are highest.

But this infrastructure isn't healthcare-specific.

The same primitives that let a patient control who sees their insurance card will:
- Let a job seeker control who sees their verified work history (**BoHire**)
- Let a person manage which AI agents can act on their behalf
- Let anyone set the terms for how they're reached, accessed, and represented in an AI-powered world

**The protocol is the product. BoMed is the proof.**

<img src="docs/agent%20activity.png" width="480" alt="AI agent activity — automated appointment booking" />

### Why World ID

Healthcare identity requires proof of humanity — not just authentication. A system where bots can request patient access is a system that fails. World ID's privacy-preserving verification means patients can prove they're real without sacrificing their identity.

One human. One @handle. One source of truth.

### The Roadmap

| Integration | What it adds | Status |
|-------------|-------------|--------|
| World ID | Patient humanity verification | ✅ Built |
| Bolospot | Access control + instant revocation | ✅ Built |
| NEAR Protocol | Provider credential verification (NPI, license on-chain) | 🔜 Next |
| Lit Protocol | Encrypted credential storage for sensitive provider data | 🔜 Planned |
| BoHire | Professional identity on Bolospot protocol | 🔜 In development |
| BoLove | Personal relationship management on Bolospot | 🔜 In development |

---

## Tech Stack

- **Next.js 14** — React framework
- **World ID SDK** — `@worldcoin/minikit-js` for Mini App integration
- **@bolospot/sdk** — TypeScript SDK for Bolospot permission API
- **Tailwind CSS 4** — Dark glassmorphism theme

---

## Setup

```bash
# Clone
git clone https://github.com/Claritrace/bomed-world.git
cd bomed-world

# Install
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your keys

# Run
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BOLO_API_KEY` | Bolospot API key (`bolo_live_...`) |
| `BOLO_API_URL` | Bolospot API URL (default: `https://api.bolospot.com`) |
| `NEXT_PUBLIC_WORLD_APP_ID` | World Developer Portal app ID |
| `NEXT_PUBLIC_WORLD_ACTION` | World ID action name (default: `verify-patient`) |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main flow: verify → link → dashboard
│   ├── layout.tsx            # Root layout with MiniKit provider
│   ├── providers.tsx         # MiniKit initialization
│   ├── globals.css           # Dark glassmorphism theme
│   └── api/
│       ├── verify/           # World ID proof verification
│       ├── handle/link/      # Link @handle to verified identity
│       ├── grants/           # List & revoke active grants
│       ├── requests/         # View & respond to permission requests
│       └── relay/inbox/      # Relay messages (appointments, etc.)
└── lib/
    ├── bolo.ts               # Bolospot SDK client
    └── types.ts              # TypeScript types & scope labels
```

---

## PL Genesis Submission

**Hackathon:** PL_Genesis: Frontiers of Collaboration (Protocol Labs)
**Deadline:** March 31, 2026
**Live URL:** [world.bomed.ai](https://world.bomed.ai)

**Tracks:**
- Fresh Code ✅
- Infrastructure & Digital Rights ✅
- AI & Robotics ✅

**Sponsor Bounties:**
- World ID (World Build 3) ✅

---

## The Why

> *"I want AI to feel like your banking app. You don't think about the infrastructure — you just manage your life. That's Bolospot. And BoMed is just the beginning."*

AI is moving fast and we still haven't built it for people. BoMed is what happens when you do.

---

*Built with 💚 on Bolospot — the open trust protocol for human-forward AI.*
