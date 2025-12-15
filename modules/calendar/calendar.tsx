'use client'

import { supabase } from '@/supabase/supabaseClient'
import React, { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput, DateSelectArg } from '@fullcalendar/core'
import { useRouter } from 'next/navigation'
import { fetchSessions, Session } from '@/supabase/fetches/fetchsessions'
import { fetchClients } from '@/supabase/fetches/fetchpeople'
import { fetchProspects } from '@/supabase/fetches/fetchpeople'

export default function Calendar() {
  const [events, setEvents] = useState<EventInput[]>([])
  const router = useRouter()

  useEffect(() => {
    const loadSessions = async () => {
      const sessions = await fetchSessions()
      const clients = await fetchClients()
      const prospects = await fetchProspects()
      
      // Create a map for quick lookup
      const clientMap = new Map(clients.map(c => [c.id, c.name]))
      const prospectMap = new Map(prospects.map(p => [p.id, p.name]))
      
      setEvents(
        sessions
          .filter((s: Session) => s.start_time && s.status !== 'canceled_with_charge' && s.status !== 'canceled_no_charge') // Only include non-cancelled sessions with start times
          .map((s: Session) => {
            // Generate title from type and person name
            let personName = 'Unknown'
            if (s.person_id) {
              // Check if it's a client or prospect by looking up in the appropriate map
              personName = clientMap.get(s.person_id) || prospectMap.get(s.person_id) || 'Unknown'
            }
            
            return {
              id: s.id,
              title: `${s.type} - ${personName}`,
              start: s.start_time!,
              end: s.end_time || new Date(
                new Date(s.start_time!).getTime() + 60 * 60000 // Default 60 minutes if no end_time
              ).toISOString(),
            }
          })
      )
    }

    loadSessions()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('sessions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => loadSessions())
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
