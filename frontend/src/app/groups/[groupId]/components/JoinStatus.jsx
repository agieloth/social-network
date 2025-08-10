export default function JoinStatus({ group, handleJoin }) {
  if (!group.is_member && !group.is_pending && !group.is_creator) {
    return (
      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
        <p className="text-blue-300">You're not a member of this group</p>
        <button
          onClick={handleJoin}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Join Group
        </button>
      </div>
    )
  }

  if (group.is_pending) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
        <p className="text-yellow-300">Your join request is pending approval</p>
      </div>
    )
  }

  return null
}