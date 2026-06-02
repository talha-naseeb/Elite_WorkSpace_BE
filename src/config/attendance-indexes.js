const Attendance = require("../modules/attendance/attendance.model");

const ensureAttendanceIndexes = async () => {
  try {
    await Attendance.collection.dropIndex("user_1_date_1");
    console.log("[Attendance] Dropped stale user_1_date_1 index");
  } catch (error) {
    if (error.codeName !== "IndexNotFound") {
      throw error;
    }
  }

  await Attendance.syncIndexes();
};

module.exports = { ensureAttendanceIndexes };
