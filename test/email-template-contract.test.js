const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");

const backendRoot = path.resolve(__dirname, "..");
const emailModulePath = path.join(backendRoot, "src", "utils", "email.js");
const transportModulePath = path.join(backendRoot, "src", "services", "email", "email.transport.js");
const frontendUrl = "https://elite-work-space-fe.vercel.app";

const loadEmailModuleWithStubbedTransport = () => {
  const sentMessages = [];
  const originalLoad = Module._load;

  Module._load = function load(request, parent, isMain) {
    if (request === "nodemailer") {
      return {
        createTransport: () => ({
          verify: (callback) => callback?.(null, true),
          sendMail: async (mailOptions) => {
            sentMessages.push(mailOptions);
            return { messageId: "test-message" };
          },
        }),
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[emailModulePath];
  delete require.cache[transportModulePath];

  return {
    emailModule: require(emailModulePath),
    sentMessages,
    restore: () => {
      Module._load = originalLoad;
      delete require.cache[emailModulePath];
      delete require.cache[transportModulePath];
    },
  };
};

test("transactional emails use deployed frontend links and dark brand styling", async () => {
  const previousEnv = { ...process.env };
  process.env.FRONTEND_URL = frontendUrl;
  process.env.EMAIL_FROM = "Workspace Elite <noreply@example.com>";

  const { emailModule, sentMessages, restore } = loadEmailModuleWithStubbedTransport();

  try {
    await emailModule.sendResetPasswordEmail("reset@example.com", "reset-token");
    await emailModule.sendVerificationEmail("verify@example.com", "verify-token");
    await emailModule.sendEmployeeCredentialsEmail("employee@example.com", "TempPassword123!", "employee-token");
    await emailModule.sendPasswordChangedEmail("changed@example.com");

    assert.equal(sentMessages.length, 4);

    const combinedHtml = sentMessages.map((message) => message.html).join("\n");
    assert.match(combinedHtml, new RegExp(`${frontendUrl}/reset-password\\?token=reset-token`));
    assert.match(combinedHtml, new RegExp(`${frontendUrl}/verify-email\\?token=verify-token`));
    assert.match(combinedHtml, new RegExp(`${frontendUrl}/verify-email\\?token=employee-token`));
    assert.match(combinedHtml, new RegExp(`${frontendUrl}/auth/login`));

    for (const message of sentMessages) {
      assert.match(message.html, /#070b14/i, "email should use the dark app background");
      assert.match(message.html, /#0b1020/i, "email should use the dark card surface");
      assert.match(message.html, /#f1f5f9/i, "email should use the dark theme foreground");
      assert.doesNotMatch(message.html, /#6366f1/i, "email should not use the old purple brand color");
    }
  } finally {
    restore();
    process.env = previousEnv;
  }
});
