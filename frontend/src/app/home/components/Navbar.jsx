// src/app/home/components/Navbar.js
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './Navbar.module.css'

export default function Navbar({
  user,
  handleSearch,
  handleLogout,
  results,
  openMessages,
  togglePostForm,
  realtimeNotification,
  fetchChatUsers,
  hideActions = false,
  hideSearch = false,
  onNotificationRemoved,
  fetchUserById,
  setSearch,
  setResults
}) {
  const router = useRouter()

  const [showProfile, setShowProfile] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationsRef = useRef(null)
  const notificationButtonRef = useRef(null)
  const [unreadCount, setUnreadCount] = useState(0);

  const removeNotification = (criteria) => {
    setNotifications(prev => {
      const filtered = prev.filter(notif => {
        if (criteria.type === 'follow_request_cancelled') {
          return !(notif.type === 'follow_request' && notif.sender_id === criteria.sender_id);
        }
        return true;
      });
      setUnreadCount(filtered.filter(n => !n.seen).length);
      return filtered;
    });
  };

  useEffect(() => {
    if (onNotificationRemoved) {
      onNotificationRemoved(removeNotification);
    }
  }, [onNotificationRemoved]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current &&
        !notificationsRef.current.contains(event.target) &&
        !notificationButtonRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
      console.error("Erreur récupération notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

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

  const handleAccept = async (notifId, senderId) => {
    try {
      await fetch('/api/follow/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: senderId }),
        credentials: 'include',
      });

      if (typeof fetchChatUsers === 'function') {
        setTimeout(() => fetchChatUsers(), 500);
      }

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
      console.error('Erreur acceptation:', err);
    }
  };

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
      console.error('One or more requests failed', rejectRes.status, seenRes.status);
    }
  } catch (err) {
    console.error('Erreur rejet:', err);
  }
};

  const toggleProfile = () => {
    setShowProfile(prev => !prev)
  }

  const togglePrivacy = async () => {
    try {
      const res = await fetch('/api/user/toggle-privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_private: !isPrivate })
      })
      if (res.ok) {
        setIsPrivate(!isPrivate)
      }
    } catch (err) {
      console.error('Erreur modification confidentialité', err)
    }
  }

  useEffect(() => {
    if (user && typeof user.IsPrivate === 'boolean') {
      setIsPrivate(user.IsPrivate);
    }
  }, [user]);

  useEffect(() => {
    if (realtimeNotification) {
      if (realtimeNotification.type === "follow_request_response") {
        const { sender_id, recipient_id } = realtimeNotification;
        if (recipient_id === user?.ID) {
          setNotifications(prev => prev.filter(n => !(n.type === 'follow_request' && n.sender_id === sender_id)));
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        return;
      }

      setNotifications(prev => {
        const exists = prev.some(n =>
          n.sender_id === realtimeNotification.sender_id &&
          n.type === realtimeNotification.type &&
          n.message === realtimeNotification.message
        );

        if (exists) return prev;

        const newNotif = {
          id: realtimeNotification.id,
          sender_id: realtimeNotification.sender_id,
          type: realtimeNotification.type,
          message: realtimeNotification.message,
          created_at: realtimeNotification.created_at || new Date().toISOString(),
          seen: false
        };

        const updated = [newNotif, ...prev];
        setUnreadCount(updated.filter(n => !n.seen).length);
        return updated;
      });
    }
  }, [realtimeNotification, user?.ID]);

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        {/* Barre de recherche */}
        {!hideSearch ? (
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="🔍 Rechercher un utilisateur..."
              onChange={handleSearch}
              className={styles.searchInput}
            />
            {results !== null && (
              <div className={styles.resultsContainer}>
                {results.map((u) => (
                  <div
                    key={u.id}
                    className={styles.resultItem}
                    onClick={() => router.push(`/profile/${u.id}`)}
                  >
                    <p className={styles.resultName}>
                      {u.first_name} {u.last_name}
                    </p>
                    <p className={styles.resultNickname}>@{u.nickname}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div /> // Place vide pour conserver l'espace de gauche
        )}

        {/* Droite : Actions, cloche, profil */}
        <div className={styles.actionsContainer}>
          {!hideActions && (
            <>
              <button onClick={togglePostForm}>
                <img src="/plus-icon.png" alt="Créer un post" className={styles.actionButtonImg} />
              </button>

              <button onClick={openMessages} className="relative">
                <img src="/message-icon.png" alt="Messages" className={styles.actionButtonImg} />
              </button>
            </>
          )}

          {/* Cloche notifications (toujours visible) */}
          <div className={styles.notificationsContainer}>
            <button
              ref={notificationButtonRef}
              onClick={toggleNotifications}
              className={styles.notificationButton}
            >
              <img src="/notif-icon.png" className={styles.actionButtonImg} alt="Notifications" />
              {unreadCount > 0 && (
                <span className={styles.unreadCount}>
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                ref={notificationsRef}
                className={styles.notificationsDropdown}
              >
                <div className={styles.dropdownHeader}>
                  <h3 className={styles.dropdownTitle}>Notifications</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className={styles.closeButton}
                  >
                    ×
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <p className={styles.noNotifications}>Aucune notification</p>
                ) : (
                  <div className={styles.notificationsList}>
                    {notifications.map((notif, idx) => (
                      <div
                        key={notif.id ? notif.id : `${notif.sender_id}-${notif.type}-${notif.message}-${idx}`}
                        className={`${styles.notificationItem} ${notif.seen ? styles.seen : styles.unseen}`}
                      >
                        <p className={styles.notificationMessage}>
                          {notif.message}
                        </p>
                        <p className={styles.notificationTimestamp}>
                          {new Date(notif.created_at).toLocaleString()}
                        </p>
                        {notif.type === 'follow_request' && (
                          <div className={styles.actionButtons}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAccept(notif.id, notif.sender_id)
                              }}
                              className={styles.acceptButton}
                            >
                              Accepter
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleReject(notif.id, notif.sender_id)
                              }}
                              className={styles.rejectButton}
                            >
                              Refuser
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <Link href="/groups" className={styles.groupsLink}>👥 Groups</Link>
          {user && (
            <div className={styles.profileContainer}>
              <img
                src={
                  user.Avatar
                    ? user.Avatar.startsWith('http')
                      ? user.Avatar
                      : `http://localhost:8080/${user?.Avatar}`
                    : '/avatar.png'
                }
                alt="Avatar"
                onClick={toggleProfile}
                className={styles.avatar}
              />

              {showProfile && (
                <div className={styles.profileDropdown}>
                  <h2 className={styles.profileName}>
                    {user.FirstName} {user.LastName}
                  </h2>
                  <p className={styles.profileEmail}>{user.Email}</p>
                  <div className={styles.privacyContainer}>
                    <span className={styles.privacyText}>
                      {isPrivate ? '🔒 Profil privé' : '🌍 Profil public'}
                    </span>
                    <button
                      onClick={togglePrivacy}
                      className={`${styles.privacyToggle} ${isPrivate ? styles.private : styles.public}`}
                    >
                      <div
                        className={`${styles.privacyToggleIndicator} ${isPrivate ? styles.moveRight : ''}`}
                      ></div>
                    </button>
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        router.push(`/profile/${user.ID}`);
                      }}
                      className={styles.profileLink}
                    >
                      show all profile
                    </button>
                  </ div>
                  <button
                    onClick={handleLogout}
                    className={styles.logoutButton}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </nav>
  )
}
