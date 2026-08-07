# Open Questions

Decisions needed before building. Marked ✅ once answered.

---

## Answered — 2026-08-06

### 1. Printer model and connectivity ✅

**Bluetooth only.** Not currently on the office network.

Not a problem — the QL-820NWB has USB, Ethernet and Wi-Fi as well. See
[05-architecture.md](05-architecture.md#printer-connection) for the three ways
to reconnect it, in order of preference. Shortest path is a **USB cable to the
reception PC**, which needs no network configuration at all.

### 2. Always-on machine near reception ✅

**Yes — a Windows PC.** Print agent runs there as a Windows service.
**Hardware cost: $0.**

This also makes USB the obvious printer connection, assuming the PC is within
cable reach of the printer.

### 3. Host notification channel ✅

**Microsoft Teams + Email.**

Teams implies the company is on Microsoft 365, which is a big deal — it gives us
the employee directory for free. See below.

### 4. Load-bearing features ✅

**In scope:**
- Visitor photo on badge
- Check-out + evacuation list

**Out of scope** (confirmed not needed): NDA signing, pre-registration/invites,
multi-site, watchlist screening.

This is a notably lean scope. Good — it keeps the build to days, not weeks.

### 5. Employee directory ✅ *(raised by user mid-session)*

Visitors must be able to **select the employee they're visiting** from a list
with **photos and names**, and the app emails that employee.

Since the company is on M365, we pull this from **Microsoft Entra ID via the
Microsoft Graph API** — names, emails, job titles, and profile photos, synced
nightly. No manual directory maintenance, no CSV to keep current, and it stays
correct as people join and leave.

---

## New open questions — raised 2026-08-06

### 6. Will IT grant an Entra ID app registration? ⬜

We need one app registration with **`User.Read.All` (application permission)**,
which requires **admin consent** from whoever runs your M365 tenant.

This is a read-only directory permission — it cannot send mail, cannot read
mailboxes, cannot change anything. But it does read *all* users, so some IT
teams will want it scoped or will push back.

**If they say no,** fallbacks in order:
1. Scope it with an Entra **administrative unit** so the app only sees one OU
2. A Power Automate flow *pushes* the directory to us on a schedule, inverting
   who holds the permission
3. Manual CSV import through the admin UI (works, but goes stale)

### 7. Who owns the Power Automate flow? ⬜

One flow, triggered by an HTTP webhook from Railway, that posts the Teams
message **and** sends the email.

Deliberate design choice: doing both through Power Automate means we need
**zero mail-sending permissions** in Entra. The alternative — Graph
`Mail.Send` as an application — can send email as *any* user in the tenant
unless carefully scoped, and that is a much harder conversation with IT.

The flow needs an owner who won't leave the company. **Recommend a service
account or a shared/group-owned flow, not a personal account** — if it's owned
by someone personally and they depart, visitor notifications silently stop.

### 8. Visitor photo retention policy ⬜

We'll be storing photographs of visitors. Someone should decide how long we keep
them — 30 days? 90 days? — and whether there's a privacy notice on the kiosk.

I'll build in automatic purge-after-N-days with N configurable, defaulting to
**90 days**, and a short privacy line on the check-in screen. Easy to set now,
annoying to retrofit.

Worth a quick word with whoever handles HR or compliance, especially if you have
any GDPR exposure.
