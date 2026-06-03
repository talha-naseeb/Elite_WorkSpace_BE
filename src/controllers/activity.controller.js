const mongoose = require("mongoose");
const Activity = require("../models/activity.model");
const User = require("../models/user.model");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/helpers/asyncHandler");

const clampLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 20;
  return Math.min(Math.max(parsed, 1), 100);
};

const clampPage = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 1;
  return Math.max(parsed, 1);
};

const getUserId = (value) => String(value?._id || value?.id || value || "");

const toDate = (value, label) => {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw ApiError.badRequest(`Invalid ${label} date filter`);
  }

  if (label === "to" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    parsed.setHours(23, 59, 59, 999);
  }

  return parsed;
};

const getActivityScope = async (user) => {
  const adminId = user.role === "admin" ? user._id : user.adminRef;

  if (user.role === "manager") {
    const directReports = await User.find({ adminRef: adminId, manager: user._id }).select("_id");
    return {
      adminId,
      userIds: [user._id, ...directReports.map((member) => member._id)].map(getUserId),
    };
  }

  if (user.role === "admin") {
    return { adminId, userIds: null };
  }

  return { adminId, userIds: [getUserId(user._id)] };
};

const groupActivitiesByUser = (activities) => {
  const grouped = new Map();

  for (const activity of activities) {
    const user = activity.user;
    const userId = getUserId(user);
    if (!userId) continue;

    const current = grouped.get(userId) || {
      user: {
        _id: user?._id,
        name: user?.name,
        role: user?.role,
        profileImage: user?.profileImage,
      },
      count: 0,
      latestActivity: null,
    };

    current.count += 1;
    if (!current.latestActivity) {
      current.latestActivity = activity;
    }

    grouped.set(userId, current);
  }

  return Array.from(grouped.values());
};

const applyDateFilters = (query, { from, to }) => {
  const createdAt = {};
  const fromDate = toDate(from, "from");
  const toDateValue = toDate(to, "to");

  if (fromDate) createdAt.$gte = fromDate;
  if (toDateValue) createdAt.$lte = toDateValue;

  if (Object.keys(createdAt).length > 0) {
    query.createdAt = createdAt;
  }
};

const findSearchUserIds = async ({ search, adminId, userIds }) => {
  if (!search) return [];

  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const searchRegex = { $regex: escapedSearch, $options: "i" };
  const userQuery = {
    adminRef: adminId,
    $or: [
      { name: searchRegex },
      { email: searchRegex },
      { role: searchRegex },
    ],
  };

  if (userIds) {
    userQuery._id = { $in: userIds };
  }

  const users = await User.find(userQuery).select("_id");
  return users.map((user) => user._id);
};

const applySearchFilter = async (query, { search, adminId, userIds }) => {
  if (!search) return;

  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const searchRegex = { $regex: escapedSearch, $options: "i" };
  const matchingUserIds = await findSearchUserIds({ search, adminId, userIds });

  query.$or = [
    { message: searchRegex },
    { type: searchRegex },
    { user: { $in: matchingUserIds } },
  ];
};

// @desc    Get recent activities for the workspace
// @route   GET /api/activities
// @access  Private
exports.getActivities = asyncHandler(async (req, res) => {
  const limit = clampLimit(req.query.limit);
  const page = clampPage(req.query.page);
  const skip = (page - 1) * limit;
  const { adminId, userIds } = await getActivityScope(req.user);
  const query = { adminRef: adminId };

  if (userIds) {
    query.user = { $in: userIds };
  }

  if (req.query.type && req.query.type !== "all") {
    query.type = req.query.type;
  }

  if (req.query.userId) {
    const requestedUserId = getUserId(req.query.userId);
    if (!mongoose.Types.ObjectId.isValid(requestedUserId)) {
      throw ApiError.badRequest("Invalid userId filter");
    }

    query.user = userIds && !userIds.includes(requestedUserId)
      ? { $in: [] }
      : requestedUserId;
  }

  applyDateFilters(query, { from: req.query.from, to: req.query.to });
  await applySearchFilter(query, { search: req.query.search, adminId, userIds });

  const [activities, total] = await Promise.all([
    Activity.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name email role profileImage"),
    Activity.countDocuments(query),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const payload = {
    activities,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };

  if (req.query.groupBy === "user") {
    const allMatchingActivities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .populate("user", "name email role profileImage");
    payload.activityByUser = groupActivitiesByUser(allMatchingActivities);
  }

  res.status(200).json(ApiResponse.success("Activities retrieved", payload));
});
