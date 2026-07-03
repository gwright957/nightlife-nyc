import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import venueRoutes from "./routes/venues";
import ratingRoutes from "./routes/ratings";
import videoRoutes from "./routes/videos";
import leaderboardRoutes from "./routes/leaderboard";
import rewardRoutes from "./routes/rewards";
import referralRoutes from "./routes/referrals";
import userRoutes from "./routes/users";
import friendRoutes from "./routes/friends";
import notificationRoutes from "./routes/notifications";

const app = express();
const port = process.env.PORT ?? 3001;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "*",
  })
);
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "nightlife-nyc-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/venues", venueRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/notifications", notificationRoutes);

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`NightLife NYC API running on port ${port}`);
});

export default app;
