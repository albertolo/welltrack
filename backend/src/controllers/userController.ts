import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { comparePassword } from '../utils/hash';

const updateMeSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  timezone: z.string().min(1).max(100).optional(),
});

const deleteMeSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

function userResponse(user: { id: string; email: string; displayName: string | null; timezone: string; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    timezone: user.timezone,
    createdAt: user.createdAt,
  };
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.status(200).json({ user: userResponse(user) });
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const result = updateMeSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const { displayName, timezone } = result.data;
  if (displayName === undefined && timezone === undefined) {
    res.status(400).json({ error: 'At least one field (displayName, timezone) must be provided' });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(displayName !== undefined && { displayName }),
      ...(timezone !== undefined && { timezone }),
    },
  });

  res.status(200).json({ user: userResponse(user) });
}

export async function deleteMe(req: Request, res: Response): Promise<void> {
  const result = deleteMeSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const valid = await comparePassword(result.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  await prisma.user.delete({ where: { id: req.user!.id } });

  res.status(204).send();
}
