import { Router } from "express";

const allowedFields = new Set(["title", "completed"]);

function sendError(response, status, code, message) {
  return response.status(status).json({ error: { code, message } });
}

function requireJson(request, response, next) {
  if (!request.is("application/json")) {
    return sendError(
      response,
      415,
      "json_required",
      "Content-Type trebuie să fie application/json",
    );
  }
  return next();
}

function validateObject(body) {
  return (
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    Object.getPrototypeOf(body) === Object.prototype
  );
}

function validateFields(body, { create }) {
  if (!validateObject(body)) {
    return "Corpul cererii trebuie să fie un obiect JSON";
  }

  const unknownField = Object.keys(body).find((field) => !allowedFields.has(field));
  if (unknownField) {
    return `Câmp necunoscut: ${unknownField}`;
  }

  if (create && typeof body.title !== "string") {
    return "Câmpul title este obligatoriu";
  }

  if (Object.hasOwn(body, "title") && typeof body.title !== "string") {
    return "Câmpul title trebuie să fie text";
  }

  if (Object.hasOwn(body, "title") && body.title.trim() === "") {
    return "Câmpul title nu poate fi gol";
  }

  if (Object.hasOwn(body, "completed") && typeof body.completed !== "boolean") {
    return "Câmpul completed trebuie să fie boolean";
  }

  if (!create && Object.keys(body).length === 0) {
    return "Corpul cererii nu conține modificări";
  }

  return null;
}

function taskNotFound(response) {
  return sendError(
    response,
    404,
    "task_not_found",
    "Sarcina nu a fost găsită",
  );
}

export function createTaskRouter({ repository }) {
  const router = Router();

  router.get("/", async (_request, response) => {
    const tasks = await repository.list();
    response.json({ data: tasks });
  });

  router.post("/", requireJson, async (request, response) => {
    const validationMessage = validateFields(request.body, { create: true });
    if (validationMessage) {
      return sendError(response, 400, "validation_failed", validationMessage);
    }

    const task = await repository.create({
      title: request.body.title.trim(),
      completed: false,
    });
    response
      .status(201)
      .location(`/api/tasks/${task.id}`)
      .json({ data: task });
  });

  router.get("/:taskId", async (request, response) => {
    const task = await repository.findById(request.params.taskId);
    if (!task) return taskNotFound(response);
    response.json({ data: task });
  });

  router.patch("/:taskId", requireJson, async (request, response) => {
    const validationMessage = validateFields(request.body, { create: false });
    if (validationMessage) {
      return sendError(response, 400, "validation_failed", validationMessage);
    }

    const changes = {};
    if (Object.hasOwn(request.body, "title")) {
      changes.title = request.body.title.trim();
    }
    if (Object.hasOwn(request.body, "completed")) {
      changes.completed = request.body.completed;
    }

    const task = await repository.update(request.params.taskId, changes);
    if (!task) return taskNotFound(response);
    response.json({ data: task });
  });

  router.delete("/:taskId", async (request, response) => {
    const removed = await repository.remove(request.params.taskId);
    if (!removed) return taskNotFound(response);
    response.status(204).end();
  });

  return router;
}
