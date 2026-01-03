'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/supabase/supabaseClient'
import { useAuth } from '@/context/authcontext'
import { fetchDashboardMetricsProgressive } from '@/supabase/fetches/fetchdashboardmetrics'
import { fetchNewClientsThisMonth, fetchNewLeadsThisMonth, fetchSuccessfulPaymentsThisMonth, fetchLeadSources, fetchProspectsForScatter } from '@/supabase/fetches/fetchdashboardquickmetrics'
import { fetchProspects, Prospect } from '@/supabase/fetches/fetchpeople'
import { fetchClients, Client } from '@/supabase/fetches/fetchpeople'
import { fetchSessions, Session } from '@/supabase/fetches/fetchsessions'
import { fetchPeople } from '@/supabase/fetches/fetchpeople'
import Link from 'next/link'
import CloseRateChart from '@/modules/dashboard/closeratechart'
import ShowRateChart from '@/modules/dashboard/showratechart'
import AverageBookingsChart from '@/modules/dashboard/averagebookingschart'
import AverageBookingsPerDayChart from '@/modules/dashboard/averagebookingsperdaychart'
import HourlyAverageChart from '@/modules/dashboard/hourlyaveragechart'
import ChartSkeleton from '@/modules/dashboard/chartskeleton'
import QuickMetricCard from '@/modules/dashboard/quickmetriccard'
import ToggleRevenueCard from '@/modules/dashboard/togglerevenuecard'
import LeadSourcesChart from '@/modules/dashboard/leadsourceschart'
import { Target, Users, UserPlus, DollarSign, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DateRange, getDateRangeBounds } from '@/supabase/utils/daterange'

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [closeRate, setCloseRate] = useState<number | null>(null)
  const [showRate, setShowRate] = useState<number | null>(null)
  const [averageBookings, setAverageBookings] = useState<number | null>(null)
  const [trainedRevenue, setTrainedRevenue] = useState<number | null>(null)
  const [hourlyAverage, setHourlyAverage] = useState<number | null>(null)
  const [mtdRevenue, setMtdRevenue] = useState<number | null>(null)
  const [projectedRevenue, setProjectedRevenue] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newClients, setNewClients] = useState<number | null>(null)
  const [newLeads, setNewLeads] = useState<number | null>(null)
  const [successfulPayments, setSuccessfulPayments] = useState<number | null>(null)
  const [leadSources, setLeadSources] = useState<Array<{ source: string; count: number }>>([])
  const [prospectsForScatter, setProspectsForScatter] = useState<Array<{ created_at: string; lead_source: string | null }>>([])
  const [loadingQuickMetrics, setLoadingQuickMetrics] = useState(false)
  const [newLeadsList, setNewLeadsList] = useState<Prospect[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [upcomingSessions, setUpcomingSessions] = useState<Array<Session & { personName?: string }>>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>('monthly')

  const handleTrainerGoalsClick = async () => {
    try {
      // Fetch first trainer goal record from trainer_goals table
      const { data: trainerGoals, error: trainerGoalsError } = await supabase
        .from('trainer_goals')
        .select('id')
        .limit(1)

      if (trainerGoalsError) {
        console.error('Error fetching trainer goals:', trainerGoalsError)
        alert('Error loading trainer goals. Please make sure the trainer_goals table exists.')
        return
      }

      if (!trainerGoals || trainerGoals.length === 0) {
        alert('No trainer goals found. Please create a trainer goal record first.')
        return
      }

      // Navigate to first trainer goal's page
      router.push(`/trainer/${trainerGoals[0].id}/goals`)
    } catch (err) {
      console.error('Error fetching trainer goals:', err)
      alert('Error loading trainer goals. Please try again.')
    }
  }

  useEffect(() => {
    const loadMetrics = async () => {
      if (!user) return
      try {
        setError(null)
        const rangeBounds = getDateRangeBounds(dateRange)
        const metrics = await fetchDashboardMetricsProgressive(user.id, rangeBounds)

        // Load all metrics in parallel, update state as each completes
        metrics.closeRate
          .then(value => setCloseRate(value))
          .catch(err => console.error('Error loading close rate:', err))
        
        metrics.showRate
          .then(value => setShowRate(value))
          .catch(err => console.error('Error loading show rate:', err))
        
        metrics.averageBookings
          .then(value => setAverageBookings(value))
          .catch(err => console.error('Error loading average bookings:', err))
        
        metrics.trainedRevenue
          .then(value => setTrainedRevenue(value))
          .catch(err => console.error('Error loading trained revenue:', err))
        
        metrics.hourlyAverage
          .then(value => setHourlyAverage(value))
          .catch(err => console.error('Error loading hourly average:', err))
        
        metrics.mtdRevenue
          .then(value => setMtdRevenue(value))
          .catch(err => console.error('Error loading MTD revenue:', err))
        
        metrics.projectedRevenue
          .then(value => setProjectedRevenue(value))
          .catch(err => console.error('Error loading projected revenue:', err))
      } catch (err) {
        console.error('Error loading dashboard metrics:', err)
        setError('Failed to load dashboard metrics')
      }
    }

    loadMetrics()
  }, [user, dateRange])

  useEffect(() => {
    const loadQuickMetrics = async () => {
      if (!user) return
      setLoadingQuickMetrics(true)
      try {
        const rangeBounds = getDateRangeBounds(dateRange)
        const [clients, leads, payments, sources, prospects] = await Promise.all([
          fetchNewClientsThisMonth(user.id, rangeBounds),
          fetchNewLeadsThisMonth(user.id, rangeBounds),
          fetchSuccessfulPaymentsThisMonth(user.id, rangeBounds),
          fetchLeadSources(user.id),
          fetchProspectsForScatter(user.id),
        ])
        setNewClients(clients)
        setNewLeads(leads)
        setSuccessfulPayments(payments)
        setLeadSources(sources)
        setProspectsForScatter(prospects)
      } catch (err) {
        console.error('Error loading quick metrics:', err)
      } finally {
        setLoadingQuickMetrics(false)
      }
    }

    loadQuickMetrics()
  }, [user, dateRange])

  useEffect(() => {
    const loadNewLeads = async () => {
      if (!user) return
      setLoadingLeads(true)
      try {
        const prospects = await fetchProspects(user.id)
        // Get new leads from this month
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const newLeads = prospects.filter(prospect => {
          const createdDate = new Date(prospect.created_at)
          return createdDate >= startOfMonth && createdDate <= now
        })
        // Sort by most recent first and limit to 5
        setNewLeadsList(newLeads.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 5))
      } catch (err) {
        console.error('Error loading new leads:', err)
      } finally {
        setLoadingLeads(false)
      }
    }

    const loadUpcomingSessions = async () => {
      if (!user) return
      setLoadingSessions(true)
      try {
        const sessions = await fetchSessions(user.id)
        const now = new Date()
        const today = now.toDateString()
        
        console.log('Loading upcoming sessions, current time:', now.toISOString())
        console.log('Today date string:', today)
        console.log('Total sessions:', sessions.length)
        
        // First, let's see all sessions with start_time from today
        const todaySessions = sessions.filter(s => {
          if (!s.start_time) return false
          const startTime = new Date(s.start_time)
          return startTime.toDateString() === today
        })
        console.log('Sessions from today:', todaySessions.length, todaySessions.map(s => ({
          id: s.id,
          start_time: s.start_time,
          status: s.status,
          type: s.type
        })))
        
        // Get upcoming sessions (start_time in the future or today, not cancelled, not completed)
        const upcoming = sessions.filter(session => {
          // Must have start_time
          if (!session.start_time) {
            console.log('❌ No start_time:', session.id, session.type, session.status)
            return false
          }
          
          // Exclude cancelled sessions
          if (session.status === 'canceled_with_charge' || session.status === 'canceled_no_charge') {
            console.log('❌ Cancelled:', session.id, session.status)
            return false
          }
          
          // Exclude completed sessions
          if (session.status === 'completed') {
            console.log('❌ Completed:', session.id)
            return false
          }
          
          // Include sessions that are in the future or today
          const startTime = new Date(session.start_time)
          // Include if start_time is today or in the future
          // Use a more lenient check - include if it's today or any time in the future
          const startDate = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate())
          const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const isToday = startDate.getTime() === nowDate.getTime()
          const isFuture = startTime.getTime() > now.getTime()
          
          const willInclude = isToday || isFuture
          
          if (willInclude) {
            console.log(`✅ Including session ${session.id}:`, {
              start_time: session.start_time,
              startTimeISO: startTime.toISOString(),
              nowISO: now.toISOString(),
              status: session.status,
              isToday,
              isFuture
            })
          } else {
            console.log(`❌ Excluding session ${session.id} - date check:`, {
              start_time: session.start_time,
              startTimeISO: startTime.toISOString(),
              nowISO: now.toISOString(),
              status: session.status,
              isToday,
              isFuture
            })
          }
          
          return willInclude
        })
        
        console.log('Upcoming sessions after filter:', upcoming.length)
        
        // Get all people to map person_id to names
        const people = await fetchPeople({ trainerId: user.id })
        const peopleMap = new Map(people.map(p => [p.id, p.name]))
        
        // Sort by start_time ascending (soonest first) and limit to 7
        const sortedSessions = upcoming
          .map(session => ({
            ...session,
            personName: session.person_id ? peopleMap.get(session.person_id) || 'Unknown' : 'Unknown'
          }))
          .sort((a, b) => {
            const timeA = a.start_time ? new Date(a.start_time).getTime() : 0
            const timeB = b.start_time ? new Date(b.start_time).getTime() : 0
            return timeA - timeB
          })
          .slice(0, 7)
        
        console.log('Setting upcoming sessions:', sortedSessions.length, sortedSessions)
        setUpcomingSessions(sortedSessions)
      } catch (err) {
        console.error('Error loading upcoming sessions:', err)
        setUpcomingSessions([])
      } finally {
        setLoadingSessions(false)
      }
    }

    loadNewLeads()
    loadUpcomingSessions()
  }, [user])

  if (error) {
    return (
      <div className="w-full h-full bg-[var(--bg-primary)] text-[var(--text-primary)] p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-[var(--bg-primary)] text-[var(--text-primary)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button
          onClick={handleTrainerGoalsClick}
          className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer flex items-center gap-2"
        >
          <Target className="h-5 w-5" />
          Trainer Goals
        </Button>
      </div>

      {/* Date Range Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setDateRange('today')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            dateRange === 'today'
              ? 'bg-primary text-primary-foreground'
              : 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-secondary)]'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setDateRange('yesterday')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            dateRange === 'yesterday'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
          }`}
        >
          Yesterday
        </button>
        <button
          onClick={() => setDateRange('weekly')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            dateRange === 'weekly'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
          }`}
        >
          Weekly
        </button>
        <button
          onClick={() => setDateRange('monthly')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            dateRange === 'monthly'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
          }`}
        >
          Monthly
        </button>
      </div>
      
      {/* Quick Metrics Row - Top */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        <QuickMetricCard
          title="New Clients"
          value={newClients}
          icon={<Users className="h-4 w-4" />}
          loading={loadingQuickMetrics}
        />
        <QuickMetricCard
          title="New Leads"
          value={newLeads}
          icon={<UserPlus className="h-4 w-4" />}
          loading={loadingQuickMetrics}
        />
        <QuickMetricCard
          title="Successful Payments"
          value={successfulPayments}
          icon={<DollarSign className="h-4 w-4" />}
          loading={loadingQuickMetrics}
        />
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">
              {dateRange === 'today' ? "Today's Bookings" : 
               dateRange === 'yesterday' ? "Yesterday's Bookings" :
               dateRange === 'weekly' ? "Weekly Bookings" : "Monthly Bookings"}
            </h3>
            <Calendar className="h-4 w-4 text-[var(--text-secondary)]" />
          </div>
          {averageBookings !== null ? (
            <p className="text-2xl font-bold text-[var(--text-primary)]">{averageBookings.toLocaleString()}</p>
          ) : (
            <div className="h-8 bg-[var(--bg-tertiary)] rounded animate-pulse"></div>
          )}
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">Avg Bookings/Day</h3>
            <Calendar className="h-4 w-4 text-[var(--text-secondary)]" />
          </div>
          <AverageBookingsPerDayChart compact />
        </div>
      </div>

      {/* Revenue and Lead Sources Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Toggleable Revenue Card */}
        <ToggleRevenueCard
          mtdRevenue={mtdRevenue}
          projectedRevenue={projectedRevenue}
          trainedRevenue={trainedRevenue}
          dateRange={dateRange}
          trainerId={user?.id}
        />

        {/* Lead Sources Chart */}
        <LeadSourcesChart sources={leadSources} prospects={prospectsForScatter} loading={loadingQuickMetrics} dateRange={dateRange} />
      </div>

      {/* Bottom Row: All Other Metrics - Close Rate, Show Rate, Hourly Average, Tasks, and Upcoming Sessions */}
      <div className="flex items-start justify-start gap-4">
        {/* Compressed Dials Section - Takes up more space */}
        <div className="flex items-center gap-6" style={{ width: 'calc(50% - 0.5rem)' }}>
          {closeRate !== null ? (
            <CloseRateChart closeRate={closeRate} />
          ) : (
            <div className="w-[100px] h-[130px] flex items-center justify-center">
              <div className="h-24 w-24 bg-[var(--bg-tertiary)] rounded-full animate-pulse"></div>
            </div>
          )}
          {showRate !== null ? (
            <ShowRateChart showRate={showRate} />
          ) : (
            <div className="w-[100px] h-[130px] flex items-center justify-center">
              <div className="h-24 w-24 bg-[var(--bg-tertiary)] rounded-full animate-pulse"></div>
            </div>
          )}
          {hourlyAverage !== null ? (
            <HourlyAverageChart hourlyAverage={hourlyAverage} />
          ) : (
            <div className="w-[100px] h-[130px] flex items-center justify-center">
              <div className="h-16 w-16 bg-[var(--bg-tertiary)] rounded animate-pulse"></div>
            </div>
          )}
        </div>
        
        {/* Tasks Section - Compact */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 flex-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Tasks</h2>
            <Link
              href="/tasks"
              className="text-xs text-orange-500 hover:text-orange-600 transition-colors cursor-pointer flex items-center gap-1"
            >
              See All →
            </Link>
          </div>
          <div className="text-[var(--text-secondary)] text-xs">No tasks available</div>
        </div>

        {/* Upcoming Sessions Section - Compact */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4 flex-1">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Upcoming Sessions</h2>
          </div>
          {loadingSessions ? (
            <div className="text-[var(--text-secondary)] text-xs">Loading...</div>
          ) : upcomingSessions.length === 0 ? (
            <div className="text-[var(--text-secondary)] text-xs">No upcoming sessions</div>
          ) : (
            <>
              <div className="space-y-2">
                {upcomingSessions.map((session) => {
                  const startTime = session.start_time ? new Date(session.start_time) : null
                  const now = new Date()
                  let timeUntil = ''
                  
                  if (startTime) {
                    const diffMs = startTime.getTime() - now.getTime()
                    const diffMins = Math.floor(diffMs / 60000)
                    const diffHours = Math.floor(diffMs / 3600000)
                    const diffDays = Math.floor(diffMs / 86400000)
                    
                    if (diffMins < 60) {
                      timeUntil = `In ${diffMins} min${diffMins !== 1 ? 's' : ''}`
                    } else if (diffHours < 24) {
                      timeUntil = `In ${diffHours} hr${diffHours !== 1 ? 's' : ''}`
                    } else {
                      timeUntil = `In ${diffDays} day${diffDays !== 1 ? 's' : ''}`
                    }
                  } else {
                    timeUntil = 'TBD'
                  }
                  
                  return (
                    <Link
                      key={session.id}
                      href={`/events/${session.id}`}
                      className="flex items-center gap-3 p-2 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-blue-400">
                          {session.personName?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-blue-400 transition-colors">
                          {session.personName || 'Unknown'} - {session.type}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">{timeUntil}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border-primary)]">
                <Link
                  href="/calendar"
                  className="text-xs text-orange-500 hover:text-orange-600 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  See all sessions →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
