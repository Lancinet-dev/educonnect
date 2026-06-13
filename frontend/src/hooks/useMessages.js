import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => (await api.get('/messages/conversations')).data,
  })
}

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: async () => (await api.get('/messages/contacts')).data,
  })
}

export function useConversation(conversationId) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => (await api.get(`/messages/conversations/${conversationId}`)).data,
    enabled: !!conversationId,
  })
}

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ conversationId, body }) =>
      (await api.post(`/messages/conversations/${conversationId}/messages`, { body })).data,
    onSuccess: (_d, { conversationId }) => {
      qc.invalidateQueries({ queryKey: ['conversation', conversationId] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useStartConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (recipientId) =>
      (await api.post('/messages/conversations', { recipientId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  })
}
