const repository = require("./admin.repository");
const { calculateAdminStats } = require("../../services/stats/stats.service");

const getAdminStats = async (adminId) => {
  const stats = await calculateAdminStats(adminId);
  return { stats };
};

const getAdminTrends = () => {
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    last7Days.push({
      date,
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      activity: Math.floor(Math.random() * (95 - 60 + 1)) + 60,
    });
  }

  const last6Months = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = new Date().getMonth();

  for (let i = 5; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    last6Months.push({
      month: monthNames[monthIndex],
      productive: Math.floor(Math.random() * 12) + 5,
      unproductive: Math.floor(Math.random() * 5) + 1,
    });
  }

  return {
    activityTrends: last7Days,
    workTrends: last6Months,
  };
};

module.exports = {
  repository,
  getAdminStats,
  getAdminTrends,
};
