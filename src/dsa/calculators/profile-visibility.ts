/**
 * Recruiter-visibility filtering for a DSA student's profile. Pure and isolated
 * so the Recruiter Portal (module 5.17) can reuse the exact same predicate when
 * rendering candidate cards/details.
 */

export interface DsaVisibilitySettings {
  showFullName: boolean;
  showEmail: boolean;
  showCollege: boolean;
  showSkills: boolean;
  showSolvedCount: boolean;
  showTopics: boolean;
  showStreak: boolean;
  showRating: boolean;
}

export interface DsaCandidateProfile {
  userId: string;
  fullName: string;
  email: string;
  collegeName: string | null;
  skills: string[];
  solvedCount: number;
  topics: string[];
  streakDays: number;
  rating: number | null;
}

export const DEFAULT_VISIBILITY: DsaVisibilitySettings = {
  showFullName: true,
  showEmail: false,
  showCollege: true,
  showSkills: true,
  showSolvedCount: true,
  showTopics: true,
  showStreak: true,
  showRating: true,
};

/**
 * Returns a filtered copy of the candidate profile containing only the fields
 * the student has opted into showing. `userId` is always present (it is not a
 * privacy toggle) and is used to link to the profile. Empty/absent values are
 * still emitted when the toggle is on so the caller can decide how to render
 * them; a field is never emitted at all when its toggle is off.
 */
export function filterVisibleFields(
  profile: DsaCandidateProfile,
  settings: DsaVisibilitySettings,
): Partial<DsaCandidateProfile> {
  const visible: Partial<DsaCandidateProfile> = { userId: profile.userId };
  if (settings.showFullName) {
    visible.fullName = profile.fullName;
  }
  if (settings.showEmail) {
    visible.email = profile.email;
  }
  if (settings.showCollege) {
    visible.collegeName = profile.collegeName;
  }
  if (settings.showSkills) {
    visible.skills = profile.skills;
  }
  if (settings.showSolvedCount) {
    visible.solvedCount = profile.solvedCount;
  }
  if (settings.showTopics) {
    visible.topics = profile.topics;
  }
  if (settings.showStreak) {
    visible.streakDays = profile.streakDays;
  }
  if (settings.showRating) {
    visible.rating = profile.rating;
  }
  return visible;
}
