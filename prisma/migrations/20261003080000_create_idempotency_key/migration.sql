-- Required before deploying the durable idempotency middleware.
CREATE TABLE IF NOT EXISTS "IdempotencyKey" (
    "key" TEXT NOT NULL,
    "consumed_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "response_status" INTEGER,
    "response_body" TEXT,
    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyKey_key_key" ON "IdempotencyKey"("key");
CREATE INDEX IF NOT EXISTS "IdempotencyKey_user_id_consumed_at_idx"
    ON "IdempotencyKey"("user_id", "consumed_at");
CREATE INDEX IF NOT EXISTS "IdempotencyKey_consumed_at_idx" ON "IdempotencyKey"("consumed_at");
