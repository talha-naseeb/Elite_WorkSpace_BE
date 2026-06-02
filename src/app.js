const path = require("path");
// Load .env in local dev — on Railway/production, env vars are injected directly
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
}
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const v1Routes = require("./api/v1");
const errorHandler = require("./utils/helpers/errorHandler");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { corsOptions } = require("./config/cors");
const configureTrustProxy = require("./config/trustProxy");

const app = express();

// Middleware
configureTrustProxy(app);
app.use(cors(corsOptions));
app.use(express.json());
app.use(passport.initialize());

// Passport Config
require("./config/passport");

// Routes
app.use("/api/v1", v1Routes);

// Swagger API Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Workspace Elite API Documentation",
  }),
);

// Error handling middleware
app.use(errorHandler);

module.exports = app;
