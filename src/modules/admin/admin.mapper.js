const toStatsResponse = ({ stats }) => ({ stats });

const toTrendsResponse = ({ activityTrends, workTrends }) => ({
  activityTrends,
  workTrends,
});

module.exports = { toStatsResponse, toTrendsResponse };
