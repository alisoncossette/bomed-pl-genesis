# PL Genesis Hackathon Submission

**Deadline:** March 31, 2026
**Platform:** Devfolio
**Event:** PL Genesis: Frontiers of Collaboration (Protocol Labs)

---

## Project 1: BoMed — Patient-Controlled Healthcare Permissions

### 🎯 One-Liner
**"World ID meets healthcare: Patients verify once, then control exactly who sees what in their medical records—forever."**

### 💔 The Problem
Your physical therapist needs to book appointments. Do you give them full EMR access? No way. But the only option is "yes to everything" or "share nothing." Meanwhile, healthcare agents are proliferating—scheduling bots, insurance verifiers, care coordinators—and every single one wants database-level access to your chart. Patients need granular control that actually works.

### ✅ The Solution
BoMed is a World App Mini App where patients verify their identity with World ID (orb verification), then manage healthcare permissions through Bolospot's sovereign permission layer.

**The flow:**
1. **Verify** — Open Mini App, prove personhood with World ID
2. **Link** — Connect your Bolospot @handle (now provably human)
3. **Manage** — See incoming permission requests from your PT practice
4. **Control** — Grant scope-level access: ✅ `appointments:read`, ✅ `insurance:write`, ❌ `records:full`
5. **Revoke** — Instant revocation. No cached tokens. Trust graph updates live.

Permissions follow *people*, not software. Your PT's scheduling agent inherits their @handle. When you revoke access, it's immediate. When they message you (appointment reminders, insurance questions), it goes through the relay—agent-to-agent messaging through your trust boundary.

### 🌍 Why Protocol Labs / Why Now
Protocol Labs is building infrastructure for a future where AI agents are first-class actors. BoMed proves that future needs *permission infrastructure*—not just storage (IPFS) or identity (World ID), but the layer that says "this agent can see this scope, for this person, right now."

Healthcare is the perfect testbed: high stakes, strict compliance (HIPAA), and an explosion of agents. If sovereign permissions work here, they work everywhere.

### 🪪 World ID Angle
World ID solves the foundational problem: **Is this actually a patient, or a bot pretending to be one?**

Without orb verification, @handles are just strings. With World ID:
- **One patient = one @handle** — no bots gaming the system
- **Sybil resistance** — can't create fake patients to harvest data
- **Trust anchor** — when a PT sees "verified patient," they know it's real

This is the first healthcare permission system built on proof-of-personhood. HIPAA requires identity verification; World ID makes it cryptographic.

### 🛠 Tech Stack
- **Next.js 14** — React framework (matches World's starter kit)
- **World ID SDK** — `@worldcoin/minikit-js` for Mini App integration
- **@bolospot/sdk** — TypeScript SDK for Bolospot permission API
- **Tailwind CSS 4** — Dark glassmorphism theme, mobile-first
- **Vercel** — Deployment platform

### 🏗 What Was Built During the Hackathon (Fresh Code)
**Everything.** This was built from scratch for PL Genesis.

- **World ID integration** — Mini App with orb verification flow
- **Permission dashboard** — View active grants, incoming requests, relay inbox
- **Granular scope control** — 8 scopes (appointments, insurance, records, labs, imaging, billing, notes, vitals)
- **Instant revocation** — No cached tokens, live trust graph
- **Agent relay** — Appointment reminders & insurance questions routed through trust boundary
- **@handle linking** — Connect verified World ID to Bolospot address

**Files created:**
- `src/app/page.tsx` — Main flow (verify → link → dashboard)
- `src/app/api/verify/route.ts` — World ID proof verification
- `src/app/api/handle/link/route.ts` — Link @handle to verified identity
- `src/app/api/grants/route.ts` — List & revoke active grants
- `src/app/api/requests/route.ts` — View & respond to permission requests
- `src/app/api/relay/inbox/route.ts` — Relay messages
- `src/lib/bolo.ts` — Bolospot SDK client
- `src/lib/types.ts` — TypeScript types & scope labels

Total: ~1,200 lines of TypeScript. No existing codebase. Fresh Code track.

### 🎥 Demo Video Description
**Title:** "BoMed: Patient-Controlled Healthcare Permissions with World ID"

**Script (90 seconds):**
1. **Problem** (0:00-0:15) — "Your PT wants to book appointments. Do you give them full access to your medical records? Probably not. But that's the only option today."
2. **Solution** (0:15-0:30) — "BoMed lets patients control exactly who sees what. Verify with World ID, link your @handle, grant scoped permissions."
3. **Demo** (0:30-1:00) — Show: World ID verification → @handle link → permission request from PT → grant `appointments:read` only → revoke instantly
4. **Why it matters** (1:00-1:30) — "Permissions follow people, not software. Your PT's agent inherits their @handle. When you revoke, it's immediate. This is healthcare built for an AI-native world—starting with proof-of-personhood."

### 📝 Devfolio Short Description (150 chars max)
**"Patients verify with World ID, then control healthcare permissions at scope-level. Your PT gets appointments, not your full chart. Built on Bolospot."**
(149 chars)

### 📝 Devfolio Long Description (500-800 words)

**The problem healthcare won't admit it has**

Your physical therapist needs to book appointments. Your insurance coordinator needs to verify coverage. Your care manager needs to check vitals. Do you give them full access to your medical records? Of course not. But the only option today is "yes to everything" or "share nothing."

Meanwhile, healthcare agents are proliferating. Scheduling bots, insurance verifiers, care coordinators, lab result parsers—every single one wants database-level access to your chart. Patients are stuck choosing between convenience (give everyone access) and privacy (lock everything down).

**BoMed: Sovereign permissions for healthcare**

BoMed is a World App Mini App where patients verify their identity with World ID, then manage healthcare permissions through Bolospot's sovereign permission layer.

The flow is simple:
1. **Verify** — Open the Mini App, prove personhood with World ID (orb verification)
2. **Link** — Connect your Bolospot @handle (now provably human)
3. **Manage** — See incoming permission requests from your PT practice
4. **Control** — Grant scope-level access: ✅ `appointments:read`, ✅ `insurance:write`, ❌ `records:full`
5. **Revoke** — Instant revocation. No cached tokens. Trust graph updates live.

**How it works**

Permissions follow *people*, not software. Your PT has a Bolospot @handle. Their scheduling agent inherits that @handle. When you grant `appointments:read` to your PT, their agent can:
- Read your appointment schedule
- Send appointment reminders via relay
- Request new appointment slots

But the agent **cannot** access your insurance data, lab results, or clinical notes. You control the scope.

When you revoke access, it's immediate. No cached tokens. No "24-48 hours to propagate." The trust graph updates live, and the next API call fails.

**Why World ID?**

World ID solves the foundational problem: **Is this actually a patient, or a bot pretending to be one?**

Without orb verification, @handles are just strings. With World ID:
- **One patient = one @handle** — no bots gaming the system
- **Sybil resistance** — can't create fake patients to harvest data
- **Trust anchor** — when a PT sees "verified patient," they know it's real

This is the first healthcare permission system built on proof-of-personhood. HIPAA requires identity verification; World ID makes it cryptographic.

**Why Bolospot?**

Bolospot is the missing layer: **a consumer permissioning protocol for AI agents.**

Think email for agents. Your @handle is permanent. You control who can reach you and what they can do. No more "sign in with Google" on 47 different health apps. Your permissions are sovereign—they follow you, not the software vendor.

The key insight: **permissions are conversations.** Your PT requests `appointments:read`. You approve. They message you via relay ("Reminder: PT tomorrow at 2pm"). You revoke when you switch providers. All through one @handle, one trust graph.

**What was built**

Everything. This was built from scratch for PL Genesis (Fresh Code track).

- World ID Mini App with orb verification flow
- Permission dashboard (view grants, requests, relay inbox)
- Granular scope control (8 scopes: appointments, insurance, records, labs, imaging, billing, notes, vitals)
- Instant revocation (no cached tokens)
- Agent relay (appointment reminders routed through trust boundary)
- @handle linking (connect verified World ID to Bolospot address)

~1,200 lines of TypeScript. Next.js 14, World ID SDK, @bolospot/sdk, Tailwind CSS 4.

**Why this matters**

Healthcare is the perfect testbed for AI-native infrastructure. High stakes, strict compliance (HIPAA), and an explosion of agents. If sovereign permissions work here, they work everywhere.

Protocol Labs is building infrastructure for a future where AI agents are first-class actors. BoMed proves that future needs *permission infrastructure*—not just storage (IPFS) or identity (World ID), but the layer that says "this agent can see this scope, for this person, right now."

This is healthcare built for an AI-native world. Starting with proof-of-personhood.

**(752 words)**

### 🏷 Devfolio Tags
- World ID
- Healthcare
- Privacy
- Permissions
- AI Agents
- Identity
- Mini App
- HIPAA
- Decentralized
- TypeScript

---

## Project 2: Bolospot — Your Address for AI Agents

### 🎯 One-Liner
**"Your permanent address for AI agents. People can knock. Who gets the key is up to you."**

### 💔 The Problem
You have 47 SaaS accounts. Each one has a different idea of "you." Your Calendly link expires when you switch jobs. Your scheduling preferences don't follow you to the new tool. Every agent wants full access or nothing. There's no *consumer layer* for permissions—just a patchwork of vendor silos.

Meanwhile, AI agents are proliferating. They need to reach you (scheduling, support, research). But you have no control over who can knock, what they can see, or how to revoke access when things change.

### ✅ The Solution
Bolospot is a consumer permissioning layer for AI agents. You get a permanent @handle (like email, but for agents). Agents request access to specific scopes. You grant or deny. Revoke anytime. Messages route through your relay.

**The magic:**
- **Permanent address** — Your @handle isn't tied to any tool. Switch jobs, change tools, your address stays.
- **Granular permissions** — Grant `calendar:read` without `email:send`. Revoke instantly.
- **Agent-to-agent messaging** — No more "reply to this email." Agents talk through your relay. You control the trust boundary.
- **Works for both sides** — Not a Calendly competitor. Calendly gives *you* a link. Bolospot gives *everyone* an address. Agents negotiate both sides.

**Example:** Your assistant agent has your @handle. A recruiter's scheduling agent wants to book a call. The two agents negotiate through Bolospot. No email ping-pong. No shared Google Doc. Just two agents, one protocol, your permission.

### 🌍 Why Protocol Labs / Why Now
Protocol Labs is building infrastructure for an AI-native future. Bolospot is the missing piece: **a consumer protocol for agent permissions.**

We have:
- Storage (IPFS)
- Identity (World ID, DIDs)
- Messaging (Backchannel, Waku)

We don't have: **"Who can reach me, and what can they do?"**

Bolospot fills that gap. It's infrastructure, not an app. Your @handle is portable. Permissions are sovereign. Agents negotiate through a protocol, not a vendor.

This is the calendar/email/CRM replacement the AI era needs. Built as infrastructure, not SaaS.

### 🪪 World ID Angle
World ID integration was added during the hackathon to solve the **Sybil problem:**

Without proof-of-personhood, @handles are free. Bots can spin up 10,000 @handles, spam your relay, harvest permissions. With World ID:
- **One human = one verified @handle** — no bot farms
- **Sybil resistance** — can't game the trust graph
- **Trust signal** — when you see "verified human," you know it's real

This makes Bolospot's relay actually usable. Spam is solved at the protocol layer, not the app layer.

### 🛠 Tech Stack
- **Protocol** — RESTful API (bolo protocol spec)
- **SDK** — `@bolospot/sdk` (TypeScript, open source)
- **Backend** — Node.js, PostgreSQL, Redis (trust graph cache)
- **World ID** — `@worldcoin/id` for verification
- **Deployment** — Vercel (API), Cloudflare Workers (relay)

### 🏗 What Was Built During the Hackathon (Existing Code Enhancements)
Bolospot existed before the hackathon, but **World ID integration was built fresh:**

- **World ID verification flow** — Prove personhood to claim @handle
- **Verified badge system** — Mark @handles as "verified human" in trust graph
- **Anti-Sybil relay rules** — Unverified @handles have rate limits; verified @handles don't
- **SDK updates** — `@bolospot/sdk` methods for World ID verification

**New files:**
- `src/verification/worldid.ts` — World ID integration
- `src/middleware/sybil.ts` — Rate limiting based on verification status
- `src/api/handle/verify.ts` — Endpoint to verify @handle with World ID

Total: ~400 lines of TypeScript added to existing codebase.

### 🎥 Demo Video Description
**Title:** "Bolospot: Your Permanent Address for AI Agents"

**Script (90 seconds):**
1. **Problem** (0:00-0:15) — "You have 47 SaaS accounts. Your Calendly link expires when you switch jobs. Every agent wants full access or nothing. There's no *you* that follows you across tools."
2. **Solution** (0:15-0:30) — "Bolospot gives you a permanent @handle. Agents request access. You grant scopes. Revoke anytime. Works for both sides—not just scheduling, but any agent interaction."
3. **Demo** (0:30-1:00) — Show: Claim @handle → World ID verification → agent requests `calendar:read` → grant permission → agent sends message via relay → revoke access
4. **Why it matters** (1:00-1:30) — "This isn't a Calendly competitor. It's infrastructure. Your @handle is portable. Permissions are sovereign. Agents negotiate through a protocol, not a vendor. Built for an AI-native world—starting with proof-of-personhood."

### 📝 Devfolio Short Description (150 chars max)
**"Your permanent address for AI agents. Grant scoped permissions, revoke instantly, route messages through your relay. Built on World ID. Protocol, not SaaS."**
(150 chars exactly)

### 📝 Devfolio Long Description (500-800 words)

**The problem nobody's naming**

You have 47 SaaS accounts. Each one has a different idea of "you." Your Calendly link expires when you switch jobs. Your scheduling preferences don't follow you to the new tool. Every agent wants full access or nothing.

There's no *consumer layer* for permissions—just a patchwork of vendor silos.

Meanwhile, AI agents are proliferating. They need to reach you (scheduling, support, research, sales). But you have no control over who can knock, what they can see, or how to revoke access when things change.

**Bolospot: Your permanent address for AI agents**

Bolospot is a consumer permissioning layer for AI agents. You get a permanent @handle (like email, but for agents). Agents request access to specific scopes. You grant or deny. Revoke anytime. Messages route through your relay.

**How it works:**

1. **Claim your @handle** — `alison@bolo` is yours forever. Not tied to any tool.
2. **Verify with World ID** — Prove you're human. One person, one @handle.
3. **Grant scoped permissions** — Agent requests `calendar:read`. You approve. They can read your calendar, not send emails.
4. **Revoke instantly** — Trust graph updates live. No cached tokens. Next API call fails.
5. **Route messages through relay** — Agent sends "Meeting reminder: tomorrow at 2pm." It goes through your relay. You control the trust boundary.

**The key insight: This works for BOTH sides.**

Calendly gives *you* a link. Bolospot gives *everyone* an address.

Example: Your assistant agent has your @handle. A recruiter's scheduling agent wants to book a call. The two agents negotiate through Bolospot:
- Recruiter's agent: "Request `calendar:availability`"
- Your agent (acting on your behalf): "Granted. Here are 3 slots."
- Recruiter's agent: "Booked Tuesday 2pm."
- Your agent: "Confirmed."

No email ping-pong. No shared Google Doc. Just two agents, one protocol, your permission.

**Why World ID?**

Without proof-of-personhood, @handles are free. Bots can spin up 10,000 @handles, spam your relay, harvest permissions.

With World ID:
- **One human = one verified @handle** — no bot farms
- **Sybil resistance** — can't game the trust graph
- **Trust signal** — when you see "verified human," you know it's real

This makes Bolospot's relay actually usable. Spam is solved at the protocol layer, not the app layer.

**Permissions follow people, not software**

Your @handle is permanent. Your permissions are sovereign. When you switch jobs:
- Old company's agents lose access (you revoked)
- New company's agents request access (you grant)
- Your @handle stays the same

No "migrate to new Calendly." No "export contacts from old CRM." Your trust graph follows *you*.

**What was built during the hackathon**

Bolospot existed before PL Genesis, but **World ID integration was built fresh:**

- World ID verification flow (prove personhood to claim @handle)
- Verified badge system (mark @handles as "verified human" in trust graph)
- Anti-Sybil relay rules (unverified @handles have rate limits; verified @handles don't)
- SDK updates (`@bolospot/sdk` methods for World ID verification)

~400 lines of TypeScript added to existing codebase.

**Why this matters**

Protocol Labs is building infrastructure for an AI-native future. Bolospot is the missing piece: **a consumer protocol for agent permissions.**

We have:
- Storage (IPFS)
- Identity (World ID, DIDs)
- Messaging (Backchannel, Waku)

We don't have: **"Who can reach me, and what can they do?"**

Bolospot fills that gap. It's infrastructure, not an app. Your @handle is portable. Permissions are sovereign. Agents negotiate through a protocol, not a vendor.

This is the calendar/email/CRM replacement the AI era needs. Built as infrastructure, not SaaS. Starting with proof-of-personhood.

**Not a Calendly competitor. A protocol.**

Calendly solves one side (share your availability). Bolospot solves both sides (agents negotiate permissions). Calendly is SaaS. Bolospot is infrastructure.

Your @handle works with any tool that speaks the protocol. Switch calendar apps, change CRMs, your @handle stays. That's the point.

This is your address for an AI-native world. Permanent. Sovereign. Built on proof-of-personhood.

**(721 words)**

### 🏷 Devfolio Tags
- Infrastructure
- Permissions
- AI Agents
- World ID
- Protocol
- Decentralized
- Privacy
- Interoperability
- Identity
- TypeScript

---

## Submission Checklist

### BoMed (Project 1)
- [ ] Devfolio project created
- [ ] Short description (149 chars) pasted
- [ ] Long description (752 words) pasted
- [ ] Tags selected: World ID, Healthcare, Privacy, Permissions, AI Agents, Identity, Mini App, HIPAA, Decentralized, TypeScript
- [ ] Tracks selected: **World Build 3 (primary)**, Fresh Code, AI & Robotics, Infrastructure & Digital Rights
- [ ] Demo video uploaded (90 seconds)
- [ ] GitHub repo linked: `https://github.com/[username]/bomed-world`
- [ ] Screenshots added (Mini App, permission dashboard, World ID verification)
- [ ] Team members added

### Bolospot (Project 2)
- [ ] Devfolio project created
- [ ] Short description (150 chars) pasted
- [ ] Long description (721 words) pasted
- [ ] Tags selected: Infrastructure, Permissions, AI Agents, World ID, Protocol, Decentralized, Privacy, Interoperability, Identity, TypeScript
- [ ] Tracks selected: **Existing Code (primary)**, Infrastructure & Digital Rights, AI & Robotics
- [ ] Demo video uploaded (90 seconds)
- [ ] GitHub repo linked: `https://github.com/bolospot/bolo-api`
- [ ] Screenshots added (permission flow, relay inbox, World ID badge)
- [ ] Team members added

### Both Projects
- [ ] Demo videos under 2 minutes
- [ ] Code pushed to GitHub
- [ ] README.md updated with setup instructions
- [ ] Environment variables documented
- [ ] Submissions made before **March 31, 2026** deadline

---

## Key Talking Points for Judges

### BoMed
- **Fresh Code** — Built from scratch for PL Genesis. ~1,200 lines of TypeScript.
- **World ID native** — First healthcare permission system built on proof-of-personhood.
- **Real problem** — Healthcare agents are proliferating. Patients have no granular control.
- **Protocol Labs angle** — Proves AI-native infrastructure needs permission layers, not just storage/identity.

### Bolospot
- **Infrastructure play** — Not SaaS. A protocol. Your @handle is portable.
- **World ID integration** — Solves Sybil problem at protocol layer. Anti-spam that actually works.
- **Both sides** — Not a Calendly competitor. Agents negotiate permissions on both sides.
- **Protocol Labs angle** — Missing piece of AI infrastructure: "Who can reach me, and what can they do?"

---

## Post-Submission

After submitting on Devfolio:
1. Tweet announcement (tag @protocollabs, @worldcoin)
2. Share in PL Genesis Discord
3. Post demo video on YouTube
4. Update GitHub README with "Submitted to PL Genesis" badge
5. Prepare for judging Q&A (March 31 - April 7)

Good luck! 🚀
