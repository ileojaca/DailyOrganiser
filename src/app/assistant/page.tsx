'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, CheckCircle } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolResults?: Array<{ toolName: string; result: string; data?: unknown }>;
  timestamp: Date;
}

function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.split('\n').map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ));
  });
}

export default function AssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasGreeted = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load chat history from Firestore
  useEffect(() => {
    if (!user) {
      setLoadingHistory(false);
      return;
    }

    const loadHistory = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const token = await user.getIdToken();
        const res = await fetch(`/api/chat-history?date=${today}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          const savedMessages = data.messages || [];

          if (savedMessages.length > 0) {
            const formattedMessages: Message[] = savedMessages.map((msg: any, idx: number) => ({
              id: `${idx}`,
              role: msg.role,
              content: msg.content,
              toolResults: msg.toolResults,
              timestamp: new Date(msg.timestamp || new Date()),
            }));

            setMessages(formattedMessages);

            // Rebuild conversation history from saved messages
            const history = savedMessages.map((msg: any) => ({
              role: msg.role,
              content: msg.content,
            }));
            setConversationHistory(history);

            // Mark as already greeted if there are existing messages
            if (formattedMessages.length > 0) {
              hasGreeted.current = true;
            }
          }
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [user]);

  const sendMessage = useCallback(async (text: string, isGreeting = false) => {
    if (!text.trim() || !user) return;

    if (!isGreeting) {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);
    }

    setIsLoading(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          conversationHistory: conversationHistory.slice(-10),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to get response');
      }

      const data = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || "I processed your request.",
        toolResults: data.toolResults?.length > 0 ? data.toolResults : undefined,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: data.response || '' },
      ]);
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: err instanceof Error && err.message === 'AI not configured'
          ? 'AI is not configured yet. Please add your Anthropic API key to get started.'
          : 'Sorry, I ran into an issue. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [user, conversationHistory]);

  useEffect(() => {
    if (user && !hasGreeted.current && !loadingHistory) {
      // Only send greeting if there's no chat history
      if (messages.length === 0) {
        hasGreeted.current = true;
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
        sendMessage(
          `Give me a brief ${timeOfDay} briefing based on my current tasks and status. Be specific and direct.`,
          true
        );
      }
    }
  }, [user, sendMessage, messages, loadingHistory]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const quickActions = [
    'Plan my day',
    "What's urgent?",
    "I'm tired, help",
    'Review my week',
  ];

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-color)' }}>
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">Your AI Assistant</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Always here to help you</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && !isLoading && loadingHistory && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400 dark:text-gray-500">Loading chat history...</p>
            </div>
          )}

          {messages.length === 0 && !isLoading && !loadingHistory && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400 dark:text-gray-500">Starting up...</p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? (
                <div className="ml-auto max-w-[80%] bg-accent text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm"
                  style={{ background: 'var(--accent-color)' }}>
                  {msg.content}
                </div>
              ) : (
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-color)' }}>
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 dark:text-gray-200 shadow-sm">
                    <div>{renderContent(msg.content)}</div>
                    {msg.toolResults?.map(tr => (
                      <div key={tr.toolName} className="mt-2 flex items-center gap-1.5 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                        <CheckCircle className="w-3 h-3" />
                        <span>{tr.result}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-color)' }}>
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 pt-3 pb-2">
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {quickActions.map(action => (
              <button
                key={action}
                onClick={() => sendMessage(action)}
                disabled={isLoading}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
                style={{ '--hover-color': 'var(--accent-color)' } as React.CSSProperties}
              >
                {action}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent overflow-hidden"
              style={{ '--tw-ring-color': 'color-mix(in srgb, var(--accent-color) 30%, transparent)' } as React.CSSProperties}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-11 h-11 flex items-center justify-center text-white rounded-xl font-bold disabled:opacity-40 shadow-sm flex-shrink-0 transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-color)' }}
            >
              →
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1 text-center">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </AppShell>
  );
}
