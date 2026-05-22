import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const createSymptomSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(100).optional(),
});

const updateSymptomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export async function getSymptoms(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const symptoms = await prisma.symptom.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    orderBy: [{ userId: 'asc' }, { name: 'asc' }],
  });

  res.status(200).json({ symptoms });
}

export async function createSymptom(req: Request, res: Response): Promise<void> {
  const result = createSymptomSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const { name, category } = result.data;
  const symptom = await prisma.symptom.create({
    data: { name, category, userId: req.user!.id },
  });

  res.status(201).json({ symptom });
}

export async function updateSymptom(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const userId = req.user!.id;

  const result = updateSymptomSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const { name, category, isActive } = result.data;
  if (name === undefined && category === undefined && isActive === undefined) {
    res.status(400).json({ error: 'At least one field (name, category, isActive) must be provided' });
    return;
  }

  const symptom = await prisma.symptom.findUnique({ where: { id } });
  if (!symptom) {
    res.status(404).json({ error: 'Symptom not found' });
    return;
  }

  if (symptom.userId === null) {
    res.status(403).json({ error: 'Cannot modify system symptoms' });
    return;
  }

  if (symptom.userId !== userId) {
    res.status(403).json({ error: 'Cannot modify this symptom' });
    return;
  }

  const updated = await prisma.symptom.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  res.status(200).json({ symptom: updated });
}

export async function deleteSymptom(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const userId = req.user!.id;

  const symptom = await prisma.symptom.findUnique({ where: { id } });
  if (!symptom) {
    res.status(404).json({ error: 'Symptom not found' });
    return;
  }

  if (symptom.userId === null) {
    res.status(403).json({ error: 'Cannot delete system symptoms' });
    return;
  }

  if (symptom.userId !== userId) {
    res.status(403).json({ error: 'Cannot delete this symptom' });
    return;
  }

  await prisma.symptom.delete({ where: { id } });
  res.status(204).send();
}
