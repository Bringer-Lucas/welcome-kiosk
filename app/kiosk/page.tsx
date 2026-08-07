import { listActiveEmployees } from "@/lib/employees";
import KioskFlow from "./KioskFlow";

// Rendered per request rather than cached: the kiosk is loaded a handful of
// times a day, the directory query is trivial, and this way a new joiner shows
// up as soon as the sync lands instead of whenever a cache decides to expire.
export const dynamic = "force-dynamic";

export default async function KioskPage() {
  const employees = await listActiveEmployees();
  return <KioskFlow employees={employees} />;
}
