-- Initial schema. See Notes/05-architecture.md#data-model-first-pass.

-- Image blobs: visitor check-in photos and cached Entra profile photos.
--
-- These live in Postgres rather than on disk because Railway's container
-- filesystem is ephemeral — a redeploy would wipe every photo. Object storage
-- would work too but means a third service and a third bill for what is, at a
-- few check-ins a day and 90-day retention, well under a gigabyte.
CREATE TABLE photos (
  id          BIGSERIAL PRIMARY KEY,
  kind        TEXT        NOT NULL CHECK (kind IN ('visitor', 'employee')),
  mime        TEXT        NOT NULL,
  bytes       BYTEA       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employees, synced nightly from Microsoft Entra ID via the Graph API.
-- The sync is the only writer; nothing here is authored in our UI.
CREATE TABLE employees (
  id          BIGSERIAL PRIMARY KEY,
  entra_id    TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  job_title   TEXT,
  department  TEXT,
  -- Many employees have no Graph photo set, so this stays NULL and the kiosk
  -- falls back to a generated initials avatar.
  photo_id    BIGINT      REFERENCES photos (id) ON DELETE SET NULL,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The kiosk host picker lists active employees by name.
CREATE INDEX employees_active_name_idx ON employees (name) WHERE active;

CREATE TABLE visits (
  id                BIGSERIAL PRIMARY KEY,
  visitor_name      TEXT        NOT NULL,
  visitor_company   TEXT,
  -- Keep the visit even if the employee later leaves and is purged from the
  -- directory: the visitor log is an audit trail.
  host_employee_id  BIGINT      REFERENCES employees (id) ON DELETE SET NULL,
  -- Cleared by the retention sweep before the photo row itself is deleted.
  photo_id          BIGINT      REFERENCES photos (id) ON DELETE SET NULL,
  checked_in_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_out_at    TIMESTAMPTZ,
  badge_printed_at  TIMESTAMPTZ,
  notified_at       TIMESTAMPTZ
);

-- Drives /admin/evacuation and the check-out list: who is on site right now.
CREATE INDEX visits_on_site_idx ON visits (checked_in_at DESC)
  WHERE checked_out_at IS NULL;

CREATE INDEX visits_host_idx ON visits (host_employee_id);

-- Photo purge sweep (PHOTO_RETENTION_DAYS) scans by check-in date.
CREATE INDEX visits_photo_purge_idx ON visits (checked_in_at)
  WHERE photo_id IS NOT NULL;

CREATE TABLE print_jobs (
  id          BIGSERIAL PRIMARY KEY,
  visit_id    BIGINT      NOT NULL REFERENCES visits (id) ON DELETE CASCADE,
  status      TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'claimed', 'done', 'failed')),
  claimed_at  TIMESTAMPTZ,
  attempts    INTEGER     NOT NULL DEFAULT 0,
  last_error  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The print agent long-polls for the oldest pending job.
CREATE INDEX print_jobs_pending_idx ON print_jobs (created_at)
  WHERE status = 'pending';
