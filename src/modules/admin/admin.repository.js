const User = require("./admin.model");

const findWorkspaceAdminById = (adminId) => User.findById(adminId).select("-password");

module.exports = {
  model: User,
  findWorkspaceAdminById,
};
