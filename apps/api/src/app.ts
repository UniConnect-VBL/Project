import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./env.js";
import authRouter from "./routes/auth.routes.js";
import socialRouter from "./routes/social.routes.js";
import marketRouter from "./routes/market.routes.js";
import verifyRouter from "./routes/verify.routes.js";
import reviewsRouter from "./routes/reviews.routes.js";
import matchesRouter from "./routes/matches.routes.js";
import notificationsRouter from "./routes/notifications.routes.js";
import adminRouter from "./routes/admin.routes.js";
import schoolsRouter from "./routes/schools.routes.js";
import deleteRouter from "./routes/delete.routes.js";
import disputesRouter from "./routes/disputes.routes.js";
import streamsRouter from "./routes/streams.routes.js";
import jobsRouter from "./routes/jobs.routes.js";
import eventsRouter from "./routes/events.routes.js";
import recommendationsRouter from "./routes/recommendations.routes.js";
import userRouter from "./routes/user.routes.js";
import { authMiddleware } from "./middlewares/auth.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();
const port = env.PORT;

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(","),
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(morgan("tiny"));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req: express.Request, res: express.Response) => {
  res.json({ status: "ok", service: "api" });
});

app.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith("/health") || req.path.startsWith("/auth")) {
      return next();
    }
    return authMiddleware(req, res, next);
  }
);

app.use("/auth", authRouter);
app.use("/posts", socialRouter);
app.use("/feed", socialRouter); // Alias for /posts/feed
app.use("/marketplace", marketRouter);
app.use("/products", marketRouter); // Legacy alias
app.use("/verify", verifyRouter);
app.use("/reviews", reviewsRouter);
app.use("/matches", matchesRouter);
app.use("/notifications", notificationsRouter);
app.use("/admin", adminRouter);
app.use("/schools", schoolsRouter);
app.use("/delete", deleteRouter);
app.use("/disputes", disputesRouter);
app.use("/streams", streamsRouter);
app.use("/jobs", jobsRouter);
app.use("/events", eventsRouter);
app.use("/recommendations", recommendationsRouter);
app.use("/users", userRouter);

// Centralized Error Handler - must be last middleware (Rule 5.68)
app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
