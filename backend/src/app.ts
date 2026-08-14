import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { corsOrigins } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";

const app: Express = express();

/**
 * Behind Docker/nginx the socket address is the proxy, so `req.ip` would record
 * the proxy for every request. Trusting one hop restores the real client IP,
 * which is what the refresh-token audit columns store.
 */
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

/**
 * `credentials: true` with an explicit origin allowlist, not `origin: *`.
 * The refresh token is an httpOnly cookie, and a browser will not send cookies
 * cross-origin unless both sides opt in — and the wildcard origin is rejected
 * outright once credentials are enabled.
 */
app.use(
  cors({
    origin(origin, callback) {
      // Same-origin, curl and server-to-server calls send no Origin header.
      if (!origin || corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Order matters: unmatched routes become a 404 body, then every thrown or
// forwarded error funnels through the single translator.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
