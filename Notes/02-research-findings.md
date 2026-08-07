# Research Findings

Researched 2026-08-06.

## Printer

**Greetly only supports the Brother QL-820NWB / QL-820NWBc**, with DK-1202
labels (US) or DK-11202 (non-US). So the printer at reception is one of those
two models with very high confidence.

This matters enormously, because the QL-820NWB has:

- **Ethernet (RJ45)**
- **Wi-Fi 802.11b/g/n**
- **Bluetooth**
- **USB**
- AirPrint support

Greetly drives it over Bluetooth from the iPad because that's what *Greetly's
app* chose. The printer itself is a normal network printer. We can put it on
Ethernet or Wi-Fi and print to it from any machine on the LAN, including via
raw TCP on port 9100 or through CUPS with Brother's Linux driver.

> **Action item:** confirm the model number on the sticker, and confirm whether
> the printer is currently on the office network or Bluetooth-only.

## The hard technical constraint

**iOS Safari does not support Web Bluetooth.** Apple has never shipped it.

This means a browser-based kiosk running on the iPad *cannot* talk to a
Bluetooth printer directly. Any plan of the form "build a web app, open it in
Safari on the iPad, print over Bluetooth" is dead on arrival.

There are exactly three ways around it:

1. **Put the printer on the network and print from a server-side agent.**
   The iPad only renders the check-in UI; a small always-on machine on the
   office LAN receives badge jobs and prints them. *(Recommended.)*
2. **Build a native iOS app** using Brother's iOS Print SDK, which can use
   Bluetooth. This replicates Greetly exactly but is a much bigger lift and
   drags in Apple Developer Program ($99/yr) and app distribution.
3. **Use a printer that polls the cloud itself** — e.g. Star Micronics
   CloudPRNT, where the printer periodically POSTs to your HTTP endpoint asking
   for jobs, needing no local computer at all. Elegant, but it means buying a
   new printer and abandoning the Brother + DK-1202 label stock.

Option 1 is right for us: it reuses the printer and the labels we already own.

## SaaS alternatives — current pricing

| Product | Price | Badge printing | Notes |
|---|---|---|---|
| **Greetly** (current) | **$150/mo** | Yes | What we're replacing |
| Vizitor | **Free tier** | On paid tiers | Free plan is permanent — check-in, QR e-pass, host notifications. No credit card. |
| Vizito | ~€29.95/mo (~$33) | Yes | iPad app + back-office, pre-registration, visitor logs |
| SwipedOn Core | $630/site/yr (~$52.50/mo) | Yes | Unlimited visitors/employees, Slack + Teams notifications |
| Market range | $29–$350/mo | — | SMB plans typically $25–150/location/mo |

Even the laziest possible move — switch to Vizito — cuts the bill by about
**78%** with zero engineering.

## Railway cost estimate

- Hobby plan: **$5/mo**, which includes $5 of usage credit
- A small Next.js app + Postgres for a single-office visitor system is a
  genuinely tiny workload — a handful of check-ins a day, a few hundred rows
- Realistic all-in: **$5–15/month**

Worth noting: whatever we build is a Docker container. If we later want to drop
Railway entirely, the same image runs on a Raspberry Pi in the office for $0/mo.
We are not locking ourselves in.

## Free notification channels

- **Slack** incoming webhook — free
- **Microsoft Teams** — free via Power Automate workflow webhook (note: the old
  O365 connector webhooks are being retired, use Workflows)
- **Email** — free via the company's existing Google Workspace / M365 SMTP, or
  Resend's free tier (3,000/mo)
- **SMS** — the only one that genuinely costs money (Twilio ~$0.008/message)

## Sources

- [Greetly — Setting Up Badge Printing Over Bluetooth](https://success.greetly.com/print-badges-from-the-ipad-over-bluetooth-recommended)
- [Brother QL-820NWB product page](https://www.brother-usa.com/p/thermal-printers-labelers/QL820NWB)
- [Vizito pricing profile](https://www.softwareadvice.com/registration/vizito-profile/)
- [Visitor Management System Price: Buyer's Guide 2026](https://archieapp.co/blog/visitor-management-system-price/)
- [Vizitor — affordable visitor management](https://www.vizitorapp.com/affordable-visitor-management-system/)
- [Star CloudPRNT Protocol Guide](https://star-m.jp/products/s_print/sdk/StarCloudPRNT/manual/en/protocol-guide.html)
- [Star CloudPRNT SDK (GitHub)](https://github.com/star-micronics/cloudprnt-sdk)
