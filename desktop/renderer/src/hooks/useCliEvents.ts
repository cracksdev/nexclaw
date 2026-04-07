import { useEffect, useRef } from 'react'
import { useChatStore } from '../stores/chatStore'
import { useSessionStore } from '../stores/sessionStore'
import { useCliSessionStore } from '../stores/cliSessionStore'
import { useTaskStore } from '../stores/taskStore'
import { useActivityIslandStore } from '../stores/activityIslandStore'

function dbg(tag: string, ...args: unknown[]): void {
  console.log(`%c[cliEvents:${tag}]`, 'color: #81c784', ...args)
}

export function useCliEvents() {
  const writingBriefRef = useRef(false)

  useEffect(() => {
    if (!window.nexClaw?.cli) {
      dbg('init', 'CLI bridge not available')
      return
    }
    dbg('init', 'Registering global CLI event listener at App level')

    const cleanup = window.nexClaw.cli.onEvent((event: CliEvent) => {
      const store = useChatStore.getState()
      const sessionStore = useSessionStore.getState()

      switch (event.event) {
        case 'message_start': {
          const id = (event.id as string) || crypto.randomUUID()
          dbg('message_start', 'id=', id)
          writingBriefRef.current = false
          useActivityIslandStore.getState().startAssistantTurn()
          store.addMessage({
            id,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            isStreaming: true
          })
          store.setStreaming(true, id)
          break
        }

        case 'content_delta': {
          const id = store.currentStreamingId
          const delta = typeof event.delta === 'string' ? event.delta : ''
          if (id && delta) {
            const msg = useChatStore.getState().messages.find((m) => m.id === id)
            const afterTools = Boolean(msg?.toolUse && msg.toolUse.length > 0)
            store.appendToMessage(id, delta, afterTools)
            if (delta.trim() && !writingBriefRef.current) {
              writingBriefRef.current = true
              useActivityIslandStore.getState().noteWritingResponse()
            }
          }
          break
        }

        case 'message_complete': {
          const id =
            (typeof event.id === 'string' && event.id
              ? event.id
              : store.currentStreamingId) || null
          dbg('message_complete', 'id=', id, 'exitCode=', event.exitCode)
          if (id) {
            const messages = useChatStore.getState().messages
            const msg = messages.find((m) => m.id === id)
            const toolUse = msg?.toolUse?.map((t) =>
              t.status === 'running'
                ? { ...t, status: 'complete' as const }
                : t,
            )
            store.updateMessage(id, {
              isStreaming: false,
              ...(toolUse ? { toolUse } : {}),
            })
          }
          store.setStreaming(false)
          useActivityIslandStore.getState().onTurnComplete()
          sessionStore.saveCurrentMessages(useChatStore.getState().messages)
          break
        }

        case 'usage_update': {
          const input = Number(event.input_tokens ?? 0)
          const output = Number(event.output_tokens ?? 0)
          if (input > 0 || output > 0) {
            useActivityIslandStore.getState().applyUsage(input, output)
          }
          break
        }

        case 'tool_use': {
          const id = store.currentStreamingId
          const toolName = event.tool as string
          dbg('tool_use', 'tool=', toolName)
          useActivityIslandStore.getState().noteToolUse(toolName)
          if (id) {
            store.addToolUse(id, {
              id: (event.id as string) || crypto.randomUUID(),
              tool: toolName,
              input: (event.input as Record<string, unknown>) || {},
              status: 'running'
            })
          }

          const input = (event.input as Record<string, unknown>) || {}

          if (toolName === 'TodoWrite' || toolName === 'todo_write') {
            const todos = input.todos as Array<{ id: string; content: string; status: string }> | undefined
            const merge = input.merge as boolean ?? true
            if (Array.isArray(todos) && todos.length > 0) {
              dbg('todo_write', 'syncing', todos.length, 'todos, merge=', merge)
              useTaskStore.getState().syncFromTodoWrite(
                todos.map((t) => ({
                  id: t.id || crypto.randomUUID(),
                  content: t.content || '',
                  status: (t.status as 'pending' | 'in_progress' | 'completed' | 'cancelled') || 'pending',
                })),
                merge
              )
            }
          }

          if (toolName === 'TaskCreate' || toolName === 'task_create') {
            const subject = (input.subject as string) || (input.title as string) || ''
            const description = (input.description as string) || ''
            if (subject) {
              dbg('task_create', 'subject=', subject)
              useTaskStore.getState().addTask({
                title: subject,
                description,
                status: 'backlog',
                priority: 'medium',
                source: 'ai',
              })
            }
          }

          if (toolName === 'TaskUpdate' || toolName === 'task_update') {
            const taskId = (input.task_id as string) || (input.id as string) || ''
            const status = input.status as string | undefined
            if (taskId && status) {
              dbg('task_update', 'id=', taskId, 'status=', status)
              const mappedStatus = status === 'completed' ? 'done'
                : status === 'in_progress' ? 'in_progress'
                : status === 'pending' ? 'backlog'
                : undefined
              if (mappedStatus) {
                const tasks = useTaskStore.getState().tasks
                const match = tasks.find((t) =>
                  t.id === taskId || t.title.toLowerCase().includes(taskId.toLowerCase())
                )
                if (match) {
                  useTaskStore.getState().moveTask(match.id, mappedStatus)
                }
              }
            }
          }
          break
        }

        case 'tool_result': {
          const msgId = store.currentStreamingId
          const toolUseId =
            typeof event.tool_use_id === 'string'
              ? event.tool_use_id
              : String(event.tool_use_id ?? '')
          if (msgId && toolUseId) {
            const failed = event.is_error === true
            store.updateToolUse(msgId, toolUseId, {
              output: typeof event.output === 'string' ? event.output : String(event.output ?? ''),
              status: failed ? 'error' : 'complete',
            })
          }
          break
        }

        case 'permission_request': {
          dbg('permission_request', 'tool=', event.tool)
          const permTool = (event.tool as string) || 'tool'
          useActivityIslandStore.getState().setBrief(`Approve ${permTool}?`)
          store.addPermissionRequest({
            id: (event.id as string) || crypto.randomUUID(),
            tool: event.tool as string,
            input: (event.input as Record<string, unknown>) || {},
            permissionSuggestions: event.permission_suggestions as unknown[] | undefined,
          })
          break
        }

        case 'error': {
          const errMsg = event.message as string
          dbg('error', errMsg)
          const streamId = store.currentStreamingId
          if (streamId) {
            const m = useChatStore.getState().messages.find((x) => x.id === streamId)
            const afterTools = Boolean(m?.toolUse && m.toolUse.length > 0)
            store.appendToMessage(streamId, `\n\n**Error:** ${errMsg}`, afterTools)
            store.updateMessage(streamId, { isStreaming: false })
          } else {
            store.addMessage({
              id: crypto.randomUUID(),
              role: 'system',
              content: errMsg,
              timestamp: Date.now()
            })
          }
          store.setStreaming(false)
          useActivityIslandStore.getState().onError(errMsg)
          break
        }

        case 'system': {
          const sysData = event.data as Record<string, unknown> | undefined
          dbg('system', 'subtype=', event.subtype, 'hasData=', !!sysData, 'keys=', sysData ? Object.keys(sysData).join(',') : 'none')

          if (event.subtype === 'init' && sysData) {
            dbg('system:init', 'tools=', (sysData.tools as unknown[])?.length,
              'mcp_servers=', (sysData.mcp_servers as unknown[])?.length,
              'skills=', (sysData.skills as unknown[])?.length,
              'plugins=', (sysData.plugins as unknown[])?.length,
              'model=', sysData.model)

            useCliSessionStore.getState().setInitData(sysData)

            if (sysData.cwd) {
              const currentSessionId = sessionStore.activeSessionId
              if (currentSessionId) {
                sessionStore.setSessionProject(currentSessionId, sysData.cwd as string)
              }
            }
          }
          break
        }

        case 'log':
        case 'ready':
        case 'raw':
          break
      }
    })

    return cleanup
  }, [])
}
