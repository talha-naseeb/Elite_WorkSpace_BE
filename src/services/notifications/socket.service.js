const getSocketServer = (reqOrApp) => {
  if (!reqOrApp) return null;
  if (typeof reqOrApp.get === "function") return reqOrApp.get("io");
  if (reqOrApp.app && typeof reqOrApp.app.get === "function") return reqOrApp.app.get("io");
  return null;
};

const emitToWorkspace = (io, workspaceId, event, payload) => {
  if (!io || !workspaceId) return;
  io.to(String(workspaceId)).emit(event, payload);
};

module.exports = { getSocketServer, emitToWorkspace };
