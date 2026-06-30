import { Router } from "express";
import { z } from "zod";
import { prisma } from "../services/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import {
  haversineDistanceMeters,
  CHECK_IN_RADIUS_METERS,
} from "../utils/haversine";
import { computeVenueHeatScore, getTonightSince } from "../utils/tonight";

const router = Router();

router.get("/", async (_req, res) => {
  const venues = await prisma.venue.findMany({ orderBy: { name: "asc" } });
  return res.json({ venues });
});

router.get("/nearby", requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radiusMeters: z.coerce.number().positive().optional(),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const radiusMeters = parsed.data.radiusMeters ?? CHECK_IN_RADIUS_METERS;

  const venues = await prisma.venue.findMany();
  const nearby = venues
    .map((venue) => ({
      ...venue,
      distanceMeters: haversineDistanceMeters(
        parsed.data.lat,
        parsed.data.lng,
        venue.lat,
        venue.lng
      ),
    }))
    .filter((v) => v.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  return res.json({ venues: nearby });
});

router.get("/hottest", async (_req, res) => {
  const since = getTonightSince();
  const venues = await prisma.venue.findMany();
  const ratings = await prisma.rating.findMany({
    where: { createdAt: { gte: since } },
  });
  const videos = await prisma.videoSubmission.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });

  const heatScores = venues
    .map((venue) => {
      const venueRatings = ratings.filter((r) => r.venueId === venue.id);
      if (venueRatings.length === 0) {
        return null;
      }

      const latestVideo = videos.find((v) => v.venueId === venue.id);
      const computed = computeVenueHeatScore(venueRatings);

      return {
        venue,
        ...computed,
        latestVideoUrl: latestVideo?.videoUrl ?? null,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  heatScores.sort((a, b) => b.heatScore - a.heatScore);
  return res.json({ venues: heatScores.slice(0, 20) });
});

router.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) {
    return res.json({ venues: [] });
  }

  const venues = await prisma.venue.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    orderBy: { name: "asc" },
    take: 20,
  });

  return res.json({ venues });
});

router.get("/:id/tonight", async (req, res) => {
  const since = getTonightSince();

  const venue = await prisma.venue.findUnique({ where: { id: req.params.id } });
  if (!venue) {
    return res.status(404).json({ error: "Venue not found" });
  }

  const ratings = await prisma.rating.findMany({
    where: { venueId: venue.id, createdAt: { gte: since } },
  });

  const videos = await prisma.videoSubmission.findMany({
    where: { venueId: venue.id, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { username: true } } },
  });

  const avgLitScore =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.litScore, 0) / ratings.length
      : 0;
  const avgGenderRatio =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.genderRatio, 0) / ratings.length
      : 0;

  const lineCounts: Record<string, number> = {};
  for (const r of ratings) {
    lineCounts[r.lineLength] = (lineCounts[r.lineLength] ?? 0) + 1;
  }
  const dominantLine =
    Object.entries(lineCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";

  return res.json({
    venue,
    stats: {
      avgLitScore: Math.round(avgLitScore * 10) / 10,
      avgGenderRatio: Math.round(avgGenderRatio * 10) / 10,
      dominantLineLength: dominantLine,
      ratingCount: ratings.length,
    },
    videos,
  });
});

export default router;
