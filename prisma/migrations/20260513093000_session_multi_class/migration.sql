CREATE TABLE "SessionClass" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionClass_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SessionClass_session_id_class_id_key" ON "SessionClass"("session_id", "class_id");
CREATE INDEX "SessionClass_session_id_idx" ON "SessionClass"("session_id");
CREATE INDEX "SessionClass_class_id_idx" ON "SessionClass"("class_id");

ALTER TABLE "SessionClass" ADD CONSTRAINT "SessionClass_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionClass" ADD CONSTRAINT "SessionClass_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

