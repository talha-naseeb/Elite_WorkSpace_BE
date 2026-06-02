const { validateUserEmail } = require("./auth.middleware");

module.exports = validateUserEmail;
module.exports.validateVerifiedEmail = validateUserEmail;
module.exports.validateUserEmail = validateUserEmail;
