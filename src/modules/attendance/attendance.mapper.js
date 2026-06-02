const toResponse = (document) => {
  if (!document) return document;
  if (typeof document.toObject === "function") return document.toObject();
  return document;
};

const toListResponse = (documents) => documents.map(toResponse);

module.exports = { toResponse, toListResponse };
