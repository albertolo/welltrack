import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient, TrackingType } from '@prisma/client';

const prisma = new PrismaClient();

const defaultSymptoms = [
  { name: 'Headache', category: 'Neurological' },
  { name: 'Fatigue', category: 'General' },
  { name: 'Joint Pain', category: 'Musculoskeletal' },
  { name: 'Muscle Ache', category: 'Musculoskeletal' },
  { name: 'Nausea', category: 'Gastrointestinal' },
  { name: 'Dizziness', category: 'Neurological' },
  { name: 'Shortness of Breath', category: 'Respiratory' },
  { name: 'Brain Fog', category: 'Neurological' },
  { name: 'Insomnia', category: 'Sleep' },
  { name: 'Anxiety', category: 'Mental Health' },
  { name: 'Depression', category: 'Mental Health' },
  { name: 'Chest Pain', category: 'Cardiovascular' },
  { name: 'Back Pain', category: 'Musculoskeletal' },
  { name: 'Stomach Pain', category: 'Gastrointestinal' },
  { name: 'Fever', category: 'General' },
];

const defaultHabits = [
  { name: 'Sleep Duration', trackingType: TrackingType.DURATION, unit: 'hours' },
  { name: 'Water Intake', trackingType: TrackingType.NUMERIC, unit: 'glasses' },
  { name: 'Exercise', trackingType: TrackingType.DURATION, unit: 'minutes' },
  { name: 'Meditation', trackingType: TrackingType.DURATION, unit: 'minutes' },
  { name: 'Steps', trackingType: TrackingType.NUMERIC, unit: 'steps' },
  { name: 'Took Vitamins', trackingType: TrackingType.BOOLEAN, unit: null },
  { name: 'Alcohol', trackingType: TrackingType.BOOLEAN, unit: null },
  { name: 'Caffeine', trackingType: TrackingType.NUMERIC, unit: 'cups' },
  { name: 'Stretching', trackingType: TrackingType.BOOLEAN, unit: null },
  { name: 'Ate Well', trackingType: TrackingType.BOOLEAN, unit: null },
];

async function main(): Promise<void> {
  console.log('Seeding default symptoms...');
  for (const symptom of defaultSymptoms) {
    await prisma.symptom.upsert({
      where: { id: `system-${symptom.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `system-${symptom.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: symptom.name,
        category: symptom.category,
        isActive: true,
        userId: null,
      },
    });
  }

  console.log('Seeding default habits...');
  for (const habit of defaultHabits) {
    await prisma.habit.upsert({
      where: { id: `system-${habit.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `system-${habit.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: habit.name,
        trackingType: habit.trackingType,
        unit: habit.unit,
        isActive: true,
        userId: null,
      },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
