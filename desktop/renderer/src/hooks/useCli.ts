import { useCallback, useEffect, useState } from 'react'
import { useChatStore } from '../stores/chatStore'
import { useSessionStore } from '../stores/sessionStore'
import { useTaskStore } from '../stores/taskStore'

function dbg(tag: string, ...args: unknown[]): void {
  console.log(`%c[useCli:${tag}]`, 'color: #4fc3f7', ...args)
}

export function useCli() {
  const { addMessage, setStreaming, messages } = useChatStore()
  const [dangerouslySkipPermissions, setDangerouslySkipPermissions] = useState(false)

  useEffect(() => {
    void window.nexClaw?.cli?.getDangerouslySkipPermissions?.().then((v) => {
      if (typeof v === 'boolean') setDangerouslySkipPermissions(v)
    })
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    dbg('sendMessage', 'content=', content.substring(0, 100))

    const currentMessages = useChatStore.getState().messages
    if (currentMessages.length >= 4) {
      useSessionStore.getState().createRevision(`Before: ${content.substring(0, 50)}`)
      dbg('sendMessage', 'auto-revision saved')
    }

    const id = crypto.randomUUID()
    addMessage({
      id,
      role: 'user',
      content,
      timestamp: Date.now()
    })
    try {
      const taskContext = useTaskStore.getState().getTaskContext()
      await window.nexClaw?.cli?.send(content, taskContext || undefined)
      dbg('sendMessage', 'send() resolved, taskCtx=', !!taskContext)
    } catch (err) {
      dbg('sendMessage', 'send() FAILED:', err)
    }
  }, [addMessage])

  const cancelStream = useCallback(async () => {
    dbg('cancelStream')
    await window.nexClaw?.cli?.cancel()
    setStreaming(false)
  }, [setStreaming])

  const approveTool = useCallback(async (id: string, outcome: 'once' | 'always' | 'no') => {
    dbg('approveTool', 'id=', id, 'outcome=', outcome)
    await window.nexClaw?.cli?.approveTool(id, outcome)
    useChatStore.getState().removePermissionRequest(id)
  }, [])

  const toggleDangerouslySkipPermissions = useCallback(async () => {
    const next = !dangerouslySkipPermissions
    dbg('toggleDangerouslySkipPermissions', next)
    try {
      const result = await window.nexClaw?.cli?.setDangerouslySkipPermissions(next)
      setDangerouslySkipPermissions(typeof result === 'boolean' ? result : next)
    } catch (e) {
      dbg('toggleDangerouslySkipPermissions failed', e)
      return
    }
    if (next) {
      useChatStore.getState().clearPendingPermissions()
      if (useChatStore.getState().isStreaming) {
        useChatStore.getState().setStreaming(false)
      }
    }
  }, [dangerouslySkipPermissions])

  return {
    sendMessage,
    cancelStream,
    approveTool,
    messages,
    dangerouslySkipPermissions,
    toggleDangerouslySkipPermissions,
  }
}
