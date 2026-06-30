import { Router } from "express";
import { z } from "zod";
import { prisma } from "../services/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { isWithinRatingSubmitRadius } from "../utils/haversine";
import { createVideoUploadUrl } from "../services/storage";

const router = Router();

const VIDEO_POINTS = 25;
const MAX_DURATION_SECONDS = 10;

router.post("/upload-url", requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    venueId: z.string(),
    lat: z.number(),
    lng: z.number(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const venue = await prisma.venue.findUnique({ where: { id: parsed.data.venueId } });
  if (!venue) {
    return res.status(404).json({ error: "Venue not found" });
  }

  if (
    !isWithinRatingSubmitRadius(
      parsed.data.lat,
      parsed.data.lng,
      venue.lat,
      venue.lng
    )
  ) {
    return res.status(403).json({
      error: "Please make sure you are within range of this establishment",
    });
  }

  try {
    const urls = await createVideoUploadUrl(req.userId!, parsed.data.venueId);
    return res.json(urls);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create upload URL" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    venueId: z.string(),
    videoUrl: z.string().url(),
    duration: z.number().positive().max(MAX_DURATION_SECONDS),
    lat: z.number(),
    lng: z.number(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const venue = await prisma.venue.findUnique({ where: { id: parsed.data.venueId } });
  if (!venue) {
    return res.status(404).json({ error: "Venue not found" });
  }

  if (
    !isWithinRatingSubmitRadius(
      parsed.data.lat,
      parsed.data.lng,
      venue.lat,
      venue.lng
    )
  ) {
    return res.status(403).json({
      error: "Please make sure you are within range of this establishment",
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const video = await tx.videoSubmission.create({
        data: {
          userId: req.userId!,
          venueId: parsed.data.venueId,
          videoUrl: parsed.data.videoUrl,
          duration: parsed.data.duration,
        },
      });

      await tx.pointsLedger.create({
        data: {
          userId: req.userId!,
          type: "video",
          pointsAwarded: VIDEO_POINTS,
        },
      });

      const user = await tx.user.update({
        where: { id: req.userId! },
        data: { points: { increment: VIDEO_POINTS } },
      });

      return { video, user };
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to submit video" });
  }
});

export default router;
