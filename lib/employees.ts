import { query } from "@/lib/db";

export type Employee = {
  id: number;
  name: string;
  email: string;
  jobTitle: string | null;
  department: string | null;
  photoId: number | null;
};

type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  job_title: string | null;
  department: string | null;
  photo_id: string | null;
};

/** Active employees for the kiosk host picker, alphabetical. */
export async function listActiveEmployees(): Promise<Employee[]> {
  const rows = await query<EmployeeRow>(
    `SELECT id, name, email, job_title, department, photo_id
       FROM employees
      WHERE active
      ORDER BY name`,
  );

  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    email: r.email,
    jobTitle: r.job_title,
    department: r.department,
    photoId: r.photo_id === null ? null : Number(r.photo_id),
  }));
}

export async function getEmployee(id: number): Promise<Employee | null> {
  const rows = await query<EmployeeRow>(
    `SELECT id, name, email, job_title, department, photo_id
       FROM employees WHERE id = $1 AND active`,
    [id],
  );

  const r = rows[0];
  if (!r) return null;

  return {
    id: Number(r.id),
    name: r.name,
    email: r.email,
    jobTitle: r.job_title,
    department: r.department,
    photoId: r.photo_id === null ? null : Number(r.photo_id),
  };
}
