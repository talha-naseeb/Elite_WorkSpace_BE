const toResponse = (document) => {
  if (!document) return document;
  if (typeof document.toObject === "function") return document.toObject();
  return document;
};

module.exports = { toResponse };
