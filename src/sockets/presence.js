const User = require("../models/user.model");

// Presence Tracking: workspaceId -> Map(userId -> { user, socketIds: Set })
const workspacePresence = new Map();

async function broadcastActiveUsers(io, wsId) {
  const presenceMap = workspacePresence.get(wsId);
  if (!presenceMap) return;

  try {
    // Map all online user IDs to promises to fetch their latest profile info and active time entry.
    const activeUsersPromises = Array.from(presenceMap.values()).map(async (u) => {
      try {
        const [userDoc, activeTimeEntry] = await Promise.all([
          User.findById(u.id).select('name profileImage role'),
          require("../modules/time-tracking/time-entry.model").findOne({ user: u.id, status: "active" }).select("clockInAt status")
        ]);

        if (userDoc) {
           return {
              id: u.id,
              name: userDoc.name,
              role: userDoc.role,
              profileImage: userDoc.profileImage,
              isClockedIn: !!activeTimeEntry,
              attendanceStatus: activeTimeEntry ? "present" : "none",
              clockInTime: activeTimeEntry?.clockInAt
           };
        }
        return null;
      } catch (error) {
        console.error(`Error fetching active user ${u.id}:`, error);
        return null;
      }
    });
    
    const results = await Promise.all(activeUsersPromises);
    const activeUsers = results.filter(Boolean);
    
    io.to(wsId).emit("workspace:active-users", { activeUsers });
  } catch(error) {
    console.error("Error broadcasting active users:", error);
  }
}

function handlePresence(io, socket) {
  const { userId, role, workspaceId, name } = socket.data;
  
  if (!workspaceId) return;

  const wsId = String(workspaceId);
  socket.join(wsId);

  // Initialise presence map for workspace
  if (!workspacePresence.has(wsId)) {
    workspacePresence.set(wsId, new Map());
  }

  const presenceMap = workspacePresence.get(wsId);
  
  if (!presenceMap.has(String(userId))) {
    presenceMap.set(String(userId), {
      id: userId,
      name: name,
      role: role,
      profileImage: socket.data.profileImage,
      socketIds: new Set([socket.id]),
    });
    // New user online! Emit to workspace
    broadcastActiveUsers(io, wsId);
  } else {
    // Existing user, another connection
    presenceMap.get(String(userId)).socketIds.add(socket.id);
  }

  // Handle workspace joining and manual trigger
  socket.on("join-workspace", (requestedWorkspaceId, callback) => {
    if (!socket.data.workspaceId || String(requestedWorkspaceId) !== String(socket.data.workspaceId)) {
      socket.emit("workspace:error", { message: "Unauthorized workspace access" });
      if (typeof callback === "function") callback({ ok: false });
      return;
    }

    socket.join(String(requestedWorkspaceId));
    if (typeof callback === "function") callback({ ok: true });
    broadcastActiveUsers(io, String(requestedWorkspaceId));
  });

  socket.on("disconnect", () => {
    const presenceMap = workspacePresence.get(wsId);
    if (presenceMap && presenceMap.has(String(userId))) {
      const userData = presenceMap.get(String(userId));
      userData.socketIds.delete(socket.id);
      
      if (userData.socketIds.size === 0) {
        // User fully offline
        presenceMap.delete(String(userId));
        broadcastActiveUsers(io, wsId);
      }
    }
  });
}

module.exports = { handlePresence, broadcastActiveUsers };
