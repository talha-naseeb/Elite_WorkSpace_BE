const ApiResponse = require("../../shared/responses/apiResponse");
const asyncHandler = require("../../shared/utils/asyncHandler");
const reportsService = require("./reports.service");

exports.getSummary = asyncHandler(async (req, res) => {
  const summary = await reportsService.getSummary({ user: req.user, query: req.query });
  res.status(200).json(ApiResponse.success("Report summary retrieved", { summary }));
});
