import { NextResponse } from "next/server";
import { getPhoto } from "@/lib/photos";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const photoId = Number(id);
  if (!Number.isInteger(photoId) || photoId <= 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const photo = await getPhoto(photoId);
  if (!photo) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(photo.bytes), {
    headers: {
      "content-type": photo.mime,
      "content-length": String(photo.bytes.length),
      // Photo rows are immutable once written, so the kiosk can cache employee
      // avatars hard instead of refetching the whole grid on every check-in.
      // Private: these are people's faces, not for a shared proxy.
      "cache-control": "private, max-age=86400, immutable",
    },
  });
}
