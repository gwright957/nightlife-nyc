import { Router, Response } from "express";
import { z } from "zod";
import { LineLength } from "@prisma/client";
import { prisma } from "../services/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { isWithinRatingSubmitRadius } from "../utils/haversine";

const router = Router();

const RATING_POINTS = 10;
const OUT_OF_RANGE_MESSAGE =
  "Please make sure you are within range of this establishment";

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    venueId: z.string(),
    litScore: z.number().int().min(1).max(10),
    genderRatio: z.number().int().min(1).max(10),
    lineLength: z.nativeEnum(LineLength),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
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
    return res.status(403).json({ error: OUT_OF_RANGE_MESSAGE });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const rating = await tx.rating.create({
        data: {
          userId: req.userId!,
          venueId: parsed.data.venueId,
          litScore: parsed.data.litScore,
          genderRatio: parsed.data.genderRatio,
          lineLength: parsed.data.lineLength,
        },
      });

      await tx.pointsLedger.create({
        data: {
          userId: req.userId!,
          type: "rating",
          pointsAwarded: RATING_POINTS,
        },
      });

      const user = await tx.user.update({
        where: { id: req.userId! },
        data: { points: { increment: RATING_POINTS } },
      });

      return { rating, user };
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to submit rating" });
  }
});

export default router;
