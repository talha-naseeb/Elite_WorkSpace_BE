const eventBus = require("./eventBus");

const registerEventListeners = () => {
  return eventBus;
};

module.exports = { eventBus, registerEventListeners };
