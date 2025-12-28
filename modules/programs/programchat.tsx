'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { useAuth } from '@/context/authcontext'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type ProgramChatProps = {
  programId: string
  programName: string
  onProgramUpdated?: () => void
}

export default function ProgramChat({ programId, programName, onProgramUpdated }: ProgramChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || !user?.id) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/generate-programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          programId,
          programName,
          message: userMessage.content,
          conversationHistory: messages,
          trainerId: user.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || `Failed to generate program (${response.status})`)
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message || 'I apologize, but I could not generate a response.',
      }

      setMessages(prev => [...prev, assistantMessage])

      // If a program was updated/created, refresh the program view
      if (data.type === 'program' && onProgramUpdated) {
        onProgramUpdated()
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: error instanceof Error 
          ? `Error: ${error.message}` 
          : 'Sorry, there was an error processing your request. Please try again.',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-[#2a2a2a]">
        <h3 className="text-lg font-semibold text-white">Program Generator</h3>
        <p className="text-sm text-gray-400 mt-1">Chat with AI to generate program content</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <p>Start a conversation to generate program content</p>
            <p className="text-sm mt-2">Try: "Create a 4-week strength program"</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-orange-500 text-white'
                  : 'bg-[#111111] border border-[#2a2a2a] text-gray-300'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#111111] border border-[#2a2a2a] text-gray-300 rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#2a2a2a]">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 bg-[#111111] border border-[#2a2a2a] rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

