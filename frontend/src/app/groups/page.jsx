'use client'
import { useState, useEffect } from 'react'
import GroupList from './components/GroupList'
import CreateGroupModal from './components/CreateGroupModal'
import { useAuth } from '../../contexts/AuthContext'
import { redirect } from 'next/navigation'

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-800 rounded w-1/2 mx-auto"></div>
          <div className="h-6 bg-gray-800 rounded w-1/3 mx-auto"></div>
          <div className="h-40 bg-gray-800 rounded mt-8"></div>
        </div>
      </div>
    </div>
  )
}

function ErrorState({ error }) {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 text-red-500">
        {error}
      </div>
    </div>
  )
}

export default function GroupsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Simulate loading completion
    const timer = setTimeout(() => {
      setLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!user && !loading) {
      redirect("/login")
    }
  }, [user, loading])

  if (loading || !user) return <LoadingState />
  if (error) return <ErrorState error={error} />

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        {/* Header with animated gradient */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
            Your Communities
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Connect, share, and grow with like-minded people
          </p>
        </div>
        
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <svg
              className="w-5 h-5 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Create New Group
          </button>
        </div>
        
        {/* Group List */}
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
          <GroupList />
        </div>
      </div>
      
      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          fetchGroups={() => {/* Add your group refresh logic here */ }}
        />
      )}
    </div>
  )
}