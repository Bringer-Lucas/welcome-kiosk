// Fake directory data so the kiosk host picker has something to show before
// the Microsoft Graph sync exists (blocked on IT — open question 6).
//
//   npm run seed
//
// Safe to re-run: employees are upserted on entra_id. Refuses to run against a
// database that already holds real synced employees.

import pg from "pg";

const PEOPLE = [
  ["Dana Reyes", "dana.reyes@example.com", "Operations Lead", "Operations"],
  ["Marcus Whitfield", "marcus.whitfield@example.com", "Account Director", "Sales"],
  ["Priya Raman", "priya.raman@example.com", "Senior Engineer", "Engineering"],
  ["Tomás Oliveira", "tomas.oliveira@example.com", "Facilities Manager", "Operations"],
  ["Aisha Bello", "aisha.bello@example.com", "People Partner", "People"],
  ["Jonah Klein", "jonah.klein@example.com", "Controller", "Finance"],
  ["Wei Chen", "wei.chen@example.com", "Product Manager", "Product"],
  ["Rosa Delgado", "rosa.delgado@example.com", "Office Coordinator", "Operations"],
  ["Samuel Adeyemi", "samuel.adeyemi@example.com", "Security Lead", "Operations"],
  ["Hannah Lindqvist", "hannah.lindqvist@example.com", "Legal Counsel", "Legal"],
  ["Diego Marchetti", "diego.marchetti@example.com", "Solutions Architect", "Engineering"],
  ["Yuki Tanaka", "yuki.tanaka@example.com", "Designer", "Product"],
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. See .env.example.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
});

await client.connect();

try {
  // Seed identities are prefixed `seed-`; real Graph ones are GUIDs. If any row
  // isn't ours, a real sync has run and this is not a database to seed.
  const { rows: foreign } = await client.query(
    `SELECT count(*)::int AS n FROM employees WHERE entra_id NOT LIKE 'seed-%'`,
  );
  if (foreign[0].n > 0) {
    console.error(
      `Refusing to seed: ${foreign[0].n} employee(s) came from a real directory sync.`,
    );
    process.exit(1);
  }

  for (const [name, email, jobTitle, department] of PEOPLE) {
    await client.query(
      `INSERT INTO employees (entra_id, name, email, job_title, department)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (entra_id) DO UPDATE
         SET name = EXCLUDED.name,
             email = EXCLUDED.email,
             job_title = EXCLUDED.job_title,
             department = EXCLUDED.department,
             active = TRUE,
             synced_at = NOW()`,
      [`seed-${email}`, name, email, jobTitle, department],
    );
  }

  console.log(`Seeded ${PEOPLE.length} employees.`);
} finally {
  await client.end();
}
