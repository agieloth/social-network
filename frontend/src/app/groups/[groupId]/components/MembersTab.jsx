export default function MembersTab({ group, showInviteForm, setShowInviteForm }) {
  return (
    <>
      <button
        onClick={() => setShowInviteForm(true)}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        Invite Members
      </button>

      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
        <h3 className="text-xl font-bold text-white mb-4">Group Members</h3>
        {group.members && group.members.length > 0 ? (
          <div className="space-y-3">
            {group.members.map(member => (
              <MemberItem key={member.id} member={member} />
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No members in this group yet</p>
        )}
      </div>
    </>
  )
}

function MemberItem({ member }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
      <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
        {member.name.charAt(0)}
      </div>
      <div>
        <p className="text-white">{member.name}</p>
        <p className="text-xs text-gray-400">
          Joined {new Date(member.joined_at).toLocaleDateString()}
          {member.is_admin && (
            <span className="ml-2 bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded text-xs">
              Admin
            </span>
          )}
        </p>
      </div>
    </div>
  )
}