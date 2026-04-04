import {
  getOsmOAuthClientId,
  getOsmOAuthRedirectUrl,
  OSM_API_USER_AGENT,
} from '../lib/osmOAuthConfig'
import {
  authReady,
  configure,
  getAuthToken,
  getUser,
  isLoggedIn,
  login as osmLogin,
  logout as osmLogout,
} from 'osm-api'
import { create } from 'zustand'

configure({ userAgent: OSM_API_USER_AGENT })

export type OsmElementType = 'node' | 'way' | 'relation'

export type PendingOsmEdit = {
  osmType: OsmElementType
  osmId: string
  lon: number
  lat: number
  tags: Record<string, string>
}

function pendingKey(type: OsmElementType, id: string) {
  return `${type}/${id}`
}

function syncAuthHeaderFromToken() {
  const t = getAuthToken()
  configure({ authHeader: t ? `Bearer ${t}` : undefined })
}

type OsmAppActions = {
  initAuth: () => Promise<void>
  login: () => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  addPendingTags: (partial: Omit<PendingOsmEdit, 'tags'> & { tags: Record<string, string> }) => void
  removePendingTag: (key: string, tagKey: string) => void
  clearPending: () => void
}

type OsmAppState = {
  authInitialized: boolean
  osmDisplayName: string | null
  pendingByKey: Record<string, PendingOsmEdit>
  actions: OsmAppActions
}

/**
 * Store hook is not exported — consumers use atomic hooks + {@link useOsmAppActions}
 * (see https://tkdodo.eu/blog/working-with-zustand).
 */
const useOsmAppStore = create<OsmAppState>((set, get) => ({
  authInitialized: false,
  osmDisplayName: null,
  pendingByKey: {},

  actions: {
    initAuth: async () => {
      await authReady
      syncAuthHeaderFromToken()
      let name: string | null = null
      if (isLoggedIn()) {
        try {
          const me = await getUser('me')
          name = me.display_name ?? String(me.id)
        } catch {
          name = null
        }
      }
      set({ authInitialized: true, osmDisplayName: name })
    },

    login: async () => {
      const clientId = getOsmOAuthClientId()
      const redirectUrl = getOsmOAuthRedirectUrl()
      await osmLogin({
        mode: 'popup',
        clientId,
        redirectUrl,
        /** read_prefs: required for getUser('me') → /api/0.6/user/details.json */
        scopes: ['read_prefs', 'write_api'],
      })
      syncAuthHeaderFromToken()
      await get().actions.refreshUser()
    },

    logout: () => {
      osmLogout()
      syncAuthHeaderFromToken()
      set({ osmDisplayName: null })
    },

    refreshUser: async () => {
      syncAuthHeaderFromToken()
      if (!isLoggedIn()) {
        set({ osmDisplayName: null })
        return
      }
      try {
        const me = await getUser('me')
        set({ osmDisplayName: me.display_name ?? String(me.id) })
      } catch {
        set({ osmDisplayName: null })
      }
    },

    addPendingTags: (partial) => {
      const key = pendingKey(partial.osmType, partial.osmId)
      set((s) => {
        const prev = s.pendingByKey[key]
        const tags = { ...prev?.tags, ...partial.tags }
        return {
          pendingByKey: {
            ...s.pendingByKey,
            [key]: {
              osmType: partial.osmType,
              osmId: partial.osmId,
              lon: partial.lon,
              lat: partial.lat,
              tags,
            },
          },
        }
      })
    },

    removePendingTag: (key, tagKey) => {
      set((s) => {
        const prev = s.pendingByKey[key]
        if (!prev) return s
        const { [tagKey]: _, ...rest } = prev.tags
        const next = { ...s.pendingByKey }
        if (Object.keys(rest).length === 0) {
          delete next[key]
        } else {
          next[key] = { ...prev, tags: rest }
        }
        return { pendingByKey: next }
      })
    },

    clearPending: () => set({ pendingByKey: {} }),
  },
}))

/** Stable action bundle; safe to destructure — references do not change. */
export function useOsmAppActions() {
  return useOsmAppStore((s) => s.actions)
}

export function useOsmAuthInitialized() {
  return useOsmAppStore((s) => s.authInitialized)
}

export function useOsmDisplayName() {
  return useOsmAppStore((s) => s.osmDisplayName)
}

export function usePendingEditCount() {
  return useOsmAppStore((s) => Object.keys(s.pendingByKey).length)
}

export function usePendingEditsByKey() {
  return useOsmAppStore((s) => s.pendingByKey)
}

/** For `beforeunload` and other non-React call sites. */
export function getOsmPendingObjectCount() {
  return Object.keys(useOsmAppStore.getState().pendingByKey).length
}
