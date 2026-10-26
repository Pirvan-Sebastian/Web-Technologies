export function createReportPipeline({
  clock,
  createRequestId,
  logger,
}) {
  return [
    function reportRequestMiddleware(request, response, next) {
      const startedAt = clock.now();
      const incomingRequestId = request.get("X-Request-Id");
      const requestId = typeof incomingRequestId === "string" && incomingRequestId.trim() !== ""
        ? incomingRequestId.trim()
        : createRequestId();

      request.requestId = requestId;
      response.setHeader("X-Request-Id", requestId);

      let durationMs = 0;
      let logged = false;

      const captureDuration = () => {
        durationMs = Math.max(0, clock.now() - startedAt);
        response.setHeader("X-Response-Time-Ms", String(durationMs));
      };

      const logFinalization = (outcome) => {
        if (logged) return;
        logged = true;
        logger.info({
          requestId,
          method: request.method,
          path: request.path,
          status: response.statusCode,
          durationMs,
          outcome,
        });
      };

      response.once("close", () => logFinalization("aborted"));
      response.once("finish", () => logFinalization("completed"));

      try {
        if (!request.is("application/json")) {
          captureDuration();
          return response.status(415).json({
            error: {
              code: "json_required",
              message: "Request body must be JSON",
            },
          });
        }

        const payload = request.body;
        const hasExpectedFields = payload && typeof payload === "object" && !Array.isArray(payload)
          && Object.keys(payload).length === 2
          && Object.prototype.hasOwnProperty.call(payload, "summary")
          && Object.prototype.hasOwnProperty.call(payload, "severity");

        if (!hasExpectedFields) {
          captureDuration();
          return response.status(400).json({
            error: {
              code: "validation_failed",
              message: "Request body must include a non-empty summary and a valid severity.",
              requestId,
            },
          });
        }

        const summary = typeof payload.summary === "string" ? payload.summary.trim() : "";
        const severity = typeof payload.severity === "string"
          ? payload.severity.trim().toLowerCase()
          : "";

        if (summary === "" || !["low", "medium", "high"].includes(severity)) {
          captureDuration();
          return response.status(400).json({
            error: {
              code: "validation_failed",
              message: "Request body must include a non-empty summary and a valid severity.",
              requestId,
            },
          });
        }

        const normalizedBody = Object.freeze({
          summary,
          severity,
        });

        request.body = normalizedBody;
        captureDuration();
        return next();
      } catch (error) {
        captureDuration();
        return next(error);
      }
    },
  ];
}
