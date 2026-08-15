// ── Auth & Identity ──
export type Role = "admin" | "student" | "faculty" | "college_admin" | "recruiter" | "tpo" | "parent" | "mentor";

export interface User {
  id: string;
  email: string;
  role: Role;
  roleId: string;
  fullName: string;
  avatarUrl?: string;
  emailVerifiedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setAccessToken: (token: string | null) => void;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  role?: Role;
}

// ── API response wrappers ──
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Student Platform ──
export interface StudentProfile {
  id: string;
  userId: string;
  fullName: string;
  department?: string;
  semester?: number;
  enrollmentNumber?: string;
  dateOfBirth?: string;
  phone?: string;
  address?: string;
  bio?: string;
  departmentId?: string;
}

export interface SkillProfile {
  id: string;
  name: string;
  category: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
  yearsOfExperience?: number;
  isPrimary: boolean;
}

export interface CareerGoal {
  id: string;
  targetRole: string;
  targetCtcLakhs?: number;
  targetCompanies: string[];
  targetDate?: string;
}

export interface ReadinessScore {
  id: string;
  userId: string;
  overall: number;
  breakdown: Record<string, number>;
  calculatedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

// ── Academics ──
export interface Subject {
  id: string;
  name: string;
  code: string;
  department: string;
  semester: number;
  credits: number;
}

export interface Exam {
  id: string;
  subjectId: string;
  title: string;
  type: string;
  totalMarks: number;
  passingMarks: number;
  startTime: string;
  endTime: string;
}

export interface Assignment {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  deadline: string;
  maxScore: number;
}

export interface AttendanceRecord {
  id: string;
  subjectId: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
}

// ── DSA Platform ──
export interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  acceptanceRate: number;
  totalSubmissions: number;
  solvedBy: number;
  statement: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface Submission {
  id: string;
  problemId: string;
  userId: string;
  sourceCode: string;
  languageId: string;
  verdict: string;
  passed: number;
  total: number;
  executionTimeMs: number;
  memoryUsedMb: number;
  createdAt: string;
}

export interface Contest {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  isRated: boolean;
  status: "upcoming" | "active" | "finished";
  participantCount: number;
}

// ── Placement ──
export interface PlacementRoadmap {
  weeks: RoadmapWeek[];
  progress: number;
}

export interface RoadmapWeek {
  weekNumber: number;
  title: string;
  tasks: DailyTask[];
}

export interface DailyTask {
  id: string;
  day: number;
  title: string;
  type: string;
  completed: boolean;
}

// ── Resumes ──
export interface Resume {
  id: string;
  title: string;
  templateId: string;
  content: Record<string, unknown>;
  atsScore?: number;
  createdAt: string;
  updatedAt: string;
}

// ── Jobs ──
export interface JobListing {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  location: string;
  type: "full_time" | "part_time" | "internship" | "contract";
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  requirements: string[];
  deadline: string;
  isActive: boolean;
}

// ── Community ──
export interface ForumPost {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  tags: string[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

// ── Gamification ──
export interface GamificationSummary {
  xp: number;
  level: number;
  streak: number;
  badges: Badge[];
  missions: Mission[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  earnedAt?: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  xpReward: number;
  expiresAt: string;
}

// ── Billing ──
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "monthly" | "yearly";
  features: string[];
}

// ── Lab ──
export interface LabSubject {
  id: string;
  name: string;
  code: string;
  department: string;
  semester: number;
  credits: number;
  language: string;
}

export interface LabExperiment {
  id: string;
  subjectId: string;
  weekNumber: number;
  title: string;
  objective: string;
  problemStatement: string;
  deadline?: string;
}

// ── Leaderboards ──
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl?: string;
  score: number;
  rating: number;
  tier: string;
}
