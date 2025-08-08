// src/app/groups/components/GroupCard.jsx
'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react' // Import useState
import styles from './GroupCard.module.css'

export default function GroupCard({ group }) {
  const router = useRouter()
  const [localStatus, setLocalStatus] = useState({
    isPending: group.is_pending,
    isMember: group.is_member
  }) // Add local state for immediate feedback

  const handleJoin = async (e) => {
    e.stopPropagation()
    setLocalStatus(prev => ({ ...prev, isPending: true })) // Optimistically update UI
    
    try {
      const res = await fetch(`/api/groups/${group.id}/membership/join`, {
        method: 'POST',
        credentials: 'include'
      })
      if (res.ok) {
        router.refresh() // Refresh to get actual status from server
      } else {
        // Revert if request fails
        setLocalStatus(prev => ({ ...prev, isPending: false }))
      }
    } catch (err) {
      console.error('Error joining group:', err)
      setLocalStatus(prev => ({ ...prev, isPending: false })) // Revert on error
    }
  }

  const handleVisit = (e) => {
    e.stopPropagation()
    router.push(`/groups/${group.id}`)
  }

  // Combine server and local state for display
  const displayStatus = {
    isPending: localStatus.isPending || group.is_pending,
    isMember: localStatus.isMember || group.is_member,
    isCreator: group.is_creator
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{group.title}</h3>
        {displayStatus.isCreator && (
          <span className={`${styles.badge} ${styles.adminBadge}`}>
            Admin
          </span>
        )}
      </div>
      
      <p className={styles.description}>{group.description}</p>
      
      <div className={styles.footer}>
        <div className={styles.meta}>
          <span>👥 {group.member_count} members</span>
          <span>•</span>
          <span>🕒 {new Date(group.created_at).toLocaleDateString()}</span>
        </div>

        {!displayStatus.isMember && !displayStatus.isPending && !displayStatus.isCreator && (
          <button 
            onClick={handleJoin}
            className={`${styles.button} ${styles.joinButton}`}>
            Join Group
          </button>
        )}

        {displayStatus.isPending && (
          <span className={`${styles.badge} ${styles.pendingBadge}`}>
            Pending
          </span>
        )}

        {(displayStatus.isMember || displayStatus.isCreator) && (
          <button 
            onClick={handleVisit}
            className={`${styles.button} ${styles.visitButton}`}>
            Visit Group
          </button>
        )}
      </div>
    </div>
  )
}
