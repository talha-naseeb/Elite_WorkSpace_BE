const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Workspace Elite API",
      version: "1.0.0",
      description: "Comprehensive API documentation for the Workspace Elite tracking and management system.",
      contact: {
        name: "Workspace Elite Support",
        email: "support@workspaceelite.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5001}/api/v1`,
        description: "Local v1 API server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Access token is missing or invalid",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
        BadRequestError: {
          description: "The request body or parameters are invalid",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
        ForbiddenError: {
          description: "The authenticated user does not have permission to access this resource",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
        NotFoundError: {
          description: "The requested resource was not found",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["success", "message"],
          properties: {
            success: { type: "boolean", default: false },
            message: { type: "string" },
            errors: {
              type: "array",
              items: { type: "string" },
            },
          },
          example: {
            success: false,
            message: "No valid token provided",
            errors: [],
          },
        },
        Success: {
          type: "object",
          required: ["success", "message"],
          properties: {
            success: { type: "boolean", default: true },
            message: { type: "string" },
            data: { type: "object" },
          },
          example: {
            success: true,
            message: "Request completed successfully",
            data: {},
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    path.join(__dirname, "../api/**/*.js"),
    path.join(__dirname, "../modules/**/*.routes.js"),
    path.join(__dirname, "../modules/**/*.controller.js"),
    path.join(__dirname, "../modules/**/*.model.js"),
    path.join(__dirname, "../routes/*.js"),
    path.join(__dirname, "../routes/**/*.js"),
    path.join(__dirname, "../controllers/*.js"),
    path.join(__dirname, "../models/*.js"),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
