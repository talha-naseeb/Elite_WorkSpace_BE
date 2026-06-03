const service = require("./workspace-policy.service");

const getPolicy = async (req, res, next) => {
  try {
    const policy = await service.getPolicyForUser(req.user);
    res.json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
};

const updatePolicy = async (req, res, next) => {
  try {
    const policy = await service.updatePolicyForUser(req.user, req.body);
    res.json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPolicy,
  updatePolicy,
};
