// src/middlewares/sameManager.middleware.js
const ApiError = require("../utils/apiError");
const User = require("../models/user.model");

/**
 * ensureSameManager(targetUserIdPath)
 * Ensures the target user (id in req.params or req.body) is under the same manager as req.user.
 * Example:
 *   router.post("/assign", authenticate, validateUserEmail, ensureSameManager("body.assignedTo"), controller)
 *
 * The path supports dot notation like "body.assignedTo" or "params.id"
 */
function getFromPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

exports.ensureSameManager = (targetPath) => {
  return async (req, res, next) => {
    try {
      const targetId = getFromPath(req, targetPath);
      if (!targetId) return next(ApiError.badRequest("Target user id not provided"));

      const targetUser = await User.findById(targetId).select("manager");
      if (!targetUser) return next(ApiError.notFound("Target user not found"));

      // Admin bypasses same-manager restriction
      if (req.user.role === "admin") return next();

      // If requester is manager, they can operate on their direct reports
      if (req.user.role === "manager") {
        if (String(targetUser.manager) !== String(req.user._id) && String(targetUser._id) !== String(req.user._id)) {
          return next(ApiError.forbidden("You can only operate on your team members"));
        }
        return next();
      }

      // If requester is a member, they can only operate on teammates (same manager)
      if (req.user.role === "member") {
        // both must have same manager id (could be undefined)
        const requesterManager = String(req.user.manager || "");
        const targetManager = String(targetUser.manager || "");
        if (requesterManager && requesterManager === targetManager) {
          return next();
        }
        return next(ApiError.forbidden("You can only operate on teammates under the same manager"));
      }

      // Default deny
      next(ApiError.forbidden("Not allowed"));
    } catch (err) {
      next(err);
    }
  };
};
