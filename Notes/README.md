# Notes — Visitor Management Cost Reduction

Running notes for replacing **Greetly** ($150/mo) with a free or much cheaper
visitor check-in system.

## Status

| | |
|---|---|
| **Started** | 2026-08-06 |
| **Current spend** | $150.00 / month (Greetly) |
| **Target** | $0–15 / month |
| **Phase** | **Building** — steps 1–2 of 6 done (2026-08-07) |
| **Repo** | [Bringer-Lucas/welcome-kiosk](https://github.com/Bringer-Lucas/welcome-kiosk) |
| **Chosen path** | Self-host on Railway + print agent on the reception PC |
| **Projected saving** | ~$1,620–1,740 / year |

## Build progress

1. ✅ **Postgres schema + project skeleton** — done 2026-08-07
2. ✅ **Kiosk check-in flow** (name, company, host picker, camera photo) — done 2026-08-07
3. ⬜ Badge PDF rendering (PDFKit, 62 × 100 mm for DK-1202) ← **next**
4. ⬜ Print agent for the reception Windows PC
5. ⬜ Check-out + evacuation list
6. ⬜ Graph directory sync + Power Automate wiring (stubbed until IT delivers)

## Run it locally

```
npm install
npm run migrate     # needs DATABASE_URL
npm run seed        # 12 fake employees, so the host picker isn't empty
npm run dev         # kiosk at /kiosk
```

The camera needs HTTPS or `localhost` — over plain `http://` to an IP address,
iOS Safari won't expose it and the kiosk will offer to continue without a photo.

## ⚠ Railway is deployed but not working

The build fails and **we never found out why** — three fixes were made by
inference, none confirmed against a real error log. Details in
[01-conversation-log.md](01-conversation-log.md).

**Do this before changing any more code:** get the build log. Dashboard →
welcome-kiosk → the app service → Deployments → the red one → **Build Logs**.

The domain is fine — `bringer-welcome.up.railway.app` resolves with valid TLS.
The 404 is Railway's edge router saying nothing is deployed behind it, not a
problem with our app or the domain. Don't re-debug that part.

To let Claude read the logs directly, create an **account-level** API token
(avatar → Account Settings → Tokens — *not* service variables, which are a
different thing) and save it to `.railway-token` in the repo root. Already
gitignored and verified.

## ▶ Resume here

Two independent threads. **Step 3 does not depend on Railway** — if the deploy
is still stuck, build the badge renderer anyway.

Prompt to paste when resuming:

> Read the `Notes/` directory to pick up where we left off. Steps 1 and 2 are
> done — schema, project skeleton and the kiosk check-in flow all work locally
> and are pushed to GitHub. Two things to pick up:
>
> 1. The Railway build is failing and we never confirmed why. I'll get you the
>    build log — work from the actual error, not from guesses. Don't stack more
>    speculative fixes on the unconfirmed ones already pushed.
> 2. Start step 3 of the build order: badge PDF rendering with PDFKit at
>    62 × 100 mm for the DK-1202 labels, rendered from a real visit record.
>
> Keep the Microsoft Graph directory sync and the Power Automate notification
> webhook stubbed so nothing blocks on IT. Keep updating `Notes/` as we go.

### Also outstanding

- **Production has no employees.** The schema deploys itself, but `npm run seed`
  has only ever run locally, so the host picker will be empty until it's run
  against the Railway database. Real data comes from the Graph sync in step 6.
- **The camera can only be tested on the deployed HTTPS URL**, on the real iPad.
  iOS Safari won't expose `getUserMedia` otherwise. This is the main reason the
  deploy matters now rather than later.
- Check whether IT has moved on the two blockers below — neither stops step 3.

## Files

| File | What's in it |
|---|---|
| [00-project-brief.md](00-project-brief.md) | The problem, constraints, current setup, requirements |
| [01-conversation-log.md](01-conversation-log.md) | Chronological log of every working session |
| [02-research-findings.md](02-research-findings.md) | SaaS pricing, printer facts, technical constraints, sources |
| [03-options-and-costs.md](03-options-and-costs.md) | The four options with real cost math |
| [04-open-questions.md](04-open-questions.md) | Decisions — answered and still outstanding |
| [05-architecture.md](05-architecture.md) | The design we're building |

## Confirmed setup

- Printer: Brother QL-820NWB, **Bluetooth-only today** → moving to USB
- Print host: **existing always-on Windows PC** at reception ($0 hardware)
- Notifications: **Microsoft Teams + email**, via one Power Automate flow
- Directory: **Microsoft Entra ID / Graph API** — employee names, emails, photos
- In scope: visitor photo on badge, check-out, evacuation roll-call
- Out of scope: NDA signing, pre-registration, multi-site, watchlist

## Blocked on IT (can run in parallel with the build)

1. Entra ID app registration with `User.Read.All` — needs admin consent
2. A Power Automate flow owner — **must be a service account, not a person**

## The one thing that drives the whole design

The badge printer is almost certainly a **Brother QL-820NWB**. It has
**Ethernet and Wi-Fi**, not just Bluetooth — Greetly just happens to drive it
over Bluetooth from the iPad. That means we are *not* locked into Bluetooth,
which is the constraint that would otherwise kill every browser-based option
(iOS Safari does not support Web Bluetooth).

See [02-research-findings.md](02-research-findings.md#printer) for detail.
