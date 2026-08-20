"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import {
  useStudentProfile, useUpdateProfile,
  useSkills, useAddSkill, useDeleteSkill,
  useCareerGoals, useDeleteCareerGoal,
} from "@/lib/hooks/queries/use-student";
import type { SkillProfile, CareerGoal } from "@/lib/types";
import { profileSchema, type ProfileInput } from "@/lib/validators/profile";
import { toast } from "sonner";

export default function StudentProfilePage() {
  const { data: profile, isLoading } = useStudentProfile();
  const updateProfile = useUpdateProfile();

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: profile?.fullName || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      bio: profile?.bio || "",
      dateOfBirth: profile?.dateOfBirth || "",
    },
  });

  const onSubmit = async (data: ProfileInput) => {
    try {
      await updateProfile.mutateAsync(data);
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Profile" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">Manage your personal information</p>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="career">Career Goals</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.userId} />
                    <AvatarFallback className="text-2xl">{profile?.fullName?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{profile?.fullName}</p>
                    <p className="text-sm text-muted-foreground">{profile?.enrollmentNumber}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" {...form.register("fullName")} />
                    {form.formState.errors.fullName && (
                      <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" {...form.register("phone")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input id="dateOfBirth" type="date" {...form.register("dateOfBirth")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input value={profile?.department || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Semester</Label>
                    <Input value={profile?.semester?.toString() || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Enrollment Number</Label>
                    <Input value={profile?.enrollmentNumber || ""} disabled />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" {...form.register("address")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" rows={3} {...form.register("bio")} />
                  <p className="text-xs text-muted-foreground">{form.watch("bio")?.length || 0}/500</p>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={updateProfile.isPending}>
                    {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <SkillsSection />
        </TabsContent>

        <TabsContent value="career">
          <CareerGoalsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SkillsSection() {
  const { data: skills = [], isLoading } = useSkills();
  const addSkill = useAddSkill();
  const deleteSkill = useDeleteSkill();

  if (isLoading) return <Skeleton className="h-[300px] w-full" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Skills</CardTitle>
          <CardDescription>Add your technical and soft skills</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {skills.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No skills added yet. Add your first skill to get started.</p>
        ) : (
          <div className="space-y-2">
            {skills.map((skill: SkillProfile) => (
              <div key={skill.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <span className="font-medium">{skill.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">({skill.category})</span>
                  <span className="ml-2 text-xs bg-secondary px-2 py-0.5 rounded-full">{skill.proficiency}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteSkill.mutate(skill.id)}>Remove</Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CareerGoalsSection() {
  const { data: goals = [], isLoading } = useCareerGoals();
  const deleteGoal = useDeleteCareerGoal();

  if (isLoading) return <Skeleton className="h-[300px] w-full" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Career Goals</CardTitle>
          <CardDescription>Define your career aspirations</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No career goals set. Define your target to stay focused.</p>
        ) : (
          <div className="space-y-2">
            {goals.map((goal: CareerGoal) => (
              <div key={goal.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <span className="font-medium">{goal.targetRole}</span>
                  {goal.targetCtcLakhs && (
                    <span className="ml-2 text-sm text-muted-foreground">₹{goal.targetCtcLakhs} LPA</span>
                  )}
                  {goal.targetCompanies.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {goal.targetCompanies.map((c: string) => (
                        <span key={c} className="text-xs bg-secondary px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteGoal.mutate(goal.id)}>Remove</Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
