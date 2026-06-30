import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const bucket = process.env.S3_BUCKET ?? "nightlife-videos";
const publicUrl = process.env.S3_PUBLIC_URL ?? "";

const s3 = new S3Client({
  region: process.env.S3_REGION ?? "auto",
  endpoint: process.env.S3_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
  forcePathStyle: process.env.STORAGE_PROVIDER === "r2",
});

export async function createVideoUploadUrl(userId: string, venueId: string) {
  const key = `videos/${userId}/${venueId}/${randomUUID()}.mp4`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: "video/mp4",
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const videoUrl = publicUrl ? `${publicUrl.replace(/\/$/, "")}/${key}` : uploadUrl.split("?")[0];

  return { uploadUrl, videoUrl, key };
}
