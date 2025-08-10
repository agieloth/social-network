'use client'
import React, { useEffect, useState } from 'react'
import { useRouter, redirect } from 'next/navigation'
import { use } from 'react'
import { useSharedWorker } from '../../../contexts/SharedWorkerContext'
import { useAuth } from '../../../contexts/AuthContext'
import GroupHeader from './components/GroupHeader'
import GroupTabs from './components/GroupTabs'
import PostsTab from './components/PostsTab'
import EventsTab from './components/EventsTab'
import MembersTab from './components/MembersTab'
import GroupChat from './components/GroupChat'
import PostFormModal from './components/PostFormModal'
import EventFormModal from './components/EventFormModal'
import InviteModal from './components/InviteModal'
import PendingRequests from '../components/PendingRequests'
import JoinStatus from './components/JoinStatus'

export default function GroupDetailPage({ params }) {
    // All hooks at the top (no conditional returns above this)
  const { groupId } = use(params)
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('posts')
  const [showGroupChat, setShowGroupChat] = useState(false)
  const [showPostForm, setShowPostForm] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)

  const { user } = useAuth()
  const { sendWorkerMessage } = useSharedWorker()
  const router = useRouter()

  // Handle redirect in useEffect
  useEffect(() => {
    if (!user && !loading) {
      redirect("/login")
    }
  }, [user, loading])

  const handleJoin = async (e) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/groups/${groupId}/membership/join`, {
        method: 'POST',
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to join group')

      const refreshRes = await fetch(`/api/groups/${groupId}`)
      if (refreshRes.ok) {
        setGroup(await refreshRes.json())
      }
    } catch (err) {
      console.error('Error joining group:', err)
    }
  }

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}`)
        if (!res.ok) throw new Error('Failed to fetch group')
        const data = await res.json()
        setGroup(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchGroup()
  }, [groupId])

  // Only show loading/error states after auth check
  if (loading || !user) return <LoadingState />
  if (error) return <ErrorState error={error} />

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="max-w-4xl mx-auto p-4 pt-24">
        <GroupHeader group={group} />

        <JoinStatus group={group} handleJoin={handleJoin} />

        <GroupTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCreator={group.is_creator}
        />

        <div className="space-y-4">
          {activeTab === 'posts' && (
            <PostsTab
              group={group}
              showPostForm={showPostForm}
              setShowPostForm={setShowPostForm}
            />
          )}

          {activeTab === 'events' && (
            <EventsTab
              group={group}
              showEventForm={showEventForm}
              setShowEventForm={setShowEventForm}
            />
          )}

          {activeTab === 'requests' && group.is_creator && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <PendingRequests groupId={group.id} />
            </div>
          )}

          {activeTab === 'members' && group.is_creator && (
            <MembersTab
              group={group}
              showInviteForm={showInviteForm}
              setShowInviteForm={setShowInviteForm}
            />
          )}
        </div>
      </div>

      <GroupChat
        showGroupChat={showGroupChat}
        setShowGroupChat={setShowGroupChat}
        group={group}
      />

      <PostFormModal
        showPostForm={showPostForm}
        setShowPostForm={setShowPostForm}
        groupId={groupId}
      />

      <EventFormModal
        showEventForm={showEventForm}
        setShowEventForm={setShowEventForm}
        groupId={groupId}
      />

      <InviteModal
        showInviteForm={showInviteForm}
        setShowInviteForm={setShowInviteForm}
        groupId={groupId}
      />
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-800 rounded w-1/2"></div>
          <div className="h-6 bg-gray-800 rounded w-3/4"></div>
          <div className="h-40 bg-gray-800 rounded"></div>
        </div>
      </div>
    </div>
  )
}

function ErrorState({ error }) {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 text-red-500">
        {error}
      </div>
    </div>
  )
}