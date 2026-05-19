import { useState, useEffect, useCallback } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export function useChatHistory(userId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Load chat history from Firestore
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadChatHistory = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/chat-history?date=${today}`, {
          method: 'GET',
          headers: {
            'X-User-ID': userId,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadChatHistory();
  }, [userId]);

  // Save message to Firestore
  const saveMessage = useCallback(async (role: 'user' | 'assistant', content: string) => {
    if (!userId) return;

    try {
      await fetch('/api/chat-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
        },
        body: JSON.stringify({
          role,
          content,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Failed to save message:', err);
    }
  }, [userId]);

  return {
    messages,
    loading,
    saveMessage,
    setMessages,
  };
}
