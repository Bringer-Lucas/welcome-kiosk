# Options and Costs

Baseline to beat: **$150.00/mo = $1,800/year**.

---

## Option A — Switch to a cheaper SaaS

Move to Vizito (~$33/mo) or SwipedOn (~$52.50/mo). Keep the iPad and the
Brother printer.

| | |
|---|---|
| **Monthly cost** | $0–52 |
| **One-time cost** | $0 |
| **Annual saving** | $1,176 – $1,800 |
| **Engineering effort** | None. Half a day of setup. |
| **Risk** | Very low |
| **Downside** | Still a subscription. Still someone else's roadmap and price increases. |

Vizitor's permanent free tier is worth a look, but badge printing appears to sit
on the paid tiers — needs verification before counting on it.

**This is the safe fallback and a fine interim step while we build something
better.**

---

## Option B — Self-host on Railway + local print agent ⭐ RECOMMENDED

Build it. Two pieces:

1. **The app** — Next.js + Postgres on Railway. Serves the kiosk UI the iPad
   loads in Safari, an admin/reporting UI, and the visitor database. Sends host
   notifications via Slack/Teams/email webhooks.
2. **The print agent** — a small script (~100 lines) on any always-on machine in
   the office. Long-polls the Railway app for pending badge jobs, renders the
   badge, sends it to the Brother QL-820NWB over the network. This exists purely
   because iOS Safari can't do Bluetooth.

```
  iPad (Safari, kiosk mode)
        │  check-in
        ▼
  Railway: Next.js + Postgres  ──► Slack / Teams / email to host
        ▲
        │  long-poll for badge jobs
  Print agent (office PC or Pi)
        │  TCP :9100 or CUPS
        ▼
  Brother QL-820NWB (Ethernet/Wi-Fi)
```

| | |
|---|---|
| **Monthly cost** | $5–15 (Railway) |
| **One-time cost** | $0 if an always-on office PC exists; $15–80 for a Raspberry Pi if not |
| **Annual saving** | **~$1,620–1,740** |
| **Engineering effort** | ~1–2 days to build, plus your testing |
| **Risk** | Medium — we own it now. Mitigated by keeping it boring and documented. |

**Why this one:** it reuses hardware and label stock we already paid for,
eliminates the subscription almost entirely, and the app is just a Docker
container — so Option C stays available forever as an escape hatch.

---

## Option C — Fully local, $0/month

Same application, but running on a Raspberry Pi in the office instead of
Railway. No cloud, no subscription, no print agent needed (the Pi *is* the
print host).

| | |
|---|---|
| **Monthly cost** | **$0** |
| **One-time cost** | ~$60–100 (Pi 5 + case + SD card + PSU) |
| **Annual saving** | **$1,800** |
| **Engineering effort** | Same build as B, simpler deployment |
| **Risk** | Higher — no remote access when it breaks, backups are on you, and it dies with the office internet/power |

Genuinely free, and tempting. The reason I don't lead with it: when the Pi's SD
card corrupts on a Tuesday morning, nobody can check in and nobody can fix it
remotely. Railway's $5–15/mo buys managed Postgres, backups, and the ability to
fix things from a laptop anywhere.

**A good hybrid:** build for Railway, and keep a documented "run it on the Pi"
path for if the boss ever wants the last $15 too.

---

## Option D — Microsoft 365 / Google Workspace native

If the company has M365 Business, a Power Apps kiosk + SharePoint list +
Power Automate notification flow is $0 extra on existing licenses.

| | |
|---|---|
| **Monthly cost** | $0 (on existing licenses) |
| **Engineering effort** | Moderate, but low-code |
| **Downside** | Power Apps in kiosk mode on iPad is clunky, and badge printing *still* needs the local print agent from Option B — so you take the hard part anyway and get a worse UI for it. |

Mentioned for completeness. Only compelling if IT policy demands everything stay
inside the Microsoft tenant.

---

## Recommendation

**Option B**, built so it can fall back to **Option C**.

If the boss wants the saving banked *this month* before any code is written,
do **Option A** as a stopgap — switching to Vizito today captures ~78% of the
savings immediately and takes the schedule pressure off the build.
