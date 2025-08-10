import { useState, useEffect } from 'react'

export default function EventsTab({ group, showEventForm, setShowEventForm }) {
  const [events, setEvents] = useState([])

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(`/api/groups/${group.id}/events`)
        if (!res.ok) throw new Error('Failed to fetch events')
        const data = await res.json()
        setEvents(data || [])
      } catch (err) {
        console.error('Failed to fetch events', err)
      }
    }

    fetchEvents()
  }, [group.id])

  const handleVote = async (eventId, response) => {
    try {
      const res = await fetch(`/api/groups/${group.id}/events/${eventId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response }),
        credentials: 'include'
      })

      if (!res.ok) throw new Error('Failed to submit response')
      fetchEvents()
    } catch (err) {
      console.error('Error submitting response:', err)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowEventForm(true)}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        Create Event
      </button>

      <div className="space-y-4">
        {events.length > 0 ? (
          events.map(event => (
            <EventItem 
              key={event.id}
              event={event}
              isCreator={group.is_creator}
              onVote={handleVote}
            />
          ))
        ) : (
          <EmptyEvents setShowEventForm={setShowEventForm} />
        )}
      </div>
    </>
  )
}

function EventItem({ event, isCreator, onVote }) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 hover:border-gray-600 transition-all duration-200">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold text-white">{event.title}</h3>
          {isCreator && (
            <span className="bg-purple-600/30 text-purple-300 px-2 py-1 rounded text-xs">
              Organizer
            </span>
          )}
        </div>

        <p className="text-gray-300">{event.description}</p>

        <EventDetails event={event} />
        <VotingSection event={event} onVote={onVote} />
      </div>
    </div>
  )
}

function EventDetails({ event }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <div className="flex items-center text-blue-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {new Date(event.event_date).toLocaleString([], {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>

      <div className="flex items-center text-green-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        {event.creator_name}
      </div>
    </div>
  )
}

function VotingSection({ event, onVote }) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-700">
      <div className="flex items-center gap-4">
        <VoteButton 
          type="going"
          event={event}
          onVote={onVote}
        />
        <VoteButton 
          type="not_going"
          event={event}
          onVote={onVote}
        />
      </div>
    </div>
  )
}

function VoteButton({ type, event, onVote }) {
  const isActive = event.user_response === type
  const count = type === 'going' ? event.going_count : event.not_going_count
  
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onVote(event.id, type)}
        className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${
          isActive
            ? type === 'going'
              ? 'bg-green-600/20 text-green-400 border border-green-600/50'
              : 'bg-red-600/20 text-red-400 border border-red-600/50'
            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 border border-gray-600/50'
        }`}
      >
        {type === 'going' ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Going
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Not Going
          </>
        )}
      </button>
      <span className="text-gray-300 text-sm px-2 py-1 bg-gray-700/50 rounded-lg">
        {count || 0}
      </span>
    </div>
  )
}

function EmptyEvents({ setShowEventForm }) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-8 text-center border border-gray-700/50">
      <div className="flex flex-col items-center justify-center space-y-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-400">No events yet</h3>
        <p className="text-gray-500">Be the first to create an event!</p>
        <button
          onClick={() => setShowEventForm(true)}
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Event
        </button>
      </div>
    </div>
  )
}