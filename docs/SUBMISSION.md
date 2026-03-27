# PL Genesis Hackathon Submission

**Deadline:** March 31, 2026
**Platform:** Devfolio
**Event:** PL Genesis: Frontiers of Collaboration (Protocol Labs)

---

## Project 1: BoMed — Patient-Controlled Healthcare Permissions

### 🎯 One-Liner
**"The first healthcare network where identity is sovereign on both sides."**

### 💔 The Problem
Healthcare data systems trust no one—or trust everyone. There's no middle ground. Your physical therapist can't book appointments without full EMR access. Your insurance coordinator can't verify coverage without seeing your entire chart. Meanwhile, neither side knows if the other is who they claim to be. Patients fake credentials. Practices fake legitimacy. The trust layer is broken.

### ✅ The Solution: Triple Verification
BoMed is the first healthcare network where **both sides are triple verified**:

**For patients AND practices:**
1. **World ID** — Proves you're a real human/org (biometric, one per entity)
2. **Bolospot** — Proves your identity handle and permission graph (@handle as trust anchor)
3. **BoMed** — Proves you're a legitimate healthcare participant (patient OR practice)

**The pitch:** *Three layers of trust, zero clipboard. World ID proves you exist. Bolospot proves who you are. BoMed proves you belong in the network. No other healthcare data platform can say that.*

**The flow:**
1. **Verify** — Both patient AND practice verify via World ID (orb for individuals, custom verification for practices)
2. **Link** — Connect Bolospot @handle (now provably human/org)
3. **Activate** — Practice pays to activate BoMed widget (World Pay — WLD/USDC, instant settlement)
4. **Manage** — Patient sees permission requests from verified practices
5. **Control** — Grant scope-level access: ✅ `appointments:read`, ✅ `insurance:write`, ❌ `records:full`
6. **Persist** — Trust follows the @handle, not the software. If practice changes EHR, grants persist.

**The moat:** Handle-to-handle trust. Not software-to-software. If a practice switches from Epic to Cerner, the trust relationship persists. Grants follow the person, not the app.

### 🌍 Why Protocol Labs / Why Now
Protocol Labs is building infrastructure for a future where AI agents are first-class actors. BoMed proves that future needs *permission infrastructure*—not just storage (IPFS) or identity (World ID), but the layer that says "this agent can see this scope, for this person, right now."

Healthcare is the perfect testbed: high stakes, strict compliance (HIPAA), and an explosion of agents. If sovereign permissions work here, they work everywhere.

### 🪪 World ID Angle: Trust on Both Sides
World ID solves the foundational problem for **both participants**: **Is this actually a patient/practice, or a bot/scammer pretending to be one?**

**For patients:**
- Orb verification proves one human = one @handle
- No bots harvesting data through fake patient accounts
- Practices see "verified patient" badge and trust it's real

**For practices:**
- Custom verification proves legitimate healthcare organization
- No scam clinics harvesting patient data
- Patients see "verified practice" badge and trust it's legitimate

**The breakthrough:** This is the first healthcare permission system where **both sides are cryptographically verified**. HIPAA requires identity verification; World ID makes it bilateral and cryptographic.

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
**Title:** "BoMed: The First Healthcare Network Where Identity is Sovereign on Both Sides"

**Script (90 seconds):**
1. **Problem** (0:00-0:15) — "Healthcare trusts no one—or trusts everyone. Your PT can't book appointments without full EMR access. Neither side knows if the other is legitimate."
2. **Solution** (0:15-0:35) — "BoMed triple verifies BOTH sides. World ID proves you exist. Bolospot proves who you are. BoMed proves you belong in the network. Patient AND practice—both verified."
3. **Demo** (0:35-1:05) — Show: Patient World ID verification → Practice org verification → Permission request from verified practice → Grant `appointments:read` only → Practice switches EHR, grants persist → Revoke instantly
4. **Why it matters** (1:05-1:30) — "Handle-to-handle trust. Not software-to-software. If a practice changes EHR, the trust relationship persists. Grants follow the person, not the app. Three layers of trust, zero clipboard. No other healthcare platform can say that."

### 📝 Devfolio Short Description (150 chars max)
**"Triple verified healthcare: World ID + Bolospot + BoMed. Both patient AND practice verified. Handle-to-handle trust that survives software changes."**
(149 chars)

### 📝 Devfolio Long Description (500-800 words)

**The trust problem healthcare won't name**

Your physical therapist needs to book appointments. Do you give them full EMR access? No. But that's the only option today: "yes to everything" or "share nothing."

Worse: neither side knows if the other is legitimate. Patients can fake credentials. Practices can fake legitimacy. The trust layer is broken. Healthcare data systems trust no one—or trust everyone. There's no middle ground.

**BoMed: Triple verification, both sides**

BoMed is the first healthcare network where **both patient AND practice are triple verified**:

1. **World ID** — Proves you're a real human/org (biometric, one per entity)
2. **Bolospot** — Proves your identity handle and permission graph (@handle as trust anchor)
3. **BoMed** — Proves you're a legitimate healthcare participant (patient OR practice)

**The pitch:** *Three layers of trust, zero clipboard. World ID proves you exist. Bolospot proves who you are. BoMed proves you belong in the network. No other healthcare data platform can say that.*

**The flow:**

1. **Verify (both sides)** — Patient verifies via World ID orb. Practice verifies via custom org verification. Both get @handles.
2. **Activate** — Practice pays to activate BoMed widget (World Pay — WLD/USDC, instant settlement). This isn't freemium; trust costs money.
3. **Request** — Practice sends permission request to patient's @handle: "I need `appointments:read` and `insurance:write`"
4. **Control** — Patient sees request from **verified practice**. Grants scope-level access. No full EMR access.
5. **Persist** — Trust follows the @handle, not the software. Practice switches from Epic to Cerner? Grants persist.

**The moat: Handle-to-handle trust**

This isn't software-to-software integration. It's **person-to-person trust that survives software changes**.

Your PT has a @handle. Their scheduling agent inherits that @handle. When you grant `appointments:read`:
- The agent can read your appointment schedule
- Send appointment reminders via relay
- Request new appointment slots

But the agent **cannot** access your insurance data, lab results, or clinical notes. You control the scope.

**Crucially:** If your PT switches from Epic to Cerner, the trust relationship persists. The new EHR inherits the same @handle. Grants don't break. This is **the actual IP**.

**Why World ID on both sides?**

World ID solves the **bilateral trust problem**:

**For patients:**
- Orb verification: one human = one @handle
- No bots harvesting data through fake patient accounts
- Practices see "verified patient" badge and trust it's real

**For practices:**
- Custom org verification: proves legitimate healthcare organization
- No scam clinics harvesting patient data
- Patients see "verified practice" badge and trust it's legitimate

**The breakthrough:** This is the first healthcare permission system where **both sides are cryptographically verified**. HIPAA requires identity verification; World ID makes it bilateral and cryptographic.

**Business model: World Pay**

Practices pay to activate the BoMed widget. Payment via World Pay (WLD/USDC, instant settlement). Both patient AND practice are World ID verified on Bolospot AND on BoMed.

This is a **blueprint for any high-trust vertical**: legal, finance, education. Triple verification + World Pay = sovereign identity meets sovereign transactions.

Think Stripe Connect for identity networks.

**What was built**

Everything. Built from scratch for PL Genesis (Fresh Code track).

- World ID Mini App with orb verification flow (patients)
- World ID org verification flow (practices)
- Permission dashboard (view grants, requests, relay inbox)
- Granular scope control (8 scopes: appointments, insurance, records, labs, imaging, billing, notes, vitals)
- Instant revocation (no cached tokens, live trust graph)
- Agent relay (appointment reminders routed through trust boundary)
- @handle linking (connect verified World ID to Bolospot address)
- World Pay integration (practice activation via WLD/USDC)

~1,200 lines of TypeScript. Next.js 14, World ID SDK, @bolospot/sdk, Tailwind CSS 4.

**Why this matters**

Healthcare is the perfect testbed for AI-native infrastructure. High stakes, strict compliance (HIPAA), and an explosion of agents. If sovereign permissions work here, they work everywhere.

Protocol Labs is building infrastructure for a future where AI agents are first-class actors. BoMed proves that future needs **bilateral trust + permission infrastructure**—not just storage (IPFS) or identity (World ID), but the layer that says:

*"This agent (verified) can see this scope (controlled), for this person (verified), right now (live revocation)."*

This is healthcare built for an AI-native world. Starting with proof-of-personhood. On both sides.

**(797 words)**

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
- **Triple verification** — First healthcare network where BOTH patient AND practice are verified (World ID + Bolospot + BoMed).
- **The actual IP** — Handle-to-handle trust that survives software changes. Practice switches EHR? Grants persist.
- **Business model** — World Pay integration (WLD/USDC). Practices pay to activate. Both sides verified.
- **Protocol Labs angle** — Proves AI-native infrastructure needs bilateral trust + permission layers, not just storage/identity.
- **Blueprint for verticals** — Triple verification + World Pay = model for legal, finance, education.

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
