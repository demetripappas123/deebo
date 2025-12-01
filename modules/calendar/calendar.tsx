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
    <div className="p-4 bg-[#111111] rounded shadow text-white h-full">
      <style jsx global>{`
        /* Calendar container */
        .fc {
          background-color: #111111 !important;
          color: white !important;
        }
        
        /* Header toolbar */
        .fc-header-toolbar {
          background-color: #111111 !important;
          color: white !important;
          border-color: #2a2a2a !important;
        }
        
        .fc-toolbar-title {
          color: white !important;
        }
        
        /* Buttons */
        .fc-button {
          background-color: #333333 !important;
          border-color: #2a2a2a !important;
          color: white !important;
        }
        
        .fc-button:hover {
          background-color: #404040 !important;
          border-color: #2a2a2a !important;
        }
        
        .fc-button-active {
          background-color: #4a4a4a !important;
          border-color: #2a2a2a !important;
        }
        
        .fc-button:disabled {
          background-color: #1a1a1a !important;
          border-color: #2a2a2a !important;
          color: #666666 !important;
        }
        
        /* Calendar grid */
        .fc-daygrid {
          background-color: #111111 !important;
        }
        
        .fc-col-header {
          background-color: #111111 !important;
        }
        
        .fc-col-header-cell {
          background-color: #111111 !important;
          color: white !important;
          border-color: #2a2a2a !important;
        }
        
        .fc-col-header-cell-cushion {
          color: white !important;
        }
        
        /* Day cells */
        .fc-daygrid-day {
          background-color: #111111 !important;
          border-color: #2a2a2a !important;
        }
        
        .fc-daygrid-day-frame {
          background-color: #111111 !important;
        }
        
        .fc-daygrid-day-top {
          color: white !important;
        }
        
        .fc-daygrid-day-number {
          color: white !important;
        }
        
        .fc-day-today {
          background-color: #1a1a1a !important;
        }
        
        /* Events */
        .fc-event {
          cursor: pointer;
          border-color: #444444 !important;
        }
        
        .fc-event:hover {
          opacity: 0.8;
        }
        
        .fc-event-title {
          color: white !important;
        }
        
        .fc-event-time {
          color: #cccccc !important;
        }
        
        /* Time grid */
        .fc-timegrid {
          background-color: #111111 !important;
        }
        
        .fc-timegrid-slot {
          border-color: #2a2a2a !important;
        }
        
        .fc-timegrid-slot-label {
          color: white !important;
          border-color: #2a2a2a !important;
        }
        
        .fc-timegrid-axis {
          border-color: #2a2a2a !important;
          color: white !important;
        }
        
        .fc-timegrid-col {
          border-color: #2a2a2a !important;
        }
        
        /* Selected/highlighted */
        .fc-highlight {
          background-color: #2a2a2a !important;
        }
        
        /* Scrollbar styling */
        .fc-scroller::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .fc-scroller::-webkit-scrollbar-track {
          background: #111111;
        }
        
        .fc-scroller::-webkit-scrollbar-thumb {
          background: #444444;
          border-radius: 4px;
        }
        
        .fc-scroller::-webkit-scrollbar-thumb:hover {
          background: #555555;
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
