# BoMed

> *AI agents are transforming healthcare. BoMed makes that feel empowering, not scary.*

**Live:** [world.bomed.ai](https://world.bomed.ai) · **Submission:** [devspot.app/projects/1290](https://devspot.app/projects/1290) · **Video:** [YouTube](https://www.youtube.com/watch?v=OA-1iItaHSg)

---

## Try It

Scan with World App:

[![Open in World App](https://quickchart.io/qr?text=https%3A%2F%2Fworld.bomed.ai&size=180)](https://world.bomed.ai)

Or open [world.bomed.ai](https://world.bomed.ai) in any browser — demo works without World App.

---

[![BoMed Demo](https://img.youtube.com/vi/OA-1iItaHSg/hqdefault.jpg)](https://www.youtube.com/watch?v=OA-1iItaHSg)

---

## What BoMed Does

Every AI agent in healthcare needs to answer the same question before it can do anything useful: *does this person consent to this, right now?*

Today there's no standard answer. Agents call proprietary APIs, share data through opaque integrations, and patients have no unified view — let alone control — over what's been granted or revoked.

BoMed is a reference implementation of permissioned healthcare coordination built on the [Bolospot](https://bolospot.com) protocol. A patient claims a verified `@handle` (authenticated via World ID), then grants and revokes scoped access to healthcare agents in real time.

**The result:** Your PT's scheduling agent finds a time that works. The appointment lands in your calendar. Insurance pre-populates before you arrive. When the visit ends, one tap and they're out.

No phone tag. No forms. No wondering what was shared or who still has access. Healthcare that works like your banking app — you don't think about the infrastructure, you just manage your life.

**The protocol layer, not the app layer, is the point.**

Any provider's scheduling agent can request `appointments:read`. Any insurer's verification agent can request `insurance:verify`. The patient approves, sets a policy, revokes in one tap. The agents don't need to know each other — they just need to know the protocol.

Built on: Bolospot · World ID · Next.js · Cloud Run

---

## The Patient Experience

```
1. Verify with World ID — prove you're a real human, not a bot
2. Claim your @handle — your permanent health address
3. Connect your calendar — so agents book around your real availability
4. Providers request access — you see exactly what they're asking for
5. You approve by scope — appointments ✅  insurance ✅  records ❌
6. Agent books appointment — lands in your Google Calendar
7. Visit ends — one tap revokes everything
```

---

## What Makes It Different

**Agents can act. Patients stay in control.**

Every permission request is visible. Every grant is scoped — your PT can see your schedule, not your lab results. Every revocation is instant and complete. No cached tokens. No lingering access.

Both sides are World ID verified. Your provider is real. You are real. Nobody in this network is a bot.

> *"Every permission granted through BoMed is visible and revocable in your Bolospot account. One place to manage everything — not scattered across apps."*

---

## For Protocol Labs

Healthcare is the hardest testbed for agent coordination infrastructure — high stakes, strict compliance, real consequences when access control fails.

BoMed proves the model works:
- **Agent relay** — providers and their agents communicate through a permissioned channel
- **Scope-based grants** — agents get exactly the access they need, nothing more
- **Instant revocation** — the access layer is always real-time, always patient-controlled
- **Bilateral verification** — both sides are cryptographically verified via World ID

Same primitives, every vertical where AI agents need to act on behalf of humans.

---

## Tracks

- ✅ **World Build 3** — World ID MiniKit, orb verification, bilateral trust
- ✅ **Fresh Code** — ~1,400 lines built from scratch for PL Genesis
- ✅ **Infrastructure & Digital Rights** — agent permission protocol, sovereign identity
- ✅ **AI & Robotics** — agent relay, scheduling policy engine, autonomous booking

---

## Stack

| | |
|--|--|
| Frontend | Next.js 14, World ID MiniKit, Tailwind CSS 4 |
| Identity | Bolospot @handle + World ID |
| Agent coordination | @bolospot/sdk relay + booking API |
| Calendar | Google Calendar API |
| Deployment | Google Cloud Run, Docker |

---

## Setup

```bash
git clone https://github.com/alisoncossette/bomed-pl-genesis.git
cd bomed-pl-genesis
npm install
cp .env.local.example .env.local
npm run dev
```

| Variable | Description |
|----------|-------------|
| `BOLO_API_KEY` | Bolospot API key |
| `NEXT_PUBLIC_WORLD_APP_ID` | World Developer Portal app ID (`app_...`) |
| `NEXT_PUBLIC_WORLD_ACTION` | World ID action (default: `verify-patient`) |
| `GOOGLE_CLIENT_ID` | Google OAuth for calendar |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |

---

*Built on [Bolospot](https://bolospot.com) — the permission protocol for the agentic world.*
