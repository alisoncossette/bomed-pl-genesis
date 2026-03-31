# BoMed

> *AI agents are transforming healthcare coordination. BoMed makes sure the patient is still in charge.*

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

AI agents are already coordinating your healthcare — booking appointments, verifying insurance, requesting records. Most patients have no idea it's happening, no visibility into what was shared, and no way to take it back.

BoMed fixes that.

**One verified @handle. You approve what agents can access. You revoke it when you're done.**

Your PT's scheduling agent books your session. The appointment appears in your Google Calendar. Your insurance auto-populates before you arrive. When the visit ends, one tap removes everything. Not eventually — now.

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
