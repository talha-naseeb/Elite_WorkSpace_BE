const { handlePresence } = require("./presence");

const initializeSockets = (io) => {
  io.on("connection", (socket) => {
    // Register presence tracking module
    handlePresence(io, socket);

    // Other socket modules (tasks, chat, etc) can be registered here
  });
};

module.exports = initializeSockets;
