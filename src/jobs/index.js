const { registerExpiredTokenCleanupJob } = require("./expired-token-cleanup.job");

const registerJobs = () => {
  registerExpiredTokenCleanupJob();
};

module.exports = { registerJobs };
