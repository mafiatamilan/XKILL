import { z } from "zod";

export const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().max(500, "Bio must be under 500 characters").optional(),
  dateOfBirth: z.string().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const skillSchema = z.object({
  name: z.string().min(1, "Skill name is required"),
  category: z.string().min(1, "Category is required"),
  proficiency: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  yearsOfExperience: z.number().min(0).max(50).optional(),
  isPrimary: z.boolean().default(false),
});

export type SkillInput = z.infer<typeof skillSchema>;

export const careerGoalSchema = z.object({
  targetRole: z.string().min(1, "Target role is required"),
  targetCtcLakhs: z.number().min(0).optional(),
  targetCompanies: z.array(z.string()).default([]),
  targetDate: z.string().optional(),
});

export type CareerGoalInput = z.infer<typeof careerGoalSchema>;
