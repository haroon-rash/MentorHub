import { describe, expect, it } from 'vitest';
import { mapApprovedTutorToCardModel } from './approvedTutorMapper.js';

describe('mapApprovedTutorToCardModel', () => {
  const baseTutor = {
    tutorProfileId: 'uuid-123',
    fullName: 'John Smith',
    highestDegree: 'MSc Computer Science',
    yearsOfExperience: 5,
    subjects: ['Math', 'Physics'],
    bio: 'Experienced tutor',
    teachingMethodology: 'Interactive',
    hourlyFee: 50,
    teachingMode: 'Online',
    profilePhotoUrl: 'https://example.com/photo.jpg',
    inPersonLocation: null,
  };

  it('maps all fields correctly', () => {
    const result = mapApprovedTutorToCardModel(baseTutor);
    expect(result.id).toBe('uuid-123');
    expect(result.name).toBe('John Smith');
    expect(result.subject).toBe('Math');
    expect(result.subjects).toEqual(['Math', 'Physics']);
    expect(result.fee).toBe(50);
    expect(result.sessions).toBe(200); // 5 * 40
    expect(result.photoUrl).toBe('https://example.com/photo.jpg');
    expect(result.initials).toBe('JS');
  });

  it('handles null tutor gracefully', () => {
    const result = mapApprovedTutorToCardModel(null);
    expect(result.name).toBe('Tutor');
    expect(result.id).toBeUndefined();
    expect(result.subjects).toEqual([]);
    expect(result.fee).toBe(0);
    expect(result.initials).toBe('T');
  });

  it('handles undefined tutor gracefully', () => {
    const result = mapApprovedTutorToCardModel(undefined);
    expect(result.name).toBe('Tutor');
    expect(result.subjects).toEqual([]);
  });

  it('handles missing subjects', () => {
    const result = mapApprovedTutorToCardModel({ ...baseTutor, subjects: null });
    expect(result.subjects).toEqual([]);
    expect(result.subject).toBe('MSc Computer Science'); // Falls back to highestDegree
  });

  it('handles string subjects (CSV format)', () => {
    const result = mapApprovedTutorToCardModel({ ...baseTutor, subjects: 'Math,Science,English' });
    expect(result.subjects).toEqual(['Math', 'Science', 'English']);
    expect(result.subject).toBe('Math');
  });

  it('calculates sessions from experience years', () => {
    const result = mapApprovedTutorToCardModel({ ...baseTutor, yearsOfExperience: 10 });
    expect(result.sessions).toBe(400);
  });

  it('handles zero years of experience', () => {
    const result = mapApprovedTutorToCardModel({ ...baseTutor, yearsOfExperience: 0 });
    expect(result.sessions).toBe(0);
  });

  it('provides default headline when degree and mode are missing', () => {
    const result = mapApprovedTutorToCardModel({ ...baseTutor, highestDegree: null, teachingMode: null });
    expect(result.headline).toBe('Verified Tutor');
  });

  it('builds headline from degree and teaching mode', () => {
    const result = mapApprovedTutorToCardModel(baseTutor);
    expect(result.headline).toBe('MSc Computer Science | Online');
  });

  it('uses bio for expertise field', () => {
    const result = mapApprovedTutorToCardModel(baseTutor);
    expect(result.expertise).toBe('Experienced tutor');
  });

  it('falls back to teachingMethodology when bio is missing', () => {
    const result = mapApprovedTutorToCardModel({ ...baseTutor, bio: null });
    expect(result.expertise).toBe('Interactive');
  });

  it('preserves raw tutor data', () => {
    const result = mapApprovedTutorToCardModel(baseTutor);
    expect(result.raw).toBe(baseTutor);
  });

  it('generates initials for single-word name', () => {
    const result = mapApprovedTutorToCardModel({ ...baseTutor, fullName: 'Alice' });
    expect(result.initials).toBe('A');
  });

  it('generates initials for three-word name (takes first two)', () => {
    const result = mapApprovedTutorToCardModel({ ...baseTutor, fullName: 'John Paul Smith' });
    expect(result.initials).toBe('JP');
  });

  it('handles empty string name', () => {
    const result = mapApprovedTutorToCardModel({ ...baseTutor, fullName: '' });
    expect(result.initials).toBe('T');
    expect(result.name).toBe('Tutor');
  });
});
