CREATE TABLE IF NOT EXISTS "sealed_discord_links" (
  "fid" BIGINT NOT NULL,
  "discord_user_id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "global_name" TEXT,
  "avatar" TEXT,
  "encrypted_access_token" TEXT NOT NULL,
  "encrypted_refresh_token" TEXT NOT NULL,
  "token_expires_at" TIMESTAMPTZ(6) NOT NULL,
  "scope" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sealed_discord_links_pkey" PRIMARY KEY ("fid")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sealed_discord_links_discord_user_id_key"
  ON "sealed_discord_links"("discord_user_id");

CREATE TABLE IF NOT EXISTS "sealed_oauth_states" (
  "state_hash" TEXT NOT NULL,
  "fid" BIGINT NOT NULL,
  "reader" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sealed_oauth_states_pkey" PRIMARY KEY ("state_hash")
);

CREATE INDEX IF NOT EXISTS "sealed_oauth_states_expires_at_idx"
  ON "sealed_oauth_states"("expires_at");
