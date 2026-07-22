import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock } from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';

const EVENT_COLORS = {
  class: 'bg-blue-100 border-blue-300 text-blue-800',
  other: 'bg-gray-100 border-gray-300 text-gray-800',
};

export default function UpcomingEvents() {
  const { data: events = [] } = useQuery({
    queryKey: ['memberCalendarEvents'],
    queryFn: () => base44.entities.CalendarEvent.filter({ visible_to_members: true }),
  });

  const upcoming = events
    .filter((e) => e.status !== 'cancelled' && isAfter(parseISO(e.end_date || e.start_date), new Date()))
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 10);

  return (
    <Card className="bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-rose-800 flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          Upcoming Events
        </CardTitle>
        <CardDescription>Classes, workshops, and social events</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.map((event) => {
          const start = parseISO(event.start_date);
          return (
            <div key={event.id} className={`p-3 rounded-lg border ${EVENT_COLORS[event.event_type] || EVENT_COLORS.other}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{event.title}</p>
                <Badge variant="outline" className="text-xs capitalize">{event.event_type}</Badge>
              </div>
              <p className="text-sm flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" />
                {format(start, 'EEE, MMM d')} · {format(start, 'h:mm a')}
              </p>
              {event.description && <p className="text-sm mt-1">{event.description}</p>}
            </div>
          );
        })}
        {upcoming.length === 0 && (
          <p className="text-center text-gray-500 py-8 text-sm">No upcoming events scheduled right now</p>
        )}
      </CardContent>
    </Card>
  );
}
