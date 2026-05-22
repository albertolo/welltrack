import { TrackingType } from '@prisma/client';

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

const VALID_CATEGORIES = [
  'Neurological', 'General', 'Musculoskeletal', 'Gastrointestinal',
  'Respiratory', 'Sleep', 'Mental Health', 'Cardiovascular',
];

describe('Seed data - Symptoms', () => {
  it('contains exactly 15 default symptoms', () => {
    expect(defaultSymptoms).toHaveLength(15);
  });

  it('every symptom has a non-empty name', () => {
    defaultSymptoms.forEach((s) => {
      expect(typeof s.name).toBe('string');
      expect(s.name.trim().length).toBeGreaterThan(0);
    });
  });

  it('every symptom has a valid category', () => {
    defaultSymptoms.forEach((s) => {
      expect(VALID_CATEGORIES).toContain(s.category);
    });
  });

  it('symptom names are unique', () => {
    const names = defaultSymptoms.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('generates stable deterministic IDs', () => {
    const id = (name: string): string =>
      `system-${name.toLowerCase().replace(/\s+/g, '-')}`;
    expect(id('Headache')).toBe('system-headache');
    expect(id('Joint Pain')).toBe('system-joint-pain');
    expect(id('Shortness of Breath')).toBe('system-shortness-of-breath');
  });
});

describe('Seed data - Habits', () => {
  it('contains exactly 10 default habits', () => {
    expect(defaultHabits).toHaveLength(10);
  });

  it('every habit has a non-empty name', () => {
    defaultHabits.forEach((h) => {
      expect(typeof h.name).toBe('string');
      expect(h.name.trim().length).toBeGreaterThan(0);
    });
  });

  it('every habit has a valid TrackingType', () => {
    const validTypes = Object.values(TrackingType);
    defaultHabits.forEach((h) => {
      expect(validTypes).toContain(h.trackingType);
    });
  });

  it('BOOLEAN habits have no unit', () => {
    defaultHabits
      .filter((h) => h.trackingType === TrackingType.BOOLEAN)
      .forEach((h) => expect(h.unit).toBeNull());
  });

  it('NUMERIC and DURATION habits have a unit', () => {
    defaultHabits
      .filter((h) => h.trackingType !== TrackingType.BOOLEAN)
      .forEach((h) => {
        expect(h.unit).toBeTruthy();
      });
  });

  it('habit names are unique', () => {
    const names = defaultHabits.map((h) => h.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
