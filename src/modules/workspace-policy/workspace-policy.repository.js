const WorkspacePolicy = require("./workspace-policy.model");

const DEFAULT_POLICY = Object.freeze({
  standardHoursPerDay: 8,
  overtimeThresholdMinutes: 480,
  lateThresholdMinutes: 15,
  shiftStartTime: "09:00",
  attendanceMode: "fixed",
  workWeek: [1, 2, 3, 4, 5],
});

const findByWorkspace = (workspaceId) => WorkspacePolicy.findOne({ workspaceId });

const upsertDefault = (workspaceId) =>
  WorkspacePolicy.findOneAndUpdate(
    { workspaceId },
    { $setOnInsert: { workspaceId, ...DEFAULT_POLICY } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

const updateByWorkspace = (workspaceId, updates) =>
  WorkspacePolicy.findOneAndUpdate(
    { workspaceId },
    { $set: updates, $setOnInsert: { workspaceId } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

module.exports = {
  model: WorkspacePolicy,
  DEFAULT_POLICY,
  findByWorkspace,
  upsertDefault,
  updateByWorkspace,
};
