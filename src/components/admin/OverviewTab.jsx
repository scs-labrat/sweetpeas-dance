import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Star, Calendar, Clock, Sparkles, Loader2, ListPlus, CheckCircle } from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { toast } from "sonner";

const EVENT_COLORS = {
  class: "bg-blue-100 border-blue-300 text-blue-800",
  meeting: "bg-purple-100 border-purple-300 text-purple-800",
  reminder: "bg-yellow-100 border-yellow-300 text-yellow-800",
  deadline: "bg-red-100 border-red-300 text-red-800",
  other: "bg-gray-100 border-gray-300 text-gray-800",
};

const PRIORITY_RANK = (p) => ({ high: 0, medium: 1, low: 2 }[p] ?? 3);

export default function OverviewTab({
  todayEvents,
  loadingHoroscope,
  horoscope,
  onRefreshHoroscope,
  pendingCount,
  confirmedCount,
  activeEnrollmentCount,
  waitlistedCount,
  unreadConversationCount,
  activeClassSchedules,
  enrollments,
}) {
  const queryClient = useQueryClient();

  const { data: studioTasks = [] } = useQuery({
    queryKey: ["studioTasks"],
    queryFn: () => base44.entities.StudioTask.list(),
  });

  const completeTaskMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.StudioTask.update(id, {
        status: "completed",
        completed_date: format(new Date(), "yyyy-MM-dd"),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studioTasks"] });
      toast.success("Task marked complete — nice work! 🎉");
    },
  });

  const openTasks = (studioTasks || []).filter((t) => t.status !== "completed");
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const thisWeekTasks = openTasks
    .filter((t) =>
      t.due_date ? isWithinInterval(parseISO(t.due_date), { start: weekStart, end: weekEnd }) : true
    )
    .sort((a, b) => PRIORITY_RANK(a.priority) - PRIORITY_RANK(b.priority))
    .slice(0, 6);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Today's Events */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-rose-800 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5" />
            Today's Schedule
          </CardTitle>
          <CardDescription>{format(new Date(), "EEEE, MMMM d, yyyy")}</CardDescription>
        </CardHeader>
        <CardContent>
          {todayEvents.length > 0 ? (
            <div className="space-y-3">
              {todayEvents.map((event) => {
                const eventStart = parseISO(event.start_date);
                return (
                  <div key={event.id} className={`p-4 rounded-lg border ${EVENT_COLORS[event.event_type] || EVENT_COLORS.other}`}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{event.title}</h3>
                      <Badge variant="outline" className="text-xs">{event.event_type}</Badge>
                    </div>
                    <p className="text-sm mb-2">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {format(eventStart, "h:mm a")}
                      {event.end_date && ` - ${format(parseISO(event.end_date), "h:mm a")}`}
                    </p>
                    {event.description && <p className="text-sm text-gray-700">{event.description}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <CalendarCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No events scheduled for today</p>
              <p className="text-sm mt-2">Enjoy your free day! ✨</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Horoscope */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="text-purple-800 flex items-center gap-2">
            <Star className="w-5 h-5" />
            Your Daily Horoscope
          </CardTitle>
          <CardDescription className="flex items-center gap-2"><span>♍</span> Virgo</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHoroscope ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-lg text-gray-700 leading-relaxed italic">"{horoscope}"</p>
              <Button onClick={onRefreshHoroscope} variant="outline" size="sm" className="mt-4">
                <Sparkles className="w-4 h-4 mr-2" />
                Get New Reading
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats for Today */}
      <Card className="md:col-span-2 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-rose-800">Today's Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Events Today</p>
              <p className="text-3xl font-bold text-blue-800">{todayEvents.length}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 font-medium">New Inquiries</p>
              <p className="text-3xl font-bold text-green-800">{pendingCount}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Active Enrollments</p>
              <p className="text-3xl font-bold text-purple-800">{activeEnrollmentCount}</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-600 font-medium">On Waitlists</p>
              <p className="text-3xl font-bold text-orange-800">{waitlistedCount}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600 font-medium">Unread Messages</p>
              <p className="text-3xl font-bold text-red-800">{unreadConversationCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Classes This Week */}
      <Card className="md:col-span-2 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-rose-800 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            This Week's Classes
          </CardTitle>
          <CardDescription>All active classes and how full they are</CardDescription>
        </CardHeader>
        <CardContent>
          {activeClassSchedules.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-3">
              {activeClassSchedules.map((schedule) => {
                const activeCount = enrollments.filter((e) => e.class_schedule_id === schedule.id && e.status === "active").length;
                const isFull = schedule.max_students && activeCount >= schedule.max_students;
                return (
                  <div key={schedule.id} className="flex items-center justify-between p-3 rounded-lg border border-rose-100 bg-rose-50/50">
                    <div>
                      <p className="font-medium text-gray-800 capitalize">
                        {schedule.class_name || schedule.day_of_week} <span className="text-gray-500 text-sm">· {schedule.day_of_week}s</span>
                      </p>
                      <p className="text-sm text-gray-600">{schedule.start_time} - {schedule.end_time}</p>
                    </div>
                    <Badge className={isFull ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}>
                      {activeCount}{schedule.max_students ? `/${schedule.max_students}` : ""}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No active classes yet — add one in the Schedule tab</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* This Week's To-Dos */}
      <Card className="md:col-span-2 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-rose-800 flex items-center gap-2">
            <ListPlus className="w-5 h-5" />
            This Week's To-Dos
          </CardTitle>
          <CardDescription>Your open roadmap tasks, prioritised for this week</CardDescription>
        </CardHeader>
        <CardContent>
          {thisWeekTasks.length > 0 ? (
            <div className="space-y-2">
              {thisWeekTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border border-rose-100 bg-rose-50/50">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{task.title}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge className={task.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}>
                        {task.status === "in_progress" ? "In Progress" : "Not Started"}
                      </Badge>
                      <Badge variant="outline" className="capitalize">{task.priority} priority</Badge>
                      {task.due_date && <Badge variant="outline">Due {format(parseISO(task.due_date), "EEE d MMM")}</Badge>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => completeTaskMutation.mutate(task.id)}
                    disabled={completeTaskMutation.isPending}
                    className="text-green-600 hover:text-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Done
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ListPlus className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No open tasks this week — enjoy the breather! ✨</p>
              <p className="text-sm mt-1">Ask your assistant to plan your next roadmap step.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}