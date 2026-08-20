"use client";

import * as React from "react";
import { MessageSquare, Users, Code2, Heart, Plus, Loader2, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useForumPosts, useCreateForumPost, useLikePost, useStudyGroups, useJoinStudyGroup, useCodingClubs, useJoinCodingClub } from "@/lib/hooks/queries/use-community";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

export default function CommunityPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Community" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Community</h1>
        <p className="text-muted-foreground">Connect with fellow students and developers</p>
      </div>
      <Tabs defaultValue="forum" className="space-y-6">
        <TabsList>
          <TabsTrigger value="forum">Forum</TabsTrigger>
          <TabsTrigger value="groups">Study Groups</TabsTrigger>
          <TabsTrigger value="clubs">Coding Clubs</TabsTrigger>
        </TabsList>
        <TabsContent value="forum"><ForumView /></TabsContent>
        <TabsContent value="groups"><StudyGroupsView /></TabsContent>
        <TabsContent value="clubs"><CodingClubsView /></TabsContent>
      </Tabs>
    </div>
  );
}

function ForumView() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const { data, isLoading } = useForumPosts({ page, limit: 10, search: search || undefined });
  const createPost = useCreateForumPost();
  const likePost = useLikePost();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) { toast.error("Fill in all fields"); return; }
    try {
      await createPost.mutateAsync({ title, body, tags: [] });
      setCreateOpen(false);
      setTitle("");
      setBody("");
      toast.success("Post created!");
    } catch {
      toast.error("Failed to create post");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search posts..." className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Post</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Post</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's on your mind?" />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Write your post..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createPost.isPending}>
                {createPost.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : (
        <div className="space-y-3">
          {data?.data?.length === 0 && <p className="text-center text-muted-foreground py-8">No posts yet. Start a discussion!</p>}
          {data?.data?.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.body}</p>
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span>{p.authorName}</span>
                      <span>{formatRelativeTime(p.createdAt)}</span>
                      <span>{p.viewCount} views</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => likePost.mutate(p.id)}>
                    <Heart className="h-4 w-4 mr-1" />{p.likeCount}
                  </Button>
                </div>
                {p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StudyGroupsView() {
  const { data: groups = [], isLoading } = useStudyGroups();
  const joinGroup = useJoinStudyGroup();

  if (isLoading) return <div className="grid gap-4 md:grid-cols-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.length === 0 && <p className="text-center text-muted-foreground py-8 col-span-2">No study groups yet.</p>}
      {groups.map((g) => (
        <Card key={g.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{g.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{g.description}</p>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Users className="h-3 w-3" />{g.memberCount} members</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => joinGroup.mutate(g.id)}>Join</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CodingClubsView() {
  const { data: clubs = [], isLoading } = useCodingClubs();
  const joinClub = useJoinCodingClub();

  if (isLoading) return <div className="grid gap-4 md:grid-cols-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {clubs.length === 0 && <p className="text-center text-muted-foreground py-8 col-span-2">No coding clubs yet.</p>}
      {clubs.map((c) => (
        <Card key={c.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Code2 className="h-3 w-3" />{c.memberCount} members</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => joinClub.mutate(c.id)}>Join</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
