const {
  validateLoginAuth,
  validateSignUpAuth,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyResetToken,
  validateUpdateProfile,
  validateChangePassword,
} = require("../auth.middleware");

module.exports = {
  validateLoginAuth,
  validateSignUpAuth,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyResetToken,
  validateUpdateProfile,
  validateChangePassword,
};
