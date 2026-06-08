import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:            null,
      accessToken:     null,
      isAuthenticated: false,

      // Connecter l'utilisateur
      setAuth: (user, accessToken) => set({
        user,
        accessToken,
        isAuthenticated: true,
      }),

      // Mettre à jour les infos utilisateur
      updateUser: (updates) => set(state => ({
        user: { ...state.user, ...updates }
      })),

      // Déconnecter
      logout: () => set({
        user:            null,
        accessToken:     null,
        isAuthenticated: false,
      }),

      // Getters utiles
      getRole:     () => get().user?.role,
      getSchoolId: () => get().user?.school_id,
      getFullName: () => {
        const u = get().user
        return u ? `${u.first_name} ${u.last_name}` : ''
      },
    }),
    {
      name: 'educonnect-auth',
      // Ne persister que ces champs
      partialize: (state) => ({
        user:            state.user,
        accessToken:     state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
