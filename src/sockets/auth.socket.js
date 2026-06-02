const { verifyToken } = require("../utils/jwt");

const configureSocketAuth = (io) => {
  io.use((socket, next) => {
    const authToken = socket.handshake.auth?.token;
    const authHeader = socket.handshake.headers?.authorization;
    const token = authToken || (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return next(new Error("Invalid authentication token"));
    }

    if (!decoded?._id) {
      return next(new Error("Invalid authentication token"));
    }

    socket.data.userId = decoded._id;
    socket.data.name = decoded.name;
    socket.data.role = decoded.role;
    socket.data.profileImage = decoded.profileImage;
    socket.data.workspaceId = decoded.role === "admin" ? decoded._id : decoded.adminRef || null;

    return next();
  });
};

module.exports = configureSocketAuth;
