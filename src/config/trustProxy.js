const configureTrustProxy = (app) => {
  const isProduction = process.env.NODE_ENV === "production";
  let trustProxyValue;

  if (process.env.TRUST_PROXY_HOPS !== undefined) {
    const hops = Number.parseInt(process.env.TRUST_PROXY_HOPS, 10);

    if (!Number.isInteger(hops) || hops < 0) {
      console.warn(`Invalid TRUST_PROXY_HOPS value '${process.env.TRUST_PROXY_HOPS}'; expected non-negative integer. Skipping trust proxy setting.`);
    } else {
      trustProxyValue = hops;
    }
  } else if (isProduction) {
    trustProxyValue = 1;
    console.warn("TRUST_PROXY_HOPS not set, defaulting to 1 for production to support accurate rate-limiting behind proxies.");
  }

  if (trustProxyValue !== undefined) {
    app.set("trust proxy", trustProxyValue);
    console.log(`Trust proxy hops set to ${trustProxyValue}`);
  }
};

module.exports = configureTrustProxy;
