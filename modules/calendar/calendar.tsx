'use client'

import { supabase } from '@/supabase/supabaseClient'
import React, { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput, DateSelectArg } from '@fullcalendar/core'
import { useRouter } from 'next/navigation'
import { fetchEvents, CalendarEvent } from '@/supabase/fetches/fetchevents'

export default function Calendar() {
  const [events, setEvents] = useState<EventInput[]>([])
  const router = useRouter()

  useEffect(() => {
    const loadEvents = async () => {
      const data = await fetchEvents()
      setEvents(
        data.map((e: CalendarEvent) => ({
          id: e.id,
          title: e.title,
          start: e.start_time,
          end: new Date(
            new Date(e.start_time).getTime() + e.duration_minutes * 60000
          ).toISOString(),
        }))
      )
    }

    loadEvents()

    // Optional: subscribe to real-time updates
    const channel = supabase
      .channel('events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => loadEvents())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    console.log('Selected date range:', selectInfo.startStr, selectInfo.endStr)
    // Trigger Add Event dialog here
  }

  return (
    <div className="p-4 bg-gray-800 rounded shadow text-white h-full">
      <style jsx global>{`
        .fc-event {
          cursor: pointer;
        }
        .fc-event:hover {
          opacity: 0.8;
        }
      `}</style>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        selectable
        selectMirror
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        select={handleDateSelect}
        eventClick={(info) => {
          if (info.event.id) {
            router.push(`/events/${info.event.id}`)
          }
        }}
        height="auto"
        themeSystem="standard"
      />
    </div>
  )
}
