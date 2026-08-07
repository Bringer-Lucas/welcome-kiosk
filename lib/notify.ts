// Host notification: one Power Automate flow that posts a Teams DM and sends an
// email. See Notes/05-architecture.md#notifications--power-automate for why
// this doesn't go through Graph Mail.Send.
//
// STUB until IT provides the flow (open question 7). With no webhook URL set,
// this logs what it would have sent and reports success, so the check-in flow
// can be built and demoed end to end without waiting on anyone.

export type HostNotification = {
  hostName: string;
  hostEmail: string;
  visitorName: string;
  visitorCompany: string | null;
  checkedInAt: Date;
};

export async function notifyHost(n: HostNotification): Promise<boolean> {
  const url = process.env.POWER_AUTOMATE_WEBHOOK_URL;

  const payload = {
    hostName: n.hostName,
    hostEmail: n.hostEmail,
    visitorName: n.visitorName,
    visitorCompany: n.visitorCompany ?? "",
    checkedInAt: n.checkedInAt.toISOString(),
    message: `${n.visitorName}${n.visitorCompany ? ` from ${n.visitorCompany}` : ""} has arrived at reception.`,
  };

  if (!url) {
    console.info("[notify:stub] would notify host —", JSON.stringify(payload));
    return true;
  }

  try {
    // A slow flow must not hold up the kiosk; the visitor is standing there.
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error(`[notify] Power Automate returned ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[notify] Power Automate call failed", err);
    return false;
  }
}
