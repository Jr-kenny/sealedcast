CREATE TABLE IF NOT EXISTS "sealed_wallet_links" (
  "fid" BIGINT NOT NULL,
  "slot" INTEGER NOT NULL,
  "encrypted_address" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sealed_wallet_links_pkey" PRIMARY KEY ("fid", "slot")
);

CREATE INDEX IF NOT EXISTS "sealed_wallet_links_fid_idx"
  ON "sealed_wallet_links"("fid");
