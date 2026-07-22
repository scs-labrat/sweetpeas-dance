import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Plus, Edit, Trash2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO, isWithinInterval, startOfDay } from 'date-fns';

const EVENT_COLORS = {
  class: 'bg-blue-100 border-blue-300 text-blue-800',
  meeting: 'bg-purple-100 border-purple-300 text-purple-800',
  reminder: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  deadline: 'bg-red-100 border-red-300 text-red-800',
  other: 'bg-gray-100 border-gray-300 text-gray-800',
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6 AM to 7 PM

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);
  const queryClient = useQueryClient();

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    event_type: 'other',
    status: 'scheduled',
    visible_to_members: true
  });

  const { data: events = [] } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: () => base44.entities.CalendarEvent.list('-start_date'),
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['calendarEvents']);
      setShowEventDialog(false);
      resetForm();
      toast.success('Event created successfully');
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalendarEvent.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['calendarEvents']);
      setShowEventDialog(false);
      resetForm();
      toast.success('Event updated successfully');
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['calendarEvents']);
      setShowEventDialog(false);
      toast.success('Event deleted successfully');
    },
  });

  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      event_type: 'other',
      status: 'scheduled',
      visible_to_members: true
    });
    setSelectedEvent(null);
    setSelectedDate(null);
    setSelectedHour(null);
  };

  const handleSaveEvent = () => {
    if (selectedEvent) {
      updateEventMutation.mutate({ id: selectedEvent.id, data: eventForm });
    } else {
      createEventMutation.mutate(eventForm);
    }
  };

  const openNewEventDialog = (date, hour = null) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    const startTime = hour !== null ? `${String(hour).padStart(2, '0')}:00` : '09:00';
    const endTime = hour !== null ? `${String(hour + 1).padStart(2, '0')}:00` : '10:00';
    
    setEventForm({
      ...eventForm,
      start_date: `${format(date, 'yyyy-MM-dd')}T${startTime}`,
      end_date: `${format(date, 'yyyy-MM-dd')}T${endTime}`,
    });
    setShowEventDialog(true);
  };

  const openEditEventDialog = (event) => {
    setSelectedEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      start_date: event.start_date,
      end_date: event.end_date,
      event_type: event.event_type,
      status: event.status,
      visible_to_members: event.visible_to_members !== false,
    });
    setShowEventDialog(true);
  };

  // Week view calculations
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Month view calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return isSameDay(eventDate, day);
    });
  };

  const getEventsForTimeSlot = (day, hour) => {
    return events.filter(event => {
      const eventStart = parseISO(event.start_date);
      const eventEnd = parseISO(event.end_date);
      const slotStart = new Date(day);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(day);
      slotEnd.setHours(hour + 1, 0, 0, 0);
      
      return (
        isWithinInterval(eventStart, { start: slotStart, end: slotEnd }) ||
        isWithinInterval(slotStart, { start: eventStart, end: eventEnd })
      );
    });
  };

  const navigateCalendar = (direction) => {
    if (viewMode === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateCalendar('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-2xl">
                {viewMode === 'week' 
                  ? `Week of ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
                  : format(currentDate, 'MMMM yyyy')
                }
              </CardTitle>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateCalendar('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={viewMode} onValueChange={setViewMode}>
                <TabsList>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                onClick={() => openNewEventDialog(new Date())}
                className="bg-rose-600 hover:bg-rose-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'week' ? (
            /* Weekly View with Hours */
            <div className="border rounded-lg overflow-hidden">
              {/* Header with days */}
              <div className="grid grid-cols-8 border-b bg-gray-50">
                <div className="p-2 border-r text-xs font-semibold text-gray-500">Time</div>
                {weekDays.map(day => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div 
                      key={day.toString()} 
                      className={`p-2 text-center border-r last:border-r-0 ${isToday ? 'bg-rose-100' : ''}`}
                    >
                      <div className={`text-xs font-semibold ${isToday ? 'text-rose-700' : 'text-gray-600'}`}>
                        {format(day, 'EEE')}
                      </div>
                      <div className={`text-lg font-bold ${isToday ? 'text-rose-600' : 'text-gray-900'}`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time slots */}
              <div className="max-h-[600px] overflow-y-auto">
                {HOURS.map(hour => (
                  <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
                    <div className="p-2 border-r text-xs text-gray-500 bg-gray-50">
                      {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
                    </div>
                    {weekDays.map(day => {
                      const slotEvents = getEventsForTimeSlot(day, hour);
                      const isToday = isSameDay(day, new Date());
                      
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className={`p-1 border-r last:border-r-0 min-h-[60px] cursor-pointer transition-colors ${
                            isToday ? 'bg-rose-50/50' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => openNewEventDialog(day, hour)}
                        >
                          <div className="space-y-1">
                            {slotEvents.map(event => {
                              const eventStart = parseISO(event.start_date);
                              const eventHour = eventStart.getHours();
                              const eventMinute = eventStart.getMinutes();
                              
                              return (
                                <div
                                  key={event.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditEventDialog(event);
                                  }}
                                  className={`text-xs px-2 py-1 rounded border ${EVENT_COLORS[event.event_type]} truncate hover:opacity-80 transition-opacity`}
                                >
                                  <div className="font-medium">{format(eventStart, 'h:mm a')}</div>
                                  <div className="truncate">{event.title}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Monthly View */
            <div>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {monthDays.map(day => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={day.toString()}
                      className={`min-h-[100px] border rounded-lg p-2 ${
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${isToday ? 'border-rose-400 border-2' : 'border-gray-200'} hover:border-rose-300 transition-colors cursor-pointer`}
                      onClick={() => openNewEventDialog(day)}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      } ${isToday ? 'text-rose-600 font-bold' : ''}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditEventDialog(event);
                            }}
                            className={`text-xs px-2 py-1 rounded border ${EVENT_COLORS[event.event_type]} truncate hover:opacity-80 transition-opacity`}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-gray-500 px-2">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? 'Edit Event' : 'Create New Event'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-title">Event Title</Label>
              <Input
                id="event-title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="Enter event title"
              />
            </div>
            <div>
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Enter event description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-start-date">Start Date & Time</Label>
                <Input
                  id="event-start-date"
                  type="datetime-local"
                  value={eventForm.start_date}
                  onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="event-end-date">End Date & Time</Label>
                <Input
                  id="event-end-date"
                  type="datetime-local"
                  value={eventForm.end_date}
                  onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="event-type">Event Type</Label>
              <Select
                value={eventForm.event_type}
                onValueChange={(value) => setEventForm({ ...eventForm, event_type: value })}
              >
                <SelectTrigger id="event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class">Class</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="event-status">Status</Label>
              <Select
                value={eventForm.status}
                onValueChange={(value) => setEventForm({ ...eventForm, status: value })}
              >
                <SelectTrigger id="event-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="event-visible-to-members"
              type="checkbox"
              checked={eventForm.visible_to_members}
              onChange={(e) => setEventForm({ ...eventForm, visible_to_members: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="event-visible-to-members">Show on member portal's Upcoming Events</Label>
          </div>
          <DialogFooter className="gap-2">
            {selectedEvent && (
              <Button
                variant="destructive"
                onClick={() => deleteEventMutation.mutate(selectedEvent.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEvent} className="bg-rose-600 hover:bg-rose-700">
              {selectedEvent ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}