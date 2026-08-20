"use client";

import * as React from "react";
import { Star, MapPin, Clock, DollarSign, Loader2, Calendar, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useMentorSearch, useMentor, useMentorAvailability, useBookMentor, useMyBookings } from "@/lib/hooks/queries/use-mentors";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function MentorsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Mentors" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mentor Marketplace</h1>
        <p className="text-muted-foreground">Get guidance from industry experts</p>
      </div>
      <Tabs defaultValue="search" className="space-y-6">
        <TabsList>
          <TabsTrigger value="search">Find Mentors</TabsTrigger>
          <TabsTrigger value="bookings">My Bookings</TabsTrigger>
        </TabsList>
        <TabsContent value="search"><MentorSearch /></TabsContent>
        <TabsContent value="bookings"><MyBookings /></TabsContent>
      </Tabs>
    </div>
  );
}

function MentorSearch() {
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useMentorSearch({ page, limit: 10 });
  const [selectedMentor, setSelectedMentor] = React.useState<string | null>(null);
  const bookMentor = useBookMentor();

  const handleBook = async (slotId: string) => {
    if (!selectedMentor) return;
    try {
      await bookMentor.mutateAsync({ mentorId: selectedMentor, slotId });
      toast.success("Session booked!");
      setSelectedMentor(null);
    } catch {
      toast.error("Failed to book session");
    }
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.data?.map((m) => (
            <Card key={m.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={m.avatarUrl} />
                    <AvatarFallback>{m.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{m.name}</p>
                    <p className="text-sm text-muted-foreground">{m.title} at {m.company}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      <span className="text-sm">{m.rating?.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({m.reviewCount} reviews)</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.expertise.slice(0, 3).map((e) => (
                        <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(m.hourlyRate)}/hr</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" onClick={() => setSelectedMentor(m.id)}>Book Session</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {data?.data?.length === 0 && <p className="text-center text-muted-foreground py-8 col-span-2">No mentors found.</p>}
        </div>
      )}

      {selectedMentor && (
        <BookingDialog mentorId={selectedMentor} onClose={() => setSelectedMentor(null)} onBook={handleBook} isPending={bookMentor.isPending} />
      )}
    </div>
  );
}

function BookingDialog({ mentorId, onClose, onBook, isPending }: { mentorId: string; onClose: () => void; onBook: (slotId: string) => void; isPending: boolean }) {
  const { data: slots = [], isLoading } = useMentorAvailability(mentorId);

  return (
    <Dialog open={!!mentorId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select a Time Slot</DialogTitle>
          <DialogDescription>Choose an available time for your session</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4 max-h-[300px] overflow-y-auto">
          {isLoading && <Skeleton className="h-[100px] w-full" />}
          {!isLoading && slots.length === 0 && <p className="text-muted-foreground text-sm">No available slots.</p>}
          {slots.filter((s) => !s.isBooked).map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-medium text-sm">Day {s.dayOfWeek} · {s.startTime} - {s.endTime}</p>
              </div>
              <Button size="sm" onClick={() => onBook(s.id)} disabled={isPending}>
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Book"}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MyBookings() {
  const { data: bookings = [], isLoading } = useMyBookings();
  if (isLoading) return <Skeleton className="h-[300px] w-full" />;

  return (
    <div className="space-y-3">
      {bookings.length === 0 && <p className="text-center text-muted-foreground py-8">No bookings yet.</p>}
      {bookings.map((b) => (
        <Card key={b.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{b.mentorName}</p>
              <p className="text-sm text-muted-foreground">{formatDate(b.date)} · {b.startTime} - {b.endTime}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{formatCurrency(b.amount)}</span>
              <Badge variant={b.status === "confirmed" ? "default" : b.status === "completed" ? "secondary" : b.status === "cancelled" ? "destructive" : "outline"}>
                {b.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
