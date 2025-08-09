'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSharedWorker } from '../../../contexts/SharedWorkerContext';
import { useAuth } from '../../../contexts/AuthContext';
import PostForm from '../../../app/home/components/PostForm';
import styles from './Navbar.module.css';

export function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Post Form State
  const [showPostForm, setShowPostForm] = useState(false);
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [privacy, setPrivacy] = useState('public');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef();

  // Navbar State
  const [showProfile, setShowProfile] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsRef = useRef(null);
  const notificationButtonRef = useRef(null);
  const { workerMessages, sendWorkerMessage } = useSharedWorker();

   if (loading) {
    return <div className={styles.navbar}>Loading...</div>;
  }

  if (!user) {
    // Optionally redirect to login or show different UI
    return <div className={styles.navbar}>Not authenticated</div>;
  }

  // Init SharedWorker
  useEffect(() => {
    if (user?.ID) {
      sendWorkerMessage({ type: 'INIT', userId: user.ID });
    }
  }, [user, sendWorkerMessage]);

  // Search handler
  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearch(value);

    if (value.length > 1) {
      try {
        const res = await fetch(`http://localhost:8080/api/search?query=${value}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to search users");
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error("Error searching users:", err);
      }
    } else {
      setResults([]);
    }
  };

  // Post submit
  const handleSubmit = async (e, selectedRecipientIds = []) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCreating(true);

    const formData = new FormData();
    formData.append("content", content);
    formData.append("privacy", privacy);
    if (image) formData.append("image", image);

    try {
      let finalRecipientIds = [];

      if (privacy === "custom") {
        finalRecipientIds = selectedRecipientIds;
      }

      finalRecipientIds.forEach(id => formData.append("recipient_ids", id));

      const res = await fetch("http://localhost:8080/api/posts", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Erreur lors de la publication");

      setSuccess("✅ Post publié !");
      setContent("");
      setImage(null);
      setPrivacy("public");

      if (fileInputRef.current) fileInputRef.current.value = null;
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Toggle post form
  const togglePostForm = () => {
    setShowPostForm(prev => !prev);
    if (!showPostForm) {
      setError("");
      setSuccess("");
    }
  };

  // Handle incoming messages from worker
  useEffect(() => {
    workerMessages.forEach(msg => {
      if (msg.type === 'message' && msg.data) {
        handleRealtimeNotification(msg.data);
      }
    });
  }, [workerMessages]);

  // Handle real-time notification
  const handleRealtimeNotification = (notification) => {
    fetchNotifications();

    setNotifications(prev => {
      const exists = prev.some(n =>
        n.sender_id === notification.sender_id &&
        n.type === notification.type &&
        n.message === notification.message
      );

      if (exists) return prev;

      const newNotif = {
        id: notification.id,
        sender_id: notification.sender_id,
        type: notification.type,
        message: notification.message,
        created_at: notification.created_at || new Date().toISOString(),
        seen: false
      };

      const updated = [newNotif, ...prev];
      setUnreadCount(updated.filter(n => !n.seen).length);
      return updated;
    });
  };

  // Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { credentials: 'include', method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Open messages placeholder (you can implement as needed)
  const openMessages = () => {/* TODO: Implement openMessages logic */};

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/notifications", { credentials: 'include' });
      const data = await res.json();

      const uniqueNotifs = [];
      const seenKeys = new Set();

      for (const notif of data) {
        const key = `${notif.sender_id}-${notif.message}-${notif.type}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueNotifs.push(notif);
        }
      }

      setNotifications(uniqueNotifs);
      setUnreadCount(uniqueNotifs.filter(n => !n.seen).length);
    } catch (err) {
      console.error("Error fetching notifications", err);
    }
  };

  // Toggle notifications dropdown
  const toggleNotifications = async (e) => {
    e.stopPropagation();
    const newState = !showNotifications;
    setShowNotifications(newState);

    if (newState) {
      await fetchNotifications();
      await fetch('http://localhost:8080/api/notifications/seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true }),
        credentials: 'include',
      });
      await fetchNotifications();
      setUnreadCount(0);
    }
  };

  // Accept follow request
  const handleAccept = async (notifId, senderId) => {
    try {
      await fetch('/api/follow/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: senderId }),
        credentials: 'include',
      });

      await fetch('/api/notifications/seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: notifId }),
        credentials: 'include',
      });

      await fetch('/api/notifications/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: notifId }),
        credentials: 'include',
      });
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (err) {
      console.error('Error accepting follow:', err);
    }
  };

  // Reject follow request
  const handleReject = async (notifId, senderId) => {
    try {
      const [rejectRes, seenRes, deleteRes] = await Promise.all([
        fetch('/api/follow/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender_id: senderId }),
          credentials: 'include',
        }),
        fetch('/api/notifications/seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_id: notifId }),
          credentials: 'include',
        }),
        fetch('/api/notifications/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_id: notifId }),
          credentials: 'include',
        })
      ]);

      if (rejectRes.ok && seenRes.ok && deleteRes.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notifId));
      } else {
        console.error('One or more requests failed');
      }
    } catch (err) {
      console.error('Error rejecting follow:', err);
    }
  };

  // Approve group join request
  const handleApprove = async (notifId, userId, groupId) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/membership/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
        credentials: 'include'
      })

      if (res.ok) {
        await fetch('/api/notifications/seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_id: notifId }),
          credentials: 'include',
        });

        await fetch('/api/notifications/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_id: notifId }),
          credentials: 'include',
        });
        setNotifications(prev => prev.filter(n => n.id !== notifId));
      }
    } catch (err) {
      console.error('Error approving request:', err)
    }
  };

  // Decline group join request
  const handleDecline = async (notifId, userId, groupId) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/membership/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
        credentials: 'include'
      })
      if (res.ok) {
        await fetch('/api/notifications/seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_id: notifId }),
          credentials: 'include',
        });

        await fetch('/api/notifications/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_id: notifId }),
          credentials: 'include',
        });
        setNotifications(prev => prev.filter(n => n.id !== notifId));
      }
    } catch (err) {
      console.error('Error declining request:', err)
    }
  };

  // Toggle privacy
  const togglePrivacy = async () => {
    try {
      const res = await fetch('/api/user/toggle-privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_private: !isPrivate }),
        credentials: 'include'
      });
      if (res.ok) {
        setIsPrivate(!isPrivate);
      }
    } catch (err) {
      console.error('Error changing privacy:', err);
    }
  };

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target) &&
        !notificationButtonRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial notifications load
  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.container}>

          {/* Search bar */}
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="🔍 Search users..."
              onChange={handleSearch}
              value={search}
              className={styles.searchInput}
            />
            {results.length > 0 && (
              <div className={styles.resultsContainer}>
                {results.map(user => (
                  <div
                    key={user.ID}
                    className={styles.resultItem}
                    onClick={() => {
                      router.push(`/profile/${user.ID}`);
                      setSearch('');
                      setResults([]);
                    }}
                  >
                    <p className={styles.resultName}>
                      {user.FirstName} {user.LastName}
                    </p>
                    <p className={styles.resultNickname}>@{user.Nickname}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions buttons */}
          <div className={styles.actionsContainer}>

            <button onClick={togglePostForm} title="Create Post">
              <img
                src="/plus-icon.png"
                alt="Create post"
                className={styles.actionButtonImg}
              />
            </button>

            <button onClick={openMessages} title="Messages">
              <img
                src="/message-icon.png"
                alt="Messages"
                className={styles.actionButtonImg}
              />
            </button>

            <div className={styles.notificationsContainer}>
              <button
                onClick={toggleNotifications}
                className={styles.notificationButton}
                ref={notificationButtonRef}
                title="Notifications"
              >
                <img
                  src="/notif-icon.png"
                  alt="Notifications"
                  className={styles.actionButtonImg}
                />
                {unreadCount > 0 && (
                  <span className={styles.unreadCount}>{unreadCount}</span>
                )}
              </button>

              {showNotifications && (
                <div className={styles.notificationsDropdown} ref={notificationsRef}>
                  <div className={styles.dropdownHeader}>
                    <span className={styles.dropdownTitle}>Notifications</span>
                    <button
                      className={styles.closeButton}
                      onClick={() => setShowNotifications(false)}
                    >
                      ×
                    </button>
                  </div>

                  <div className={styles.notificationsList}>
                    {notifications.length === 0 ? (
                      <p className={styles.noNotifications}>No notifications</p>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          className={`${styles.notificationItem} ${notif.seen ? styles.seen : ''}`}
                        >
                          <p className={styles.notificationMessage}>{notif.message}</p>
                          <small className={styles.notificationTimestamp}>
                            {new Date(notif.created_at).toLocaleString()}
                          </small>

                          {/* Actions depending on notification type */}
                          {notif.type === 'follow_request' && (
                            <div className={styles.actionButtons}>
                              <button
                                className={styles.acceptButton}
                                onClick={() => handleAccept(notif.id, notif.sender_id)}
                              >
                                Accept
                              </button>
                              <button
                                className={styles.rejectButton}
                                onClick={() => handleReject(notif.id, notif.sender_id)}
                              >
                                Reject
                              </button>
                            </div>
                          )}

                          {notif.type === 'group_join_request' && (
                            <div className={styles.actionButtons}>
                              <button
                                className={styles.acceptButton}
                                onClick={() =>
                                  handleApprove(notif.id, notif.user_id, notif.group_id)
                                }
                              >
                                Approve
                              </button>
                              <button
                                className={styles.rejectButton}
                                onClick={() =>
                                  handleDecline(notif.id, notif.user_id, notif.group_id)
                                }
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link href="/groups" className={styles.groupsLink}>
              👥 Groups
            </Link>

            <div className={styles.profileContainer}>
              <img
                src={
                  user.Avatar
                    ? user.Avatar.startsWith('http')
                      ? user.Avatar
                      : `http://localhost:8080/${user.Avatar}`
                    : '/avatar.png'
                }
                alt="Avatar"
                className={styles.avatar}
                onClick={() => setShowProfile(!showProfile)}
              />
              {showProfile && (
                <div className={styles.profileDropdown}>
                  <h2 className={styles.profileName}>
                    {user.FirstName} {user.LastName}
                  </h2>
                  <p className={styles.profileEmail}>{user.Email}</p>

                  <div className={styles.privacyContainer}>
                    <span className={styles.privacyText}>
                      Private Account
                    </span>
                    <div
                      className={styles.privacyToggle}
                      onClick={togglePrivacy}
                      role="switch"
                      aria-checked={isPrivate}
                      tabIndex={0}
                    >
                      <div
                        className={`${styles.privacyToggleIndicator} ${
                          isPrivate ? styles.moveRight : ''
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    className={styles.logoutButton}
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </nav>

      {/* Post form modal */}
      {showPostForm && (
        <PostForm
          user={user}
          onClose={togglePostForm}
          onSubmit={handleSubmit}
          content={content}
          setContent={setContent}
          image={image}
          setImage={setImage}
          privacy={privacy}
          setPrivacy={setPrivacy}
          creating={creating}
          error={error}
          success={success}
          fileInputRef={fileInputRef}
        />
      )}
    </>
  );
}
