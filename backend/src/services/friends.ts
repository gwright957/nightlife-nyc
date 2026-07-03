import { prisma } from "./prisma";

export function canonicalFriendPair(userIdA: string, userIdB: string): [string, string] {
  return userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
}

export async function getFriendIds(userId: string): Promise<string[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    select: { userAId: true, userBId: true },
  });

  return friendships.map((friendship) =>
    friendship.userAId === userId ? friendship.userBId : friendship.userAId
  );
}

export async function areFriends(userIdA: string, userIdB: string): Promise<boolean> {
  const [userAId, userBId] = canonicalFriendPair(userIdA, userIdB);
  const friendship = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { id: true },
  });
  return !!friendship;
}

export type UserRelationshipStatus =
  | "none"
  | "friends"
  | "pending_sent"
  | "pending_received";

export async function getRelationshipStatus(
  viewerId: string,
  targetUserId: string
): Promise<UserRelationshipStatus> {
  if (viewerId === targetUserId) {
    return "none";
  }

  if (await areFriends(viewerId, targetUserId)) {
    return "friends";
  }

  const outgoing = await prisma.friendRequest.findFirst({
    where: {
      fromUserId: viewerId,
      toUserId: targetUserId,
      status: "pending",
    },
    select: { id: true },
  });
  if (outgoing) {
    return "pending_sent";
  }

  const incoming = await prisma.friendRequest.findFirst({
    where: {
      fromUserId: targetUserId,
      toUserId: viewerId,
      status: "pending",
    },
    select: { id: true },
  });
  if (incoming) {
    return "pending_received";
  }

  return "none";
}

export async function createNotification(params: {
  userId: string;
  type: "friend_request_received" | "friend_request_accepted";
  actorId: string;
  entityId?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      actorId: params.actorId,
      entityId: params.entityId ?? null,
    },
  });
}
