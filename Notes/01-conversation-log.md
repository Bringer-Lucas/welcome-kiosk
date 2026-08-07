# Conversation Log

Newest entries at the bottom.

---

## 2026-08-06 — Session 1: framing and research

**User's ask:** Currently on Greetly for visitor management — iPad kiosk plus a
Bluetooth thermal badge printer. Boss wants the $150/month expense cut. Make it
free or cheaper. User has a Railway account. Also: keep notes in a `Notes/`
directory, updated frequently.

**What I did:**

- Confirmed the project directory was empty — clean slate, nothing to integrate
  with.
- Researched current SaaS visitor-management pricing.
- Researched what printer Greetly actually supports, to find out how locked-in
  the hardware is.
- Researched the iOS Safari / Web Bluetooth constraint and the escape routes.
- Wrote up the brief, findings, options, and open questions.

**Key finding — the hardware is not a trap.**

Greetly only supports the **Brother QL-820NWB / QL-820NWBc**. That printer has
Ethernet, Wi-Fi, USB *and* Bluetooth. It's Bluetooth today only because that's
how Greetly's iPad app drives it. Put it on the network and any machine can
print to it. This is what makes a cheap replacement viable.

**Key constraint — iOS Safari has no Web Bluetooth.**

So a browser kiosk on the iPad can never talk to the printer directly. Badge
printing has to be triggered server-side, with a small print agent on the office
LAN doing the actual printing. This is the one piece of the design that isn't
obvious, and it's the piece most DIY attempts get wrong.

**Costs found:**

- Vizito ~€29.95/mo, SwipedOn ~$52.50/mo, Vizitor has a permanent free tier
- Railway realistically $5–15/mo for a workload this small
- All notification channels except SMS are free

**Recommendation given:** Option B — self-host on Railway with a local print
agent, ~$5–15/mo, saving roughly $1,620–1,740/year. Designed so it can be moved
to a Raspberry Pi for a true $0/mo later. Option A (switch to Vizito) offered as
a same-week stopgap if the boss wants the saving banked before code exists.

**Ended by asking 4 questions** — printer connectivity, whether an always-on
office machine exists, notification channel, and which Greetly features are
actually used. See [04-open-questions.md](04-open-questions.md).

**Status:** blocked on those answers before starting the build.

---

## 2026-08-06 — Session 2: answers, and the directory requirement

**User answered all four questions:**

| Question | Answer | Consequence |
|---|---|---|
| Printer connectivity | **Bluetooth only** | Must move it to USB (preferred), Ethernet, or Wi-Fi |
| Always-on machine | **Yes, a Windows PC** | Print agent host, $0 hardware. Also makes USB the obvious choice. |
| Notifications | **Teams + Email** | Confirms they're on M365 — which unlocked the directory solution below |
| Features needed | **Photo on badge, check-out/evacuation list** | Lean scope. No NDA, no pre-registration, no multi-site. |

**User then added a requirement mid-session:** visitors need to *select the
employee they're visiting* from a list showing photos and names, and the app
emails that employee.

**This turned out to be the easiest requirement of the lot,** because they're on
M365. We pull the directory from **Microsoft Entra ID via the Graph API** —
names, emails, job titles, profile photos — synced nightly. No CSV to maintain,
no directory rot as people join and leave.

**Design decisions made this session:**

- **USB, not Wi-Fi, for the printer.** Thermal printers fall off Wi-Fi and
  nobody notices until a visitor is standing at the desk. USB to the reception
  PC needs no network config at all.
- **PDFKit, not headless Chrome, for badge rendering.** HTML/CSS badge layouts
  would be nicer to iterate on, but Puppeteer roughly triples container memory
  and would push Railway off its cheapest tier. A badge is a photo and three
  lines of text — not worth $10/mo.
- **Email goes through Power Automate, not Graph `Mail.Send`.** Application-level
  `Mail.Send` lets an app send mail as *anyone* in the tenant unless carefully
  scoped. We don't need that power, and asking IT for it would rightly get
  pushback. One Power Automate flow does both the Teams DM and the email with
  zero mail permissions.
- **The evacuation list must live on Railway, not the office PC.** In a real
  evacuation the building's power and network are down and people are outside
  with phones. This is now the strongest argument against the $0/mo Raspberry
  Pi option — worth saying out loud to the boss, because "why not just make it
  fully free" is a reasonable question with a good answer.

**New open questions raised:** Entra app registration approval from IT, who owns
the Power Automate flow (recommend a service account, not a person), and visitor
photo retention policy. See [04-open-questions.md](04-open-questions.md).

**Architecture written up:** [05-architecture.md](05-architecture.md)

**Status:** design settled. Two IT dependencies (Entra app registration, Power
Automate flow owner) can be started in parallel with the build — neither blocks
writing code, since both can be stubbed.

---

## 2026-08-06 — Session 3: stopped before the build

User called it here for the day. **No code has been written yet.** The `Notes/`
directory is the entire artifact so far.

Proposed build order, agreed but not started:

1. Postgres schema + Railway project setup
2. Kiosk check-in flow (name, company, host picker, camera photo)
3. Badge PDF rendering (PDFKit, 62 × 100 mm for DK-1202)
4. Print agent for the reception Windows PC
5. Check-out + evacuation list
6. Graph directory sync and Power Automate wiring (stubbed until IT delivers)

Graph and Power Automate get stubbed from the start so the build never waits on
IT approvals.

**Next session starts at step 1.**

---

## 2026-08-07 — Session 4: step 1 done (schema + project skeleton)

**Step 1 of the build order is complete.** First code in the repo.

**What exists now:**

| Path | What it is |
|---|---|
| `db/migrations/001_init.sql` | `employees`, `visits`, `print_jobs` + indexes |
| `db/migrate.mjs` | Migration runner, one transaction per file |
| `lib/db.ts` | Postgres pool + `query()` helper |
| `app/api/health/route.ts` | Healthcheck — also pings Postgres |
| `railway.json` | Build/start config, migrates on deploy |
| `.env.example` | Every variable, including the stubbed ones |

**Verified, not assumed.** `npm run build` passes. The migration was run against
a real Postgres engine (PGlite, in a scratch directory — not added to the
project) and the app's actual queries exercised against it: check-in insert, the
print-job claim with `FOR UPDATE SKIP LOCKED`, the evacuation roll-call query,
and both referential-integrity rules below.

**Decisions made this session:**

- **Next 16, not 15.** Started on 15 and `npm audit` flagged 3 high-severity
  advisories in transitive deps (postcss, sharp). Nothing to preserve on a
  greenfield repo, so bumped. Clean audit now.
- **Deleting an employee must not delete their visit history.**
  `visits.host_employee_id` is `ON DELETE SET NULL`. The visitor log is an audit
  trail and has to outlive the directory sync dropping someone who left.
- **Deleting a visit *does* delete its print jobs** (`ON DELETE CASCADE`) —
  a badge for a purged visit is meaningless.
- **Partial indexes** for the three hot paths: on-site visitors
  (`WHERE checked_out_at IS NULL`), pending print jobs, and the photo-purge
  sweep. These are the only queries that run often.
- **The pool is created lazily.** Building at module load broke `next build` on
  a machine with no `DATABASE_URL`. A missing database should fail a request,
  not a deploy.
- **Plain SQL migrations, no ORM.** Three tables don't justify one.

**Blocked — needs the user, not code:**

The Railway CLI is installed (v4.36.0) but **the session has expired** —
`railway whoami` returns Unauthorized. Creating the Railway project also spends
money, so it's the user's call, not something to do unattended. Commands are in
the README resume block.

**Status:** step 1 done bar the Railway project itself. Next is step 2, the
kiosk check-in flow.

---

## 2026-08-07 — Session 4 continued: step 2, the kiosk check-in flow

**The check-in flow works end to end.** A visitor can enter their details, pick
their host from a photo directory, have their picture taken, and be checked in —
with a print job queued and the host notified.

**What exists now:**

| Path | What it is |
|---|---|
| `app/kiosk/` | The whole check-in flow: details → host picker → photo → done |
| `app/api/visits/route.ts` | Creates the visit, queues the badge, notifies the host |
| `app/api/photos/[id]/route.ts` | Serves stored photos |
| `lib/photos.ts` | Photo decode + validation |
| `lib/avatar.ts` | Initials-avatar fallback |
| `lib/notify.ts` | Power Automate call — **stubbed**, logs instead |
| `lib/employees.ts` | Directory queries |
| `db/seed.mjs` | 12 fake employees so the picker works before Graph exists |

**Repo:** now on GitHub at
[Bringer-Lucas/welcome-kiosk](https://github.com/Bringer-Lucas/welcome-kiosk).

**Decisions made this session:**

- **Photos live in Postgres as `bytea`.** Railway's container filesystem is
  ephemeral — a redeploy would wipe every visitor photo. Object storage (S3/R2)
  would also work but means a third service and a third bill, for what at a few
  check-ins a day and 90-day retention is well under a gigabyte. Revisit only if
  the database gets uncomfortably large.
  *This changed the schema: `photo_url` columns became `photo_id` FKs to a new
  `photos` table. 001 was edited rather than adding a 002, since it hadn't run
  anywhere yet.*
- **The badge PDF is no longer a stored URL.** `print_jobs.pdf_url` is gone; the
  PDF gets rendered on demand when the agent claims the job (step 3). One less
  thing to keep in sync.
- **The kiosk renders per request**, not with ISR. Loaded a handful of times a
  day, so caching buys nothing and costs a class of staleness bugs.
- **A missing or broken photo never blocks check-in.** Camera denied, no HTTPS,
  corrupt capture — the visitor still gets checked in and the badge just prints
  without a photo. A visitor standing at the desk is not the moment to be strict.
- **Idle timeout on the kiosk.** 90 seconds of inactivity resets the flow, so an
  abandoned check-in doesn't leave a stranger's half-typed name on a lobby
  screen. The done screen clears after 12.
- **The camera preview is mirrored, the captured photo is not.** People lean the
  wrong way against an unmirrored preview; the badge should show them the way
  everyone else sees them.

**Bug found and fixed during testing — worth recording.**

The first pass accepted `data:image/jpeg;base64,!!!not-base64!!!` and stored the
result as a JPEG. Node's base64 decoder *silently drops* characters it doesn't
recognise, so garbage decodes to plausible-looking bytes rather than failing.
That junk would have reached the badge renderer in step 3 and failed the print
at the front desk, which is the worst possible place to discover it.

Now the payload charset is pinned and the decoded bytes are checked against the
real file signature (JPEG/PNG/WebP magic numbers), so the declared type has to
match the actual content. This also means an SVG can't be smuggled in as an
image — SVG can carry script, and these files get served back to a browser.

**Verification — actually run, not assumed.**

Local Postgres wasn't available (no Docker, no `psql`), so the first attempt
used PGlite over its socket server. That turned out to accept **only one
connection at a time**, which produced confusing `ECONNRESET` failures that
looked like application bugs but weren't. Replaced it with a real embedded
Postgres on port 55432. Worth knowing if these tests get picked up again — and
a reminder that a fake datastore can invent failures as easily as it can hide
them.

Against real Postgres, **28 checks pass**: the happy path, photo byte-for-byte
round-trip, all four malformed-photo cases, six validation rejections, no orphan
rows left by rejected check-ins, and a deactivated employee correctly refused.

**Still stubbed, by design:** host notifications log instead of calling Power
Automate, and the directory is seed data rather than Graph. Both light up by
setting one environment variable each when IT delivers.

**Not built yet:** check-out, the evacuation list, the admin visitor log, and
badge printing. The kiosk queues print jobs that nothing consumes yet.

**Status:** step 2 done. Next is step 3, badge PDF rendering.

---
