ALTER TABLE "sealed_gas_sponsorships"
  DROP CONSTRAINT IF EXISTS "sealed_gas_sponsorships_pkey";

ALTER TABLE "sealed_gas_sponsorships"
  ADD CONSTRAINT "sealed_gas_sponsorships_pkey" PRIMARY KEY ("fid", "reader");

CREATE INDEX IF NOT EXISTS "sealed_gas_sponsorships_fid_idx"
  ON "sealed_gas_sponsorships"("fid");
