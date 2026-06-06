const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(root, "..");
const readBackend = (...segments) => readFileSync(path.join(root, "src", ...segments), "utf8");
const readWorkspace = (...segments) => readFileSync(path.join(workspaceRoot, ...segments), "utf8");

test("members can discover only projects they belong to", () => {
  const routes = readBackend("routes", "project.routes.js");
  const controller = readBackend("controllers", "project.controller.js");

  assert.match(routes, /\.get\(authorize\("admin",\s*"manager",\s*"member"\)/);
  assert.match(controller, /const isIndividualContributor = .*"member"/s);
  assert.match(controller, /\$or:\s*\[[\s\S]*members:\s*req\.user\._id[\s\S]*manager:\s*req\.user\._id[\s\S]*createdBy:\s*req\.user\._id[\s\S]*\]/);
});

test("task creation validates member assignment against selected project scope", () => {
  const controller = readBackend("controllers", "task.controller.js");

  assert.match(controller, /const Project = require\("\.\.\/models\/project\.model"\)/);
  assert.match(controller, /validateCreateTaskAssignee/);
  assert.match(controller, /isIndividualContributor/);
  assert.match(controller, /project\.members\.some/);
  assert.match(controller, /If selecting a teammate, choose someone from the selected project/);
  assert.match(controller, /Without a project, you can only assign tasks to yourself/);
});

test("frontend task services and types avoid broad any payloads", () => {
  const service = readWorkspace("front-end", "src", "services", "task.service.ts");
  const types = readWorkspace("front-end", "src", "pages", "tasks", "types.ts");

  assert.doesNotMatch(service, /taskData:\s*any/);
  assert.doesNotMatch(service, /data:\s*any/);
  assert.match(service, /CreateTaskPayload/);
  assert.match(service, /UpdateTaskPayload/);
  assert.match(types, /email\?:\s*string/);
  assert.match(types, /role\?:\s*string/);
  assert.match(types, /TaskProjectOption/);
  assert.match(types, /members:\s*TaskUser\[\]/);
});

test("task page fetches projects for members and passes project context to dialog", () => {
  const page = readWorkspace("front-end", "src", "pages", "tasks", "TasksPage.tsx");

  assert.doesNotMatch(page, /queryKey:\s*\["projects"\][\s\S]*?enabled:\s*user\?\.role/);
  assert.match(page, /queryKey:\s*\["projects"\][\s\S]*?enabled:\s*Boolean\(user\)/);
  assert.match(page, /currentUser=\{user\}/);
  assert.match(page, /projects=\{projects\}/);
});

test("task dialog derives assignees from selected project and current user", () => {
  const dialog = readWorkspace("front-end", "src", "pages", "tasks", "components", "TaskDialog.tsx");

  assert.doesNotMatch(dialog, /task\?:\s*any/);
  assert.doesNotMatch(dialog, /team:\s*any\[\]/);
  assert.doesNotMatch(dialog, /projects\?:\s*any\[\]/);
  assert.match(dialog, /currentUser/);
  assert.match(dialog, /selectedProject/);
  assert.match(dialog, /eligibleAssignees/);
  assert.match(dialog, /Assign to me/);
  assert.match(dialog, /Assignees are limited to members of this project/);
  assert.match(dialog, /No teammates found for this project/);
});
