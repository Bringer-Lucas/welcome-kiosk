# Architecture

Decided 2026-08-06, based on the answers in
[04-open-questions.md](04-open-questions.md).

## Shape

```
   iPad @ reception (Safari, Guided Access kiosk)
        │
        │  1. visitor types name + company
        │  2. picks their host from a photo directory
        │  3. camera captures visitor photo
        │
        ▼  POST /api/visits
  ┌─────────────────────────────────────────────┐
  │  RAILWAY                                    │
  │  Next.js (App Router) + Postgres            │
  │                                             │
  │  • /kiosk    check-in + check-out UI        │
  │  • /admin    visitor log, who's on site     │
  │  • /admin/evacuation  live roll-call list   │
  │  • nightly Entra directory sync             │
  │  • badge PDF rendering (PDFKit)             │
  │  • print job queue                          │
  └─────────────────────────────────────────────┘
        │                              ▲
        │ webhook                      │ long-poll
        ▼                              │ GET /api/print/next
  ┌──────────────────┐        ┌────────────────────────┐
  │ Power Automate   │        │ Reception Windows PC   │
  │ • Teams DM       │        │ Node print agent       │
  │ • Email          │        │ (Windows service)      │
  └──────────────────┘        └────────────────────────┘
        │                              │ USB
        ▼                              ▼
     The host                 Brother QL-820NWB
                              DK-1202 labels (62 × 100 mm)
```

## Why a print agent exists at all

iOS Safari has no Web Bluetooth and never will. A browser kiosk on the iPad
cannot drive the printer directly, and Railway is in the cloud so it cannot see
a printer on your LAN. The agent is the bridge: it lives on the office network,
reaches out to Railway (so no inbound firewall rules, no port forwarding, no
exposing the printer to the internet), and prints locally.

It's roughly 100 lines. It long-polls, downloads a PDF, prints it, acknowledges.
That's the entire job.

## Printer connection

The printer is Bluetooth-only today. Three ways to fix that, best first:

1. **USB to the reception PC** ⭐
   No network configuration whatsoever. Install the Brother driver on the PC,
   plug in the cable, done. Most reliable option and immune to Wi-Fi problems.
   Only constraint is cable length (~5 m).

2. **Ethernet**
   Plug into a wall port, printer takes DHCP, agent prints to port 9100.
   Good if the PC and printer aren't physically close. Ask for a DHCP
   reservation so the address doesn't move.

3. **Wi-Fi**
   Configure with Brother's *Printer Setting Tool* over USB from the PC — do
   **not** try to type a Wi-Fi password on the printer's little LCD. Least
   reliable of the three; thermal printers drop off Wi-Fi and nobody notices
   until a visitor is standing there.

The existing Bluetooth pairing to the iPad can simply be forgotten once we cut
over.

## Badge rendering

Server-side with **PDFKit**, at exactly 62 × 100 mm to match the DK-1202 stock
you already own.

Deliberately *not* headless Chrome. Puppeteer would let us write badge layouts
in HTML/CSS, which is nicer to iterate on, but it roughly triples container
memory and would push Railway out of its cheapest tier. Since a badge is just
a photo, three lines of text and a date, PDFKit's manual layout is a fair trade
for keeping the bill at $5.

Printing on the Windows side uses the `pdf-to-printer` npm package, which does
silent printing through the installed Brother driver — no print dialog, no
user interaction.

## Employee directory — Microsoft Graph

Nightly sync into Postgres:

```
GET /users
  ?$select=id,displayName,mail,jobTitle,department,accountEnabled
  &$filter=accountEnabled eq true
GET /users/{id}/photo/$value      → JPEG, cached
```

Auth is client-credentials against an Entra app registration with
**`User.Read.All`** application permission (needs admin consent — see
[open question 6](04-open-questions.md#6-will-it-grant-an-entra-id-app-registration)).

Practical notes:
- **Many employees won't have a profile photo set.** Need a generated
  initials-avatar fallback or the directory looks broken.
- Cache photos locally; don't hit Graph on every kiosk page load.
- Filter out shared mailboxes, rooms, and resource accounts — they'll otherwise
  show up as selectable "people".
- Add a search box. A photo grid works up to ~50 people; past that, visitors
  need to type a name.

## Notifications — Power Automate

One flow. HTTP webhook trigger, then two actions: post a Teams message to the
host, and send them an email.

Both connectors are standard and included in normal M365 licensing. The reason
we route email through Power Automate rather than Graph `Mail.Send` is that
application-level `Mail.Send` grants the ability to send mail as *anyone* in
the tenant unless tightly scoped — a permission that deserves to be refused,
and one we don't need.

## Evacuation list

`/admin/evacuation` shows everyone currently checked in — visitor name, company,
host, check-in time, photo.

**This is on Railway, not on the office PC, and that is the point.** In an
actual evacuation the building's power and network may be down. The roll-call
list has to be reachable from a phone on cellular data, standing in the parking
lot. A locally-hosted system fails exactly when you need it most.

This single requirement is the strongest argument against the
[$0/month Raspberry Pi option](03-options-and-costs.md#option-c--fully-local-0month).

## Data model (first pass)

```
employees   id, entra_id, name, email, job_title, department,
            photo_url, active, synced_at

visits      id, visitor_name, visitor_company, host_employee_id,
            photo_url, checked_in_at, checked_out_at,
            badge_printed_at, notified_at

print_jobs  id, visit_id, pdf_url, status(pending|claimed|done|failed),
            claimed_at, attempts, last_error
```

Photos auto-purge after a configurable retention window, default 90 days.

## Cost

| Line item | Cost |
|---|---|
| Railway (app + Postgres) | $5–15/mo |
| Power Automate | $0 — included in M365 |
| Microsoft Graph | $0 |
| Print agent host | $0 — existing PC |
| Printer + labels | $0 — already owned |
| **Total** | **$5–15/mo vs $150/mo** |

**Annual saving: roughly $1,620–1,740.**
