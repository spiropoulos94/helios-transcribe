/**
 * Server-only repository for team workspaces (Newsroom). Handles workspaces, members,
 * roles and seat-limited invites. Seat capacity is tied to what the owner actually pays
 * for on Stripe (`Subscription.seats`), so membership can never exceed billed seats.
 *
 * NOTE: transcripts/audio are browser-only today (see docs/billing.md §7), so *content*
 * scoping to a workspace is not implemented here — that lands with server-side storage.
 * The template to follow is the already-server-side `GeneratedContent`.
 */

import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getSubscription } from '@/lib/server/subscriptionRepo';
import type { Membership, Workspace, WorkspaceInvite } from '@prisma/client';

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return value === 'owner' || value === 'admin' || value === 'member';
}

/** Create a workspace and add the creator as its owner. */
export async function createWorkspace(
  ownerId: string,
  name: string,
  seats = 1
): Promise<Workspace> {
  return prisma.workspace.create({
    data: {
      name,
      ownerId,
      seats: Math.max(1, seats),
      memberships: { create: { userId: ownerId, role: 'owner' } },
    },
  });
}

/** Workspaces the user belongs to, with their membership. */
export function getUserWorkspaces(
  userId: string
): Promise<(Membership & { workspace: Workspace })[]> {
  return prisma.membership.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });
}

export function getMembership(
  workspaceId: string,
  userId: string
): Promise<Membership | null> {
  return prisma.membership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

export async function hasWorkspaceRole(
  workspaceId: string,
  userId: string,
  roles: WorkspaceRole[]
): Promise<boolean> {
  const membership = await getMembership(workspaceId, userId);
  return membership !== null && roles.includes(membership.role as WorkspaceRole);
}

export function listMembers(
  workspaceId: string
): Promise<(Membership & { user: { id: string; email: string } })[]> {
  return prisma.membership.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export function memberCount(workspaceId: string): Promise<number> {
  return prisma.membership.count({ where: { workspaceId } });
}

/** The number of seats the workspace owner currently pays for. */
export async function seatCapacity(workspace: Workspace): Promise<number> {
  const ownerSub = await getSubscription(workspace.ownerId);
  // The billed quantity wins; fall back to the workspace's own seat count.
  return Math.max(workspace.seats, ownerSub?.seats ?? 1);
}

/** Create an invite. Fails if the workspace is already at seat capacity. */
export async function createInvite(
  workspaceId: string,
  email: string,
  role: WorkspaceRole
): Promise<{ ok: true; invite: WorkspaceInvite } | { ok: false; error: string }> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) return { ok: false, error: 'Workspace not found' };

  const [count, capacity] = await Promise.all([
    memberCount(workspaceId),
    seatCapacity(workspace),
  ]);
  if (count >= capacity) {
    return { ok: false, error: 'No seats available. Increase seats to invite more members.' };
  }

  const invite = await prisma.workspaceInvite.upsert({
    where: { workspaceId_email: { workspaceId, email } },
    create: { workspaceId, email, role, token: randomUUID() },
    update: { role, token: randomUUID(), acceptedAt: null },
  });
  return { ok: true, invite };
}

/** Accept an invite by token, adding the user as a member (seat-capped). */
export async function acceptInvite(
  token: string,
  userId: string,
  userEmail: string
): Promise<{ ok: true; workspaceId: string } | { ok: false; error: string }> {
  const invite = await prisma.workspaceInvite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt) return { ok: false, error: 'Invalid or used invite' };
  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    return { ok: false, error: 'This invite is for a different email' };
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: invite.workspaceId } });
  if (!workspace) return { ok: false, error: 'Workspace not found' };

  const existing = await getMembership(invite.workspaceId, userId);
  if (existing) {
    await prisma.workspaceInvite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });
    return { ok: true, workspaceId: invite.workspaceId };
  }

  const [count, capacity] = await Promise.all([
    memberCount(invite.workspaceId),
    seatCapacity(workspace),
  ]);
  if (count >= capacity) return { ok: false, error: 'No seats available' };

  await prisma.$transaction([
    prisma.membership.create({
      data: { workspaceId: invite.workspaceId, userId, role: invite.role },
    }),
    prisma.workspaceInvite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    }),
  ]);
  return { ok: true, workspaceId: invite.workspaceId };
}

/** Remove a member. The owner can never be removed. */
export async function removeMember(
  workspaceId: string,
  targetUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const membership = await getMembership(workspaceId, targetUserId);
  if (!membership) return { ok: false, error: 'Not a member' };
  if (membership.role === 'owner') return { ok: false, error: 'Cannot remove the owner' };
  await prisma.membership.delete({ where: { id: membership.id } });
  return { ok: true };
}
