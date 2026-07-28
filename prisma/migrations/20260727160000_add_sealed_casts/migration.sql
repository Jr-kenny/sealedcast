CREATE TABLE IF NOT EXISTS "sealed_casts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "contract_cast_id" BIGINT NOT NULL,
  "farcaster_hash" BYTEA,
  "creator_fid" BIGINT NOT NULL,
  "encrypted_content" JSONB NOT NULL,
  "public_hint" TEXT NOT NULL,
  "audience_policy" JSONB NOT NULL,
  CONSTRAINT "sealed_casts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "sealed_casts_contract_cast_id_key" ON "sealed_casts"("contract_cast_id");
CREATE UNIQUE INDEX IF NOT EXISTS "sealed_casts_farcaster_hash_key" ON "sealed_casts"("farcaster_hash");
CREATE INDEX IF NOT EXISTS "sealed_casts_creator_fid_idx" ON "sealed_casts"("creator_fid");
CREATE TABLE IF NOT EXISTS "sealed_gas_sponsorships" (
  "fid" BIGINT NOT NULL,
  "reader" TEXT NOT NULL,
  "tx_hash" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sealed_gas_sponsorships_pkey" PRIMARY KEY ("fid")
);
