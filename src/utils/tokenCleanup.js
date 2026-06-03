const User = require("../models/user.model");
const { logger } = require("./logger");

const cleanupExpiredTokens = async () => {
  try {
    const now = new Date();

    const result1 = await User.updateMany({ resetPasswordExpires: { $lte: now } }, { $unset: { resetPasswordToken: "", resetPasswordExpires: "" } });

    const result2 = await User.updateMany({ emailVerificationExpires: { $lte: now } }, { $unset: { emailVerificationToken: "", emailVerificationExpires: "" } });

    if (result1.modifiedCount > 0 || result2.modifiedCount > 0) {
      logger.info("token_cleanup.expired_tokens_removed", {
        resetPassword: result1.modifiedCount,
        emailVerification: result2.modifiedCount,
      });
    }
  } catch (error) {
    console.error("[TokenCleanup] Failed to remove expired tokens:", error);
  }
};

const scheduleExpiredTokenCleanup = ({ intervalMs = 1000 * 60 * 60 } = {}) => {
  // Run immediately once then repeat
  cleanupExpiredTokens();
  const intervalId = setInterval(cleanupExpiredTokens, intervalMs);
  return intervalId;
};

module.exports = { cleanupExpiredTokens, scheduleExpiredTokenCleanup };
