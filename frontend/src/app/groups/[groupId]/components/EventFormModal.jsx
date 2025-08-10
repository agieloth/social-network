import { useState } from 'react'

export default function EventFormModal({ showEventForm, setShowEventForm, groupId }) {
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    eventDate: ''
  })
  const [creatingEvent, setCreatingEvent] = useState(false)

  const handleEventSubmit = async (e) => {
    e.preventDefault()
    setCreatingEvent(true)

    try {
      const requestBody = {
        group_id: parseInt(groupId),
        title: eventForm.title,
        description: eventForm.description,
        event_date: new Date(eventForm.eventDate).toISOString()
      }

      const res = await fetch(`/api/groups/${groupId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error('Failed to create event: ' + errorText)
      }

      setEventForm({
        title: '',
        description: '',
        eventDate: ''
      })
      setShowEventForm(false)
    } catch (err) {
      console.error('Error creating event:', err)
    } finally {
      setCreatingEvent(false)
    }
  }

  const handleEventChange = (e) => {
    const { name, value } = e.target
    setEventForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (!showEventForm) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
        <form onSubmit={handleEventSubmit} className="space-y-4">
          <h2 className="text-xl font-bold text-white mb-4">Create New Event</h2>

          <FormField
            label="Event Title"
            id="title"
            name="title"
            value={eventForm.title}
            onChange={handleEventChange}
            required
          />

          <FormField
            label="Description"
            id="description"
            name="description"
            value={eventForm.description}
            onChange={handleEventChange}
            textarea
            required
          />

          <FormField
            label="Event Date & Time"
            id="eventDate"
            name="eventDate"
            type="datetime-local"
            value={eventForm.eventDate}
            onChange={handleEventChange}
            required
          />

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowEventForm(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              disabled={creatingEvent}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              disabled={creatingEvent}
            >
              {creatingEvent ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FormField({ label, id, name, value, onChange, type = 'text', textarea = false, required = false }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
        {label}
      </label>
      {textarea ? (
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          rows={3}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required={required}
        />
      ) : (
        <input
          type={type}
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required={required}
        />
      )}
    </div>
  )
}