import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface MatchEvent {
  id: string
  transactionId: string
  guarantorName: string
  matchType: 'AUTO' | 'MANUAL' | 'OVERRIDE'
  timestamp: string
}

/**
 * Hook that subscribes to real-time changes on transaction_guarantors
 * to detect new matches as they happen.
 */
export function useRealtimeMatches() {
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const clearEvents = useCallback(() => setEvents([]), [])

  useEffect(() => {
    const channel = supabase
      .channel('match-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transaction_guarantors',
        },
        (payload) => {
          const newMatch: MatchEvent = {
            id: payload.new.id,
            transactionId: payload.new.transaction_id,
            guarantorName: payload.new.guarantor_name,
            matchType: payload.new.match_type,
            timestamp: new Date().toISOString(),
          }
          setEvents((prev) => [newMatch, ...prev].slice(0, 50))
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { events, isConnected, clearEvents }
}
