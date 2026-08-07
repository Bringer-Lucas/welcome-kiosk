import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { decodeDataUrl } from "@/lib/photos";
import { notifyHost } from "@/lib/notify";

export const dynamic = "force-dynamic";

type CheckInBody = {
  visitorName?: unknown;
  visitorCompany?: unknown;
  hostEmployeeId?: unknown;
  photoDataUrl?: unknown;
};

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  let body: CheckInBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const visitorName = cleanString(body.visitorName, 120);
  if (!visitorName) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }

  const visitorCompany = cleanString(body.visitorCompany, 120);

  const hostEmployeeId = Number(body.hostEmployeeId);
  if (!Number.isInteger(hostEmployeeId) || hostEmployeeId <= 0) {
    return NextResponse.json({ error: "Please choose who you're visiting." }, { status: 400 });
  }

  // A photo the browser couldn't produce (camera denied, unsupported) must not
  // block check-in — the badge just prints without one.
  const photo =
    typeof body.photoDataUrl === "string" ? decodeDataUrl(body.photoDataUrl) : null;

  try {
    const result = await withTransaction(async (client) => {
      const host = await client.query<{ name: string; email: string }>(
        `SELECT name, email FROM employees WHERE id = $1 AND active`,
        [hostEmployeeId],
      );
      if (host.rowCount === 0) return null;

      let photoId: number | null = null;
      if (photo) {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO photos (kind, mime, bytes) VALUES ('visitor', $1, $2) RETURNING id`,
          [photo.mime, photo.bytes],
        );
        photoId = Number(inserted.rows[0].id);
      }

      const visit = await client.query<{ id: string; checked_in_at: Date }>(
        `INSERT INTO visits (visitor_name, visitor_company, host_employee_id, photo_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, checked_in_at`,
        [visitorName, visitorCompany, hostEmployeeId, photoId],
      );
      const visitId = Number(visit.rows[0].id);

      // The print agent picks this up; the badge PDF is rendered on demand
      // when the job is claimed (build step 3).
      await client.query(`INSERT INTO print_jobs (visit_id) VALUES ($1)`, [visitId]);

      return {
        visitId,
        checkedInAt: visit.rows[0].checked_in_at,
        hostName: host.rows[0].name,
        hostEmail: host.rows[0].email,
      };
    });

    if (!result) {
      return NextResponse.json({ error: "That person is no longer listed." }, { status: 400 });
    }

    // Deliberately after the commit. The visitor is checked in and their badge
    // is queued whether or not Teams is having a bad morning.
    const notified = await notifyHost({
      hostName: result.hostName,
      hostEmail: result.hostEmail,
      visitorName,
      visitorCompany,
      checkedInAt: result.checkedInAt,
    });

    if (notified) {
      await withTransaction((c) =>
        c.query(`UPDATE visits SET notified_at = NOW() WHERE id = $1`, [result.visitId]),
      ).catch((err) => console.error("[visits] could not record notified_at", err));
    }

    return NextResponse.json({
      visitId: result.visitId,
      hostName: result.hostName,
      notified,
    });
  } catch (err) {
    console.error("[visits] check-in failed", err);
    return NextResponse.json(
      { error: "Something went wrong. Please ask at the desk." },
      { status: 500 },
    );
  }
}
