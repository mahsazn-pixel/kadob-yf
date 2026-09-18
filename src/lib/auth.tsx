import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { getLocalProfile, saveLocalProfile } from './localStore'
import { Profile } from './types'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signInLocal: (phone: string) => void
  updateProfile: (patch: Partial<Profile>) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const LOCAL_AUTH_KEY = 'kadoba_local_auth'

function makeLocalUser(phone: string): User {
  return {
    id: `local-${phone}`,
    aud: 'authenticated',
    role: 'authenticated',
    email: `${phone}@kadoba.ir`,
    phone,
    app_metadata: {},
    user_metadata: { phone },
    created_at: new Date().toISOString(),
  } as User
}

function makeLocalSession(phone: string): Session {
  const user = makeLocalUser(phone)
  return {
    access_token: 'local-access-token',
    refresh_token: 'local-refresh-token',
    token_type: 'bearer',
    expires_in: 60 * 60 * 24 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    user,
  } as Session
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, phone_number, name, avatar_url, birth_date')
      .eq('id', uid)
      .maybeSingle()
    setProfile(data as Profile | null)
  }

  const applyLocalAuth = (phone: string) => {
    const localSession = makeLocalSession(phone)
    setSession(localSession)
    setUser(localSession.user)
    const storedProfile = getLocalProfile(localSession.user.id)
    const now = new Date().toISOString()
    const nextProfile: Profile = storedProfile || {
      id: localSession.user.id,
      phone_number: phone,
      name: null,
      avatar_url: null,
      birth_date: null,
      created_at: now,
      updated_at: now,
    }
    setProfile(nextProfile)
    if (!storedProfile) saveLocalProfile(nextProfile)
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify({ phone }))
  }

  const signInLocal = (phone: string) => {
    applyLocalAuth(phone)
  }

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 5000)

    const stored = localStorage.getItem(LOCAL_AUTH_KEY)
    if (stored) {
      try {
        const { phone } = JSON.parse(stored) as { phone: string }
        if (phone) {
          applyLocalAuth(phone)
          setLoading(false)
          clearTimeout(timeout)
          return () => {
            cancelled = true
            clearTimeout(timeout)
          }
        }
      } catch {
        localStorage.removeItem(LOCAL_AUTH_KEY)
      }
    }

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          return fetchProfile(session.user.id).finally(() => {
            if (!cancelled) setLoading(false)
          })
        }
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
      .finally(() => clearTimeout(timeout))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (localStorage.getItem(LOCAL_AUTH_KEY)) return
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (nextSession?.user) {
        (async () => {
          await fetchProfile(nextSession.user.id)
        })()
      } else {
        setProfile(null)
      }
    })

    return () => {
      cancelled = true
      clearTimeout(timeout)
      listener.subscription.unsubscribe()
    }
  }, [])

  const updateProfile = async (patch: Partial<Profile>) => {
    if (!user || !profile) return
    const next: Profile = {
      ...profile,
      ...patch,
      id: profile.id,
      phone_number: profile.phone_number,
    }
    if (user.id.startsWith('local-')) {
      const saved = saveLocalProfile({
        ...next,
        created_at: next.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      setProfile(saved)
      return
    }
    await supabase.from('profiles').update({
      ...patch,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    setProfile(next)
  }

  const refreshProfile = async () => {
    if (!user) return
    if (user.id.startsWith('local-')) {
      const stored = getLocalProfile(user.id)
      if (stored) setProfile(stored)
      return
    }
    await fetchProfile(user.id)
  }

  const signOut = async () => {
    localStorage.removeItem(LOCAL_AUTH_KEY)
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore remote sign-out errors in local mode
    }
    setSession(null)
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signInLocal, updateProfile, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
