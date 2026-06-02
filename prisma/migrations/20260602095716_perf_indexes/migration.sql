-- DropIndex
DROP INDEX "PublicRecruitmentContact_recruitment_id_idx";

-- DropIndex
DROP INDEX "SessionClass_session_id_idx";

-- CreateIndex
CREATE INDEX "Attendance_user_id_check_in_time_idx" ON "Attendance"("user_id", "check_in_time");

-- CreateIndex
CREATE INDEX "Attendance_check_in_time_idx" ON "Attendance"("check_in_time");

-- CreateIndex
CREATE INDEX "Attendance_session_id_check_in_time_idx" ON "Attendance"("session_id", "check_in_time");

-- CreateIndex
CREATE INDEX "Class_lecturer_id_idx" ON "Class"("lecturer_id");

-- CreateIndex
CREATE INDEX "ClassEnrollment_student_id_idx" ON "ClassEnrollment"("student_id");

-- CreateIndex
CREATE INDEX "Session_class_id_idx" ON "Session"("class_id");

-- CreateIndex
CREATE INDEX "Session_status_session_start_idx" ON "Session"("status", "session_start");

-- CreateIndex
CREATE INDEX "Session_session_start_idx" ON "Session"("session_start");

-- CreateIndex
CREATE INDEX "Session_created_at_idx" ON "Session"("created_at");
