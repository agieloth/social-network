// src/app/home/hooks/useUser.js
import { useState, useEffect } from 'react'
import { API_BASE_URL } from '@/config/api'

export function useUser() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch(`${API_BASE_URL}/api/profile`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      }
    }
    fetchUser()
  }, [])

  return [user, setUser]
}
