import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from '../../stores/chatStore'
import { ToolResultCard } from '../Tools/ToolResultCard'
import { User, Sparkles, Terminal } from 'lucide-react'

interface MessageBubbleProps {
  message: ChatMessage
}

const markdownCode =
  ({ isUser }: { isUser: boolean }) =>
  function Code({
    className,
    children,
    ...props
  }: React.ComponentProps<'code'>) {
    const match = /language-(\w+)/.exec(className || '')
    const isBlock =
      Boolean(match) ||
      (typeof children === 'string' && children.includes('\n'))
    if (isBlock) {
      return (
        <div className="relative group">
          {match && (
            <span className="absolute top-2 right-2 text-[10px] text-text-muted opacity-60">
              {match[1]}
            </span>
          )}
          <pre className={isUser ? '!bg-white/10' : '!bg-gray-50'}>
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      )
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  }

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const isAssistant = !isUser && !isSystem

  const proseBase =
    'prose prose-sm max-w-none [&_pre]:rounded-xl [&_pre]:p-3 [&_pre]:overflow-x-auto [&_code]:text-xs [&_a]:no-underline hover:[&_a]:underline [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_blockquote]:border-accent/40 [&_blockquote]:text-text-secondary [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_table]:text-xs'

  const proseUser = `${proseBase} prose-invert [&_pre]:!bg-white/10 [&_code]:text-white/90 [&_a]:text-white/90`
  const proseAssistant = `${proseBase} [&_pre]:bg-gray-50 [&_code]:text-accent [&_a]:text-accent`
  const proseSystem = `${proseBase} [&_pre]:bg-gray-50 [&_code]:text-accent [&_a]:text-accent`

  const mdComponentsUser = useMemo(
    () => ({ code: markdownCode({ isUser: true }) }),
    [],
  )
  const mdComponentsDefault = useMemo(
    () => ({ code: markdownCode({ isUser: false }) }),
    [],
  )

  const bubbleShell = (isUserRole: boolean, isSystemRole: boolean) =>
    `inline-block text-left rounded-2xl px-4 py-2.5 max-w-[85%] text-[13px] leading-relaxed ${
      isUserRole
        ? 'bg-btn-primary text-white'
        : isSystemRole
          ? 'bg-accent/5 text-text-primary border border-accent/15'
          : 'bg-bg-secondary/80 text-text-primary border border-border/50'
    }`

  const hasPre = message.content.trim().length > 0
  const hasPost = (message.contentAfterTools ?? '').trim().length > 0
  const hasTools = Boolean(message.toolUse && message.toolUse.length > 0)

  return (
    <div className={`flex gap-3 py-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`
        w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5
        ${isUser ? 'bg-btn-primary text-white' : isSystem ? 'bg-accent/10 text-accent' : 'bg-accent/10 text-accent'}
      `}
      >
        {isUser ? <User size={13} /> : isSystem ? <Terminal size={13} /> : <Sparkles size={13} />}
      </div>

      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        {isAssistant ? (
          <div className="flex flex-col gap-2 max-w-[85%] text-left items-start">
            {hasPre && (
              <div className={bubbleShell(false, false)}>
                <div className={proseAssistant}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponentsDefault}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            {hasTools && (
              <div className="w-full space-y-2">
                {message.toolUse!.map((tool) => (
                  <ToolResultCard key={tool.id} toolUse={tool} />
                ))}
              </div>
            )}
            {hasPost && (
              <div className={bubbleShell(false, false)}>
                <div className={proseAssistant}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponentsDefault}>
                    {message.contentAfterTools ?? ''}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            {message.isStreaming && <span className="streaming-cursor ml-0.5" />}
          </div>
        ) : (
          <div className={`${bubbleShell(isUser, isSystem)}`}>
            <div className={isUser ? proseUser : proseSystem}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={isUser ? mdComponentsUser : mdComponentsDefault}
              >
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && <span className="streaming-cursor" />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
