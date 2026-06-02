const { scheduleExpiredTokenCleanup } = require("../utils/tokenCleanup");

const registerExpiredTokenCleanupJob = () => {
  scheduleExpiredTokenCleanup();
};

module.exports = { registerExpiredTokenCleanupJob };
