import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  dosage: z.string().min(1).max(100).optional(),
  frequency: z.string().min(1).max(100).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  dosage: z.string().min(1).max(100).nullable().optional(),
  frequency: z.string().min(1).max(100).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function getMedications(req: Request, res: Response): Promise<void> {
  const medications = await prisma.medication.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'asc' },
  });

  res.status(200).json({ medications });
}

export async function createMedication(req: Request, res: Response): Promise<void> {
  const result = createSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const { name, dosage, frequency } = result.data;

  const medication = await prisma.medication.create({
    data: { userId: req.user!.id, name, dosage, frequency },
  });

  res.status(201).json({ medication });
}

export async function updateMedication(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const userId = req.user!.id;

  const result = updateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const { name, dosage, frequency, isActive } = result.data;
  if (name === undefined && dosage === undefined && frequency === undefined && isActive === undefined) {
    res.status(400).json({ error: 'At least one field (name, dosage, frequency, isActive) must be provided' });
    return;
  }

  const med = await prisma.medication.findUnique({ where: { id } });
  if (!med || med.userId !== userId) {
    res.status(404).json({ error: 'Medication not found' });
    return;
  }

  const updated = await prisma.medication.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(dosage !== undefined && { dosage }),
      ...(frequency !== undefined && { frequency }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  res.status(200).json({ medication: updated });
}

export async function deleteMedication(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const userId = req.user!.id;

  const med = await prisma.medication.findUnique({ where: { id } });
  if (!med || med.userId !== userId) {
    res.status(404).json({ error: 'Medication not found' });
    return;
  }

  await prisma.medication.delete({ where: { id } });
  res.status(204).send();
}
