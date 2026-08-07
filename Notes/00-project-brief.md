# Project Brief

## The ask

Boss wants to cut the **$150.00/month Greetly** visitor management expense.
Goal: make it free, or as close to free as is sensible.

## Current setup (as described)

- **Greetly** cloud visitor management
- Running on an **iPad** at reception, presumably in Guided Access / kiosk mode
- **Bluetooth-connected thermal badge printer** — near-certainly a
  Brother QL-820NWB (Greetly only supports QL-820NWB / QL-820NWBc with
  DK-1202 label rolls in the US)

## Assets we already have

- A **Railway** account (PaaS — can host app + Postgres)
- The iPad (reusable, whatever we build)
- The Brother printer (reusable, whatever we build)
- Label stock (DK-1202 rolls — reusable)

So the *hardware* is already paid for. This is purely a software subscription
problem.

## Requirements to preserve

These are assumed from a standard Greetly deployment. **Not yet confirmed with
the user** — see [04-open-questions.md](04-open-questions.md).

- [ ] Visitor self-check-in on the iPad
- [ ] Badge prints automatically on check-in (name, company, host, date, photo?)
- [ ] Host gets notified when their visitor arrives
- [ ] Visitor log / audit trail (who was in the building, when)
- [ ] Check-out flow
- [ ] Possibly: NDA / safety agreement signing
- [ ] Possibly: visitor photo capture
- [ ] Possibly: pre-registration / invites

## Non-negotiables

- Must not require the receptionist to babysit the print dialog. Badge printing
  has to be **fully automatic** on check-in.
- Must survive an iPad reboot and a printer power cycle without a technician.
- Should not create a new single point of failure with no owner.
