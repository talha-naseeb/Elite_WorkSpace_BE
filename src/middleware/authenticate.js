const { authenticate } = require("./auth.middleware");

module.exports = authenticate;
module.exports.authenticate = authenticate;
