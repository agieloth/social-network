import { useState, useEffect } from 'react'

export default function InviteModal({ showInviteForm, setShowInviteForm, groupId }) {
  const [invitableMembers, setInvitableMembers] = useState([])
  const [invitingMemberId, setInvitingMemberId] = useState(null)

  useEffect(() => {
    if (showInviteForm) {
      fetchInvitableMembers()
    }
  }, [showInviteForm])

  const fetchInvitableMembers = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/invitable_members`, {
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to fetch invitable members')
      const data = await res.json()
      setInvitableMembers(data)
    } catch (err) {
      console.error('Error fetching invitable members:', err)
    }
  }

  const handleInviteMember = async (memberId) => {
    setInvitingMemberId(memberId)
    try {
      const res = await fetch(`/api/groups/${groupId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: memberId }),
        credentials: 'include'
      })

      if (!res.ok) throw new Error('Failed to send invitation')
      
      setInvitableMembers(prev => prev.filter(member => member.id !== memberId))
    } catch (err) {
      console.error('Error inviting member:', err)
    } finally {
      setInvitingMemberId(null)
    }
  }

  if (!showInviteForm) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-bold text-white mb-4">Invite Members</h2>
        
        {invitableMembers && invitableMembers.length > 0 ? (
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto">
              {invitableMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                      {member.username.charAt(0)}
                    </div>
                    <span className="text-white">{member.name}</span>
                  </div>
                  <button
                    onClick={() => handleInviteMember(member.id)}
                    disabled={invitingMemberId === member.id}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {invitingMemberId === member.id ? 'Inviting...' : 'Invite'}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">No members available to invite</p>
            <button
              onClick={() => setShowInviteForm(false)}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}