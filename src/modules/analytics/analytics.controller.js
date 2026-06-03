const ApiResponse = require("../../utils/apiResponse");
const asyncHandler = require("../../utils/helpers/asyncHandler");
const analyticsService = require("./analytics.service");

exports.getTeamEfficiency = asyncHandler(async (req, res) => {
  const efficiency = await analyticsService.getTeamEfficiency({
    user: req.user,
    query: req.query,
  });

  res.status(200).json(ApiResponse.success("Team efficiency retrieved", { efficiency }));
});
