const Attendance = require("../modules/attendance/attendance.model");
const { logger } = require("../utils/logger");

const ensureAttendanceIndexes = async () => {
  try {
    await Attendance.collection.dropIndex("user_1_date_1");
    logger.info("attendance.index.dropped_stale_user_date");
  } catch (error) {
    if (error.codeName !== "IndexNotFound") {
      throw error;
    }
  }

  await Attendance.syncIndexes();
};

module.exports = { ensureAttendanceIndexes };
