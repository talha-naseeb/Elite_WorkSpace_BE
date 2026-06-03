const ApiError = require("../../utils/apiError");
const repository = require("./workspace-policy.repository");

const getWorkspaceId = (user) => user.adminRef || user._id || user.id;

const ensureWorkspacePolicy = (workspaceId) => repository.upsertDefault(workspaceId);

const getPolicyForUser = (user) => ensureWorkspacePolicy(getWorkspaceId(user));

const normalizePolicyUpdates = (payload = {}) => {
  const updates = {};

  if (payload.standardHoursPerDay !== undefined) {
    const value = Number(payload.standardHoursPerDay);
    if (!Number.isFinite(value) || value <= 0 || value > 24) {
      throw ApiError.badRequest("standardHoursPerDay must be between 1 and 24.");
    }
    updates.standardHoursPerDay = value;
  }

  if (payload.overtimeThresholdMinutes !== undefined) {
    const value = Number(payload.overtimeThresholdMinutes);
    if (!Number.isInteger(value) || value < 0 || value > 1440) {
      throw ApiError.badRequest("overtimeThresholdMinutes must be between 0 and 1440.");
    }
    updates.overtimeThresholdMinutes = value;
  }

  if (payload.lateThresholdMinutes !== undefined) {
    const value = Number(payload.lateThresholdMinutes);
    if (!Number.isInteger(value) || value < 0 || value > 240) {
      throw ApiError.badRequest("lateThresholdMinutes must be between 0 and 240.");
    }
    updates.lateThresholdMinutes = value;
  }

  if (payload.shiftStartTime !== undefined) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.shiftStartTime)) {
      throw ApiError.badRequest("shiftStartTime must use HH:mm 24-hour format.");
    }
    updates.shiftStartTime = payload.shiftStartTime;
  }

  if (payload.attendanceMode !== undefined) {
    if (!["flexible", "fixed"].includes(payload.attendanceMode)) {
      throw ApiError.badRequest("attendanceMode must be either flexible or fixed.");
    }
    updates.attendanceMode = payload.attendanceMode;
  }

  if (payload.workWeek !== undefined) {
    if (!Array.isArray(payload.workWeek) || payload.workWeek.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
      throw ApiError.badRequest("workWeek must contain weekday numbers from 1 to 7.");
    }
    updates.workWeek = [...new Set(payload.workWeek)].sort();
  }

  return updates;
};

const updatePolicyForUser = (user, payload) => {
  if (user.role !== "admin") {
    throw ApiError.forbidden("Only admins can update workspace policy.");
  }

  return repository.updateByWorkspace(getWorkspaceId(user), normalizePolicyUpdates(payload));
};

module.exports = {
  repository,
  ensureWorkspacePolicy,
  getPolicyForUser,
  updatePolicyForUser,
};
