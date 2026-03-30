# BoMed

> *Magical access and control for humans in the agentic world.*

**Live:** [world.bomed.ai](https://world.bomed.ai) · **Submission:** [devspot.app/projects/1290](https://devspot.app/projects/1290) · **Video:** [YouTube](https://www.youtube.com/watch?v=OA-1iItaHSg)

---

## Try It Now

Scan with World App on your phone:

[![Open in World App](https://quickchart.io/qr?text=https%3A%2F%2Fworld.bomed.ai&size=180)](https://world.bomed.ai)

Or open [world.bomed.ai](https://world.bomed.ai) in any browser — demo mode works without World App.

---

[![BoMed Demo](https://img.youtube.com/vi/OA-1iItaHSg/hqdefault.jpg)](https://www.youtube.com/watch?v=OA-1iItaHSg)

---

## The Problem

We're building the agentic world. Agents that schedule, authorize, access, act.

And we forgot to build the part where **humans stay in control**.

Your PT can't book a single appointment without full access to your medical chart. Your insurer can't verify coverage without seeing everything. Neither side knows if the other is legitimate. Nobody built the permission layer.

---

## The Solution

One World ID verification. One permanent @handle. Providers and their agents request exactly what they need — appointments, insurance, vitals. You see it, you approve it, you revoke it.

Your PT's agent books your session. The appointment appears in your Google Calendar. You never touched a clipboard.

When you revoke — it's gone. **Not eventually. Now.**

> *"Every permission a patient grants through BoMed is visible and revocable in their Bolospot account. One place to manage everything — not scattered across apps."*

---

## What Makes It Different

**Both sides are World ID verified.** Patient AND provider. One human, one handle. No bots making decisions about your health.

**Trust follows the person, not the software.** Practice switches EHRs — your grants persist. Because the permission lives with the patient, not the app.

**Three layers of trust. Zero clipboard.**
- World ID → proves you're a real human
- Bolospot → proves who you are
- BoMed → proves you belong in the network

---

## How It Works

```
Patient verifies with World ID (orb)
        ↓
Bolospot @handle created — permanent health address
        ↓
Providers send permission requests to your @handle
        ↓
You approve scopes: appointments ✅  insurance ✅  records ❌
        ↓
Approved → real appointment booked in your Google Calendar
        ↓
Visit ends → one tap revokes everything
```

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Humanity verification | World ID MiniKit |
| Permanent identity | Bolospot @handle |
| Permission protocol | @bolospot/sdk |
| Calendar integration | Google Calendar API via Bolospot |
| Frontend | Next.js 14, Tailwind CSS 4 |
| Deployment | Google Cloud Run, Docker |

**What you ARE is permanent. What you ALLOW is revocable.**

Patient data never touches a decentralized network by design — instant revocation requires real-time control, which is incompatible with on-chain immutability. Provider credentials (NPI, licenses) are the right fit for on-chain: public, permanent, verifiable.

---

## For Protocol Labs

The agentic stack is missing its consent layer.

IPFS stores. World ID verifies. **Bolospot answers: who can reach me, what can they do, and how do I take it back?**

BoMed proves it works in the hardest domain — healthcare, where the stakes of getting access control wrong are highest. Same primitives generalize to legal, finance, hiring, any vertical where AI needs human permission to act.

**The protocol is the product. BoMed is the proof.**

---

## PL Genesis Tracks

- ✅ **World Build 3** — World ID MiniKit, orb verification, bilateral human trust
- ✅ **Fresh Code** — ~1,400 lines built from scratch for PL Genesis
- ✅ **Infrastructure & Digital Rights** — consent protocol, sovereign identity, instant revocation
- ✅ **AI & Robotics** — agent relay, scheduling policy engine, autonomous appointment booking

---

## Setup

```bash
git clone https://github.com/alisoncossette/bomed-pl-genesis.git
cd bomed-pl-genesis
npm install
cp .env.local.example .env.local
# Add your keys (see Environment Variables below)
npm run dev
```

| Variable | Description |
|----------|-------------|
| `BOLO_API_KEY` | Bolospot API key (`bolo_live_...`) |
| `NEXT_PUBLIC_WORLD_APP_ID` | World Developer Portal app ID |
| `NEXT_PUBLIC_WORLD_ACTION` | World ID action (default: `verify-patient`) |
| `GOOGLE_CLIENT_ID` | Google OAuth for calendar connect |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |

---

*Built with 💚 on [Bolospot](https://bolospot.com) — the open trust protocol for human-forward AI.*
