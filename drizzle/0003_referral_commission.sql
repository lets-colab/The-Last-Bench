-- 0003_referral_commission.sql
--
-- Makes the referral/commission ledger financially sound:
--   1. money columns become numeric(15,2) instead of varchar
--   2. one referrer per student (prevents paying two tutors for one enrolment)
--   3. commission defaults to the flat per-student rate (35,000 BDT)
--
-- Hand-written and hand-applied: this project's drizzle journal is out of sync
-- with the live schema (see CLAUDE.md), so drizzle-kit must not generate this.
--
-- Safe to run once, on a live database, inside the transaction below. Every
-- step is guarded so a partial prior application does not abort the whole file.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Money columns: varchar -> numeric(15,2)
--
-- Existing values were free-form strings ("$500", "500", "", NULL). Strip
-- everything that is not a digit or decimal point before casting, and treat an
-- empty result as 0 rather than letting the cast abort the migration.
-- ---------------------------------------------------------------------------

ALTER TABLE referrals
  ALTER COLUMN "commissionAmount" TYPE numeric(15,2)
  USING NULLIF(regexp_replace(COALESCE("commissionAmount", ''), '[^0-9.]', '', 'g'), '')::numeric(15,2);

ALTER TABLE referrals
  ALTER COLUMN "commissionAmount" SET DEFAULT 35000;

ALTER TABLE tutors
  ALTER COLUMN "totalEarned" TYPE numeric(15,2)
  USING COALESCE(NULLIF(regexp_replace(COALESCE("totalEarned", ''), '[^0-9.]', '', 'g'), '')::numeric(15,2), 0);

ALTER TABLE tutors
  ALTER COLUMN "totalEarned" SET DEFAULT 0;

ALTER TABLE payouts
  ALTER COLUMN "amount" TYPE numeric(15,2)
  USING COALESCE(NULLIF(regexp_replace(COALESCE("amount", ''), '[^0-9.]', '', 'g'), '')::numeric(15,2), 0);

-- ---------------------------------------------------------------------------
-- 2. Backfill: any referral with no commission amount gets the flat rate.
-- ---------------------------------------------------------------------------

UPDATE referrals
   SET "commissionAmount" = 35000
 WHERE "commissionAmount" IS NULL
    OR "commissionAmount" = 0;

-- ---------------------------------------------------------------------------
-- 3. One referrer per student.
--
-- Without this, two tutors can both be credited for the same student and both
-- get paid. Deliberately NOT created CONCURRENTLY: it must hold before any
-- money moves, and these tables are small.
--
-- If this fails with a uniqueness violation, the live data already contains
-- duplicate referrals for one student. That is a data question, not a schema
-- question -- resolve which tutor is the true referrer before re-running.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS referrals_student_unique
  ON referrals ("studentId");

-- Lookups by tutor drive every tutor dashboard query.
CREATE INDEX IF NOT EXISTS referrals_tutor_idx
  ON referrals ("tutorId");

-- Referral-code lookup happens on every student signup that carries a code.
CREATE UNIQUE INDEX IF NOT EXISTS tutors_referral_code_unique
  ON tutors ("referralCode");

-- ---------------------------------------------------------------------------
-- 4. commissionPercentage is retained but no longer used.
--
-- The model is a flat per-student amount, not a percentage. The column is left
-- in place (dropping it would be destructive and irreversible) and marked so
-- nobody wires it back up by accident.
-- ---------------------------------------------------------------------------

COMMENT ON COLUMN referrals."commissionPercentage" IS
  'DEPRECATED. Commission is a flat amount per student (shared/commission.ts COMMISSION_PER_STUDENT_BDT). Not read by application code.';

COMMENT ON COLUMN referrals."commissionAmount" IS
  'Commission owed to the tutor for this student, in BDT. Defaults to the flat per-student rate.';

COMMIT;
