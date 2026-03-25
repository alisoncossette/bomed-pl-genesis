# BoMed Patient Portal — World App Mini App

A World App Mini App that lets patients verify their identity with World ID, then manage healthcare permissions through Bolospot's sovereign permission layer.

## What it does

1. **Verify** — Patient opens Mini App, proves personhood with World ID (orb verification)
2. **Link** — Patient connects their Bolospot @handle (now provably human)
3. **Manage** — Patient sees incoming permission requests from their PT practice
4. **Control** — Granular scope-level consent: ✅ appointments, ✅ insurance, ❌ full records
5. **Revoke** — Instant revocation of any active grant

## Tech Stack

- **Next.js 14** — React framework (matches World's starter kit)
- **World ID SDK** — `@worldcoin/minikit-js` for Mini App integration
- **@bolospot/sdk** — TypeScript SDK for Bolospot permission API
- **Tailwind CSS 4** — Dark glassmorphism theme

## Setup

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/bomed-world.git
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

## Key Concepts

- **Permissions follow people, not software** — agents inherit owner's @handle
- **Grants are scoped** — patient can grant `appointments:read` without `insurance:read`
- **Trust graph is live** — no cached tokens, revoke = immediate
- **Relay** — agent-to-agent messaging through trust boundary

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

## Hackathon

PL_Genesis: Frontiers of Collaboration (Protocol Labs) — April 1, 2026

**Tracks:** World Build 3, Fresh Code, AI & Robotics, Infrastructure & Digital Rights
