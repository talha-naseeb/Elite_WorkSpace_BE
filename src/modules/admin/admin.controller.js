const ApiResponse = require("../../shared/responses/apiResponse");
const asyncHandler = require("../../shared/utils/asyncHandler");
const adminService = require("./admin.service");
const adminMapper = require("./admin.mapper");

exports.getAdminStats = asyncHandler(async (req, res) => {
  const data = await adminService.getAdminStats(req.user._id);
  const response = ApiResponse.success("Admin stats retrieved successfully", adminMapper.toStatsResponse(data));

  res.status(response.statusCode).json(response);
});

exports.getAdminTrends = asyncHandler(async (req, res) => {
  const data = adminService.getAdminTrends(req.user._id);
  const response = ApiResponse.success("Admin trends retrieved successfully", adminMapper.toTrendsResponse(data));

  res.status(response.statusCode).json(response);
});
