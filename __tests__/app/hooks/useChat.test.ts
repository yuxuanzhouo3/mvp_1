import { renderHook, act, waitFor } from '@testing-library/react'
import { useChat } from '@/app/hooks/useChat'

// Mock the auth provider
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
}

jest.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}))

// Mock fetch
global.fetch = jest.fn()

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1,
  onopen: null,
  onmessage: null,
  onclose: null,
  onerror: null,
}

global.WebSocket = jest.fn(() => mockWebSocket) as any

describe('useChat Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
    ;(global.WebSocket as jest.Mock).mockClear()
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useChat({ chatId: 'chat-123' }))

    expect(result.current.messages).toEqual([])
    expect(result.current.isConnected).toBe(false)
    expect(result.current.isTyping).toBe(false)
    expect(result.current.typingUsers).toEqual(new Set())
  })

  it('connects to WebSocket when chatId is provided', async () => {
    const { result } = renderHook(() => useChat({ chatId: 'chat-123' }))

    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalledWith(
        'wss://test-ws.example.com/chat/chat-123'
      )
    })

    // Simulate WebSocket connection
    act(() => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen()
      }
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })
  })

  it('loads existing messages on mount', async () => {
    const mockMessages = [
      {
        id: 'msg-1',
        content: 'Hello',
        sender_id: 'user-123',
        chat_id: 'chat-123',
        is_ai: false,
        attachments: [],
        created_at: '2024-01-01T00:00:00Z',
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: mockMessages }),
    })

    const { result } = renderHook(() => useChat({ chatId: 'chat-123' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/messages?chatId=chat-123'
      )
    })

    await waitFor(() => {
      expect(result.current.messages).toEqual(mockMessages)
    })
  })

  it('sends messages via WebSocket and API', async () => {
    const { result } = renderHook(() => useChat({ chatId: 'chat-123' }))

    // Connect WebSocket
    act(() => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen()
      }
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Send message
    await act(async () => {
      await result.current.sendMessage('Hello world')
    })

    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'message',
        message: {
          content: 'Hello world',
          sender_id: 'user-123',
          chat_id: 'chat-123',
          is_ai: false,
          attachments: [],
        },
      })
    )

    expect(global.fetch).toHaveBeenCalledWith('/api/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'Hello world',
        sender_id: 'user-123',
        chat_id: 'chat-123',
        is_ai: false,
        attachments: [],
      }),
    })
  })

  it('handles incoming messages', async () => {
    const onMessageReceived = jest.fn()
    const { result } = renderHook(() =>
      useChat({ 
        chatId: 'chat-123',
        onMessageReceived,
      })
    )

    // Connect WebSocket
    act(() => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen()
      }
    })

    const newMessage = {
      id: 'msg-2',
      content: 'Hi there!',
      sender_id: 'user-456',
      chat_id: 'chat-123',
      is_ai: false,
      attachments: [],
      created_at: '2024-01-01T00:01:00Z',
    }

    // Simulate incoming message
    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: 'message',
            message: newMessage,
          }),
        })
      }
    })

    await waitFor(() => {
      expect(result.current.messages).toContainEqual(newMessage)
      expect(onMessageReceived).toHaveBeenCalledWith(newMessage)
    })
  })

  it('handles typing indicators', async () => {
    const onTyping = jest.fn()
    const { result } = renderHook(() =>
      useChat({ 
        chatId: 'chat-123',
        onTyping,
      })
    )

    // Connect WebSocket
    act(() => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen()
      }
    })

    // Simulate typing start
    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: 'typing_start',
            userId: 'user-456',
          }),
        })
      }
    })

    await waitFor(() => {
      expect(result.current.typingUsers).toContain('user-456')
      expect(onTyping).toHaveBeenCalledWith('user-456', true)
    })

    // Simulate typing stop
    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: 'typing_stop',
            userId: 'user-456',
          }),
        })
      }
    })

    await waitFor(() => {
      expect(result.current.typingUsers).not.toContain('user-456')
      expect(onTyping).toHaveBeenCalledWith('user-456', false)
    })
  })

  it('sends typing indicators', async () => {
    const { result } = renderHook(() => useChat({ chatId: 'chat-123' }))

    // Connect WebSocket
    act(() => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen()
      }
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Send typing indicator
    act(() => {
      result.current.sendTyping(true)
    })

    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'typing',
        userId: 'user-123',
        isTyping: true,
      })
    )

    expect(result.current.isTyping).toBe(true)
  })

  it('handles AI responses', async () => {
    const onMessageReceived = jest.fn()
    const { result } = renderHook(() =>
      useChat({ 
        chatId: 'chat-123',
        onMessageReceived,
      })
    )

    // Connect WebSocket
    act(() => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen()
      }
    })

    const aiMessage = {
      id: 'ai-msg-1',
      content: 'Hello! How can I help you today?',
      sender_id: 'ai-assistant',
      chat_id: 'chat-123',
      is_ai: true,
      attachments: [],
      created_at: '2024-01-01T00:02:00Z',
    }

    // Simulate AI response
    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: 'ai_response',
            message: aiMessage,
          }),
        })
      }
    })

    await waitFor(() => {
      expect(result.current.messages).toContainEqual(aiMessage)
      expect(onMessageReceived).toHaveBeenCalledWith(aiMessage)
    })
  })

  it('sends AI message requests', async () => {
    const { result } = renderHook(() => useChat({ chatId: 'chat-123' }))

    // Connect WebSocket
    act(() => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen()
      }
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Send AI message request
    await act(async () => {
      await result.current.sendAIMessage('Help me with something')
    })

    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'ai_message',
        content: 'Help me with something',
        userId: 'user-123',
        chatId: 'chat-123',
      })
    )
  })

  it('disconnects WebSocket on unmount', () => {
    const { unmount } = renderHook(() => useChat({ chatId: 'chat-123' }))

    unmount()

    expect(mockWebSocket.close).toHaveBeenCalled()
  })

  it('handles WebSocket errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    const { result } = renderHook(() => useChat({ chatId: 'chat-123' }))

    // Simulate WebSocket error
    act(() => {
      if (mockWebSocket.onerror) {
        mockWebSocket.onerror(new Error('Connection failed'))
      }
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()
    })

    consoleSpy.mockRestore()
  })

  it('handles WebSocket close', async () => {
    const { result } = renderHook(() => useChat({ chatId: 'chat-123' }))

    // Connect first
    act(() => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen()
      }
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Simulate close
    act(() => {
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose()
      }
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false)
    })
  })

  it('handles typing timeout', async () => {
    jest.useFakeTimers()
    
    const { result } = renderHook(() => useChat({ chatId: 'chat-123' }))

    // Connect WebSocket
    act(() => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen()
      }
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Start typing
    act(() => {
      result.current.sendTyping(true)
    })

    expect(result.current.isTyping).toBe(true)

    // Fast-forward time to trigger timeout
    act(() => {
      jest.advanceTimersByTime(3000)
    })

    await waitFor(() => {
      expect(result.current.isTyping).toBe(false)
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'typing',
          userId: 'user-123',
          isTyping: false,
        })
      )
    })

    jest.useRealTimers()
  })

  it('does not connect when no chatId is provided', () => {
    renderHook(() => useChat({}))

    expect(global.WebSocket).not.toHaveBeenCalled()
  })

  it('handles fetch errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    )

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    renderHook(() => useChat({ chatId: 'chat-123' }))

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading messages:',
        expect.any(Error)
      )
    })

    consoleSpy.mockRestore()
  })
}) 