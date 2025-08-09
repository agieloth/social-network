'use client'

import { useEffect, useState } from 'react'
import styles from './ProfilePage.module.css'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('http://localhost:8080/api/profile', {
      credentials: 'include', // important to send cookie
    })
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated')
        return res.json()
      })
      .then(data => setProfile(data))
      .catch(() => {
        setError('Please login to view your profile')
        setTimeout(() => router.push('/login'), 2000)
      })
  }, [])

  if (error) {
    return <p className="text-red-600">{error}</p>
  }

  if (!profile) {
    return <p>Loading...</p>
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Your Profile</h1>
      <p className={styles.field}><strong className={styles.label}>Email:</strong> {profile.email}</p>
      <p className={styles.field}><strong className={styles.label}>Name:</strong> {profile.first_name} {profile.last_name}</p>
      <p className={styles.field}><strong className={styles.label}>Date of Birth:</strong> {profile.date_of_birth}</p>
      <p className={styles.field}><strong className={styles.label}>Nickname:</strong> {profile.nickname || 'N/A'}</p>
      <p className={styles.field}><strong className={styles.label}>About Me:</strong> {profile.about || 'N/A'}</p>
      <p className={styles.field}><strong className={styles.label}>Avatar:</strong> {profile.avatar || 'N/A'}</p>

      <button
  className={styles.logoutButton}

  onClick={async () => {
    
    try {
      const res = await fetch('http://localhost:8080/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        router.push('/login');  // redirect to login after logout
      } else {
        alert('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      alert('Network error during logout');
    }
  }}
>
  Logout
</button>



    </main>
  )
}