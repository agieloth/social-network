/* /home/helbadao/social-network/frontend/src/app/groups/[groupId]/page.jsx */

'use client'
import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../home/components/Navbar'
import PendingRequests from '../components/PendingRequests'
import PostForm from '../../home/components/PostForm'
import { use } from 'react'
import { useSharedWorker } from '../../../contexts/SharedWorkerContext'
import styles from './GroupsPage.module.css'

export default function GroupDetailPage({ params }) {
  // Group and UI state
  const { groupId } = use(params)
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('posts')
  const [showGroupChat, setShowGroupChat] = useState(false)
  const [showPostForm, setShowPostForm] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)

  // Content state
  const [posts, setPosts] = useState([])
  const [events, setEvents] = useState([])
  const [content, setContent] = useState('')
  const [image, setImage] = useState(null)
  const [creating, setCreating] = useState(false)
  const [creatingEvent, setCreatingEvent] = useState(false)

  // Comment state
  const [comments, setComments] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [loadingComments, setLoadingComments] = useState({})
  const [postingComment, setPostingComment] = useState({})

  // Chat state
  const [groupChatInput, setGroupChatInput] = useState('')
  const [groupChatMessages, setGroupChatMessages] = useState([])
  const [userId, setUserId] = useState(null)

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    eventDate: ''
  })

  // Other hooks and refs
  const router = useRouter()
  const fileInputRef = useRef()
  const [chatUsers, setChatUsers] = useState([])
  const [realtimeNotification, setRealtimeNotification] = useState(null)

  // Shared Worker Context
  const { isConnected, sendMessage } = useSharedWorker()

  // Get current user ID
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include'
        })
        if (res.ok) {
          const user = await res.json()
          setUserId(user.id)
        } else {
          console.error('Failed to fetch user ID')
        }
      } catch (err) {
        console.error('Error fetching user ID:', err)
      }
    }

    fetchUserId()
  }, [])

  // Handle incoming messages from the shared worker
  useEffect(() => {
    if (!userId) return

    const messageHandler = (event) => {
      const { type, data } = event.data

      switch (type) {
        case 'group_message':
          if (data.group_id === parseInt(groupId)) {
            setGroupChatMessages(prev => [...prev, {
              ...data,
              isCurrentUser: data.sender_id === userId
            }])
          }
          break
        case 'notification':
          setRealtimeNotification(data)
          break
        case 'status':
          // Connection status updates are already handled by the context
          break
        default:
          console.log('Unknown message type:', type)
      }
    }

    // This assumes your SharedWorkerContext exposes a way to listen to messages
    // You might need to modify the context to add this functionality
    const cleanup = () => {
      // Cleanup logic if needed
    }

    return cleanup
  }, [groupId, userId])

  // Send group chat message through shared worker
  const sendGroupChatMessage = () => {
    if (!groupChatInput.trim() || !isConnected || !userId) return

    const message = {
      type: "group_message",
      groupId: parseInt(groupId),
      from: userId,
      content: groupChatInput.trim(),
      timestamp: new Date().toISOString()
    }
    sendMessage(message)

    // Optimistically update UI
    setGroupChatMessages(prev => [...prev, {
      ...message,
      sender_name: 'You',
      isCurrentUser: true
    }])

    setGroupChatInput('')
  }

  // Handle key press in chat input
  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendGroupChatMessage()
    }
  }

  const togglePostForm = () => {
    setShowPostForm(prev => !prev)
  }

  const toggleEventForm = () => {
    setShowEventForm(prev => !prev)
  }

  const handleNotificationRemoved = () => {
    setRealtimeNotification(null)
  }

  const handleVote = async (eventId, response) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/events/${eventId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response }),
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to submit response');
      fetchEvents();
    } catch (err) {
      console.error('Error submitting response:', err);
    }
  };

  const fetchChatUsers = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/membership`)
      if (!res.ok) throw new Error('Failed to fetch group members')
      const data = await res.json()
      setChatUsers(data)
    } catch (err) {
      console.error('Failed to fetch group members', err)
    }
  }

  const fetchPosts = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/posts`)
      if (!res.ok) throw new Error('Failed to fetch posts')
      const data = await res.json()
      setPosts(data || [])

      if (data?.length) {
        data.forEach(post => {
          fetchComments(post.id)
        })
      }
    } catch (err) {
      console.error('Failed to fetch posts', err)
    }
  }

  const fetchComments = async (postId) => {
    try {
      setLoadingComments(prev => ({ ...prev, [postId]: true }))
      const res = await fetch(`/api/groups/${groupId}/posts/${postId}/comments`, {
        credentials: 'include'
      })

      if (!res.ok) throw new Error('Failed to fetch comments')

      const data = await res.json()
      setComments(prev => ({
        ...prev,
        [postId]: data || []
      }))
    } catch (err) {
      console.error('Failed to fetch comments', err)
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }))
    }
  }

  const fetchEvents = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/events`)
      if (!res.ok) throw new Error('Failed to fetch events')
      const data = await res.json()
      setEvents(data || [])
    } catch (err) {
      console.error('Failed to fetch events', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCreating(true)

    const formData = new FormData()
    formData.append('content', content)
    formData.append('group_id', groupId)
    if (image) formData.append('image', image)

    try {
      const res = await fetch(`/api/groups/${groupId}/posts`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      if (!res.ok) throw new Error('Failed to create post')

      const newPost = await res.json()
      setPosts(prev => [newPost, ...prev])
      setContent('')
      setImage(null)
      setShowPostForm(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      console.error('Error creating post:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleCommentSubmit = async (postId) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    try {
      setPostingComment(prev => ({ ...prev, [postId]: true }));

      const res = await fetch(`/api/groups/${groupId}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content
        }),
        credentials: 'include'
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to post comment');
      }

      const newComment = await res.json();
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment]
      }));
      setCommentInputs(prev => ({
        ...prev,
        [postId]: ''
      }));
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setPostingComment(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleCommentChange = (postId, value) => {
    setCommentInputs(prev => ({
      ...prev,
      [postId]: value
    }))
  }

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    setCreatingEvent(true);

    try {
      const requestBody = {
        group_id: parseInt(groupId),
        title: eventForm.title,
        description: eventForm.description,
        event_date: new Date(eventForm.eventDate).toISOString()
      };

      const res = await fetch(`/api/groups/${groupId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error('Failed to create event: ' + errorText);
      }

      const newEvent = await res.json();
      setEvents(prev => [newEvent, ...prev]);
      setEventForm({
        title: '',
        description: '',
        eventDate: ''
      });
      setShowEventForm(false);
    } catch (err) {
      console.error('Error creating event:', err);
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleEventChange = (e) => {
    const { name, value } = e.target
    setEventForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

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
    fetchPosts()
    fetchEvents()
  }, [groupId])

  if (loading) return (
    <div className={styles.container}>
      <Navbar
        togglePostForm={togglePostForm}
        realtimeNotification={realtimeNotification}
        fetchChatUsers={fetchChatUsers}
        hideActions={true}
        hideSearch={true}
        onNotificationRemoved={handleNotificationRemoved}
      />
      <div className={styles.content}>
        <div className={styles.loadingContainer}>
          <div className={`${styles.loadingPulse} ${styles.loadingBar}`}></div>
          <div className={`${styles.loadingPulse} ${styles.loadingBarShort}`}></div>
          <div className={`${styles.loadingPulse} ${styles.loadingBarLong}`}></div>
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className={styles.container}>
      <Navbar
        togglePostForm={togglePostForm}
        realtimeNotification={realtimeNotification}
        fetchChatUsers={fetchChatUsers}
        hideActions={true}
        hideSearch={true}
        onNotificationRemoved={handleNotificationRemoved}
      />
      <div className={`${styles.content} ${styles.errorContainer}`}>
        {error}
      </div>
    </div>
  )

  return (
    <div className={styles.container}>
      <Navbar
        togglePostForm={togglePostForm}
        realtimeNotification={realtimeNotification}
        fetchChatUsers={fetchChatUsers}
        hideActions={true}
        hideSearch={true}
        onNotificationRemoved={handleNotificationRemoved}
      />

      {showPostForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <PostForm
              content={content}
              setContent={setContent}
              image={image}
              setImage={setImage}
              handleSubmit={handleSubmit}
              creating={creating}
              fileInputRef={fileInputRef}
              onClose={() => setShowPostForm(false)}
              isGroupPost={true}
            />
          </div>
        </div>
      )}

      {showEventForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <form onSubmit={handleEventSubmit} className={styles.form}>
              <h2 className={styles.formTitle}>Create New Event</h2>

              <div className={styles.formGroup}>
                <label htmlFor="title" className={styles.formLabel}>
                  Event Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={eventForm.title}
                  onChange={handleEventChange}
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description" className={styles.formLabel}>
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={eventForm.description}
                  onChange={handleEventChange}
                  rows={3}
                  className={styles.formTextarea}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="eventDate" className={styles.formLabel}>
                  Event Date & Time
                </label>
                <input
                  type="datetime-local"
                  id="eventDate"
                  name="eventDate"
                  value={eventForm.eventDate}
                  onChange={handleEventChange}
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formButtonContainer}>
                <button
                  type="button"
                  onClick={() => setShowEventForm(false)}
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  disabled={creatingEvent}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.button} ${styles.buttonPrimary} ${creatingEvent ? styles.buttonDisabled : ''}`}
                  disabled={creatingEvent}
                >
                  {creatingEvent ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.groupTitle}>{group.title}</h1>
          <p className={styles.groupDescription}>{group.description}</p>

          <div className={styles.groupMeta}>
            <span>👥 {group.member_count} members</span>
            <span>🕒 Created {new Date(group.created_at).toLocaleDateString()}</span>
            {group.is_creator && (
              <span className={styles.adminBadge}>
                Admin
              </span>
            )}
          </div>
        </div>

        {!group.is_member && !group.is_pending && !group.is_creator && (
          <div className={styles.joinPrompt}>
            <p>You're not a member of this group</p>
            <button
              onClick={handleJoin}
              className={styles.joinButton}
            >
              Join Group
            </button>
          </div>
        )}

        {group.is_pending && (
          <div className={styles.pendingPrompt}>
            <p>Your join request is pending approval</p>
          </div>
        )}

        <div className={styles.tabs}>
          <button
            onClick={() => setActiveTab('posts')}
            className={`${styles.tab} ${activeTab === 'posts' ? styles.activeTab : ''}`}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`${styles.tab} ${activeTab === 'events' ? styles.activeTab : ''}`}
          >
            Events
          </button>
          {group.is_creator && (
            <button
              onClick={() => setActiveTab('requests')}
              className={`${styles.tab} ${activeTab === 'requests' ? styles.activeTab : ''}`}
            >
              Pending Requests
            </button>
          )}
        </div>

        {group.is_member || group.is_creator ? (
          <div className={styles.tabContent}>
            {activeTab === 'posts' && (
              <button
                onClick={togglePostForm}
                className={styles.createButton}
              >
                Create Post
              </button>
            )}

            {activeTab === 'events' && (
              <button
                onClick={toggleEventForm}
                className={styles.createButton}
              >
                Create Event
              </button>
            )}

            {activeTab === 'requests' && group.is_creator && (
              <div className={styles.postsContainer}>
                <PendingRequests groupId={group.id} />
              </div>
            )}

            {activeTab === 'posts' && (
              <div className={styles.postsContainer}>
                {posts.length > 0 ? (
                  posts.map(post => (
                    <div key={post.id} className={styles.post}>
                      <p className={styles.postContent}>{post.content}</p>
                      {post.image && (
                        <img
                          src={`${post.image}`}
                          alt="Post"
                          className={styles.postImage}
                        />
                      )}

                      <div className={styles.commentsSection}>
                        {loadingComments[post.id] ? (
                          <div className={styles.loadingComments}>Loading comments...</div>
                        ) : (
                          <div className={styles.comments}>
                            {comments[post.id]?.map(comment => (
                              <div key={comment.id} className={styles.comment}>
                                <p className={styles.commentContent}>{comment.content}</p>
                                <p className={styles.commentMeta}>
                                  {comment.creator_name} • {new Date(comment.created_at).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className={styles.commentForm}>
                          <input
                            type="text"
                            placeholder="Add a comment..."
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => handleCommentChange(post.id, e.target.value)}
                            className={styles.commentInput}
                          />
                          <button
                            onClick={() => handleCommentSubmit(post.id)}
                            disabled={postingComment[post.id]}
                            className={`${styles.commentButton} ${postingComment[post.id] ? styles.commentButtonDisabled : ''}`}
                          >
                            {postingComment[post.id] ? 'Posting...' : 'Post'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={styles.emptyState}>No posts yet. Be the first to post!</p>
                )}
              </div>
            )}

            {activeTab === 'events' && (
              <div className={styles.eventsContainer}>
                {events.length > 0 ? (
                  events.map((event) => (
                    <div
                      key={event.id}
                      className={styles.event}
                    >
                      <div className="space-y-4">
                        <div className={styles.eventHeader}>
                          <h3 className={styles.eventTitle}>{event.title}</h3>
                          {group.is_creator && (
                            <span className={styles.organizerBadge}>
                              Organizer
                            </span>
                          )}
                        </div>

                        <p className={styles.eventDescription}>{event.description}</p>

                        <div className={styles.eventMeta}>
                          <div className={styles.eventMetaItem}>
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

                          <div className={styles.eventMetaItemGreen}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {event.creator_name}
                          </div>
                        </div>

                        <div className={styles.eventActions}>
                          <div className={styles.voteButtons}>
                            <div className={styles.voteButtonContainer}>
                              <button
                                onClick={() => handleVote(event.id, 'going')}
                                className={`${styles.voteButton} ${event.user_response === 'going' ? styles.voteButtonGoing : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Going
                              </button>
                              <span className={styles.voteCount}>
                                {event.going_count || 0}
                              </span>
                            </div>

                            <div className={styles.voteButtonContainer}>
                              <button
                                onClick={() => handleVote(event.id, 'not_going')}
                                className={`${styles.voteButton} ${event.user_response === 'not_going' ? styles.voteButtonNotGoing : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Not Going
                              </button>
                              <span className={styles.voteCount}>
                                {event.not_going_count || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.noEvents}>
                    <div className={styles.noEventsContent}>
                      <svg xmlns="http://www.w3.org/2000/svg" className={styles.noEventsIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <h3 className={styles.noEventsTitle}>No events yet</h3>
                      <p className={styles.noEventsText}>Be the first to create an event!</p>
                      <button
                        onClick={toggleEventForm}
                        className={styles.noEventsButton}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create Event
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.noAccess}>
            <p>Join the group to see posts and events</p>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowGroupChat(true)}
        className={styles.chatButton}
        title="Group Chat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {showGroupChat && (
        <div className={styles.chatPopupOverlay}>
          <div className={styles.chatPopup}>
            <div className={styles.chatHeader}>
              <div className={styles.chatTitleContainer}>
                <h3 className={styles.chatTitle}>Group Chat: {group?.title}</h3>
                <span className={`${styles.connectionStatus} ${isConnected ? styles.connected : styles.disconnected}`}></span>
              </div>
              <button
                onClick={() => setShowGroupChat(false)}
                className={styles.chatCloseButton}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className={styles.chatMessages}>
              {groupChatMessages.length === 0 ? (
                <p className={styles.emptyChat}>
                  {isConnected ? "No messages yet. Start the conversation!" : "Connecting to chat..."}
                </p>
              ) : (
                groupChatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`${styles.chatMessage} ${msg.isCurrentUser ? styles.justifyEnd : styles.justifyStart}`}>
                    <div
                      className={`${styles.messageBubble} ${msg.isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage}`}>
                      <p className={styles.messageContent}>{msg.content}</p>
                      <p className={styles.messageMeta}>
                        {msg.isCurrentUser ? 'You' : msg.sender_name || 'User'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className={styles.chatInputContainer}>
              <div className={styles.chatInputForm}>
                <input
                  type="text"
                  value={groupChatInput}
                  onChange={(e) => setGroupChatInput(e.target.value)}
                  onKeyPress={handleChatKeyPress}
                  placeholder={isConnected ? "Type a message..." : "Connecting..."}
                  disabled={!isConnected}
                  className={`${styles.chatInput} ${!isConnected ? styles.chatInputDisabled : ''}`}
                />
                <button
                  onClick={sendGroupChatMessage}
                  disabled={!groupChatInput.trim() || !isConnected}
                  className={`${styles.chatSendButton} ${(!groupChatInput.trim() || !isConnected) ? styles.chatSendButtonDisabled : ''}`}>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
