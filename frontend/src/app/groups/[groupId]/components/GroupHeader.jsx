export default function GroupHeader({ group }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 mb-6 border border-gray-700/50">
      <h1 className="text-3xl font-bold text-white mb-2">{group.title}</h1>
      <p className="text-gray-300 mb-4">{group.description}</p>

      <div className="flex items-center space-x-4 text-sm text-gray-400">
        <span>👥 {group.member_count} members</span>
        <span>🕒 Created {new Date(group.created_at).toLocaleDateString()}</span>
        {group.is_creator && (
          <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs">
            Admin
          </span>
        )}
      </div>
    </div>
  )
}