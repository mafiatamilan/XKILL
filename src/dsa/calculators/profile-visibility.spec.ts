import {
  DEFAULT_VISIBILITY,
  DsaCandidateProfile,
  DsaVisibilitySettings,
  filterVisibleFields,
} from './profile-visibility';

const PROFILE: DsaCandidateProfile = {
  userId: 'u1',
  fullName: 'Ada Lovelace',
  email: 'ada@college.edu',
  collegeName: 'National College',
  skills: ['python', 'react'],
  solvedCount: 87,
  topics: ['array', 'dp', 'graphs'],
  streakDays: 12,
  rating: 1640,
};

function settings(overrides: Partial<DsaVisibilitySettings> = {}): DsaVisibilitySettings {
  return { ...DEFAULT_VISIBILITY, ...overrides };
}

describe('filterVisibleFields', () => {
  it('returns every opt-in field under default settings (email stays private)', () => {
    expect(filterVisibleFields(PROFILE, DEFAULT_VISIBILITY)).toEqual({
      userId: 'u1',
      fullName: 'Ada Lovelace',
      collegeName: 'National College',
      skills: ['python', 'react'],
      solvedCount: 87,
      topics: ['array', 'dp', 'graphs'],
      streakDays: 12,
      rating: 1640,
    });
  });

  it('emits email when the student opts in', () => {
    const result = filterVisibleFields(PROFILE, settings({ showEmail: true }));
    expect(result.email).toBe('ada@college.edu');
  });

  it('always keeps userId even when every toggle is off', () => {
    const result = filterVisibleFields(PROFILE, {
      showFullName: false,
      showEmail: false,
      showCollege: false,
      showSkills: false,
      showSolvedCount: false,
      showTopics: false,
      showStreak: false,
      showRating: false,
    });
    expect(result).toEqual({ userId: 'u1' });
  });

  it('omits only the toggled-off fields', () => {
    const result = filterVisibleFields(PROFILE, settings({ showEmail: false, showRating: false }));
    expect(result.email).toBeUndefined();
    expect(result.rating).toBeUndefined();
    expect(result.fullName).toBe('Ada Lovelace');
    expect(result.streakDays).toBe(12);
  });

  it('emits null/empty values as-is when the toggle is on', () => {
    const result = filterVisibleFields(
      {
        ...PROFILE,
        collegeName: null,
        skills: [],
        topics: [],
        rating: null,
      },
      settings({}),
    );
    expect(result.collegeName).toBeNull();
    expect(result.skills).toEqual([]);
    expect(result.topics).toEqual([]);
    expect(result.rating).toBeNull();
  });

  it('does not mutate the input profile', () => {
    const original = { ...PROFILE };
    filterVisibleFields(PROFILE, settings({ showEmail: false }));
    expect(PROFILE).toEqual(original);
  });
});
