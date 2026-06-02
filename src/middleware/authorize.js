const { authorize, isAdmin, isSuperAdmin, isManager } = require("./auth.middleware");

module.exports = authorize;
module.exports.authorize = authorize;
module.exports.isAdmin = isAdmin;
module.exports.isSuperAdmin = isSuperAdmin;
module.exports.isManager = isManager;
