import { create } from 'zustand'

export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskSource = 'user' | 'ai'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  source: TaskSource
  createdAt: number
  updatedAt: number
}

interface TodoWriteItem {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
}

function mapTodoStatus(status: string): TaskStatus {
  switch (status) {
    case 'in_progress':
      return 'in_progress'
    case 'completed':
      return 'done'
    case 'cancelled':
      return 'done'
    default:
      return 'backlog'
  }
}

function mapTodoPriority(idx: number, total: number): TaskPriority {
  if (total <= 2) return 'high'
  if (idx === 0) return 'high'
  if (idx < total / 2) return 'medium'
  return 'low'
}

interface TaskState {
  tasks: Task[]
  projectDir: string | null
  _saveTimer: ReturnType<typeof setTimeout> | null

  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTask: (id: string, update: Partial<Task>) => void
  moveTask: (id: string, status: TaskStatus) => void
  deleteTask: (id: string) => void
  loadFromProject: (dir: string) => Promise<void>
  saveToProject: () => void
  syncFromTodoWrite: (todos: TodoWriteItem[], merge: boolean) => void
  getTaskContext: () => string
  setTasks: (tasks: Task[]) => void
}

function scheduleSave(state: TaskState): void {
  if (state._saveTimer) clearTimeout(state._saveTimer)
  const timer = setTimeout(() => {
    const s = useTaskStore.getState()
    if (s.projectDir && window.nexClaw?.tasks) {
      window.nexClaw.tasks.save(s.projectDir, s.tasks).catch(() => {})
    }
  }, 500)
  useTaskStore.setState({ _saveTimer: timer })
}

export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  projectDir: null,
  _saveTimer: null,

  addTask: (task) => {
    set((state) => ({
      tasks: [
        ...state.tasks,
        {
          ...task,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    }))
    scheduleSave(get())
  },

  updateTask: (id, update) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...update, updatedAt: Date.now() } : t
      ),
    }))
    scheduleSave(get())
  },

  moveTask: (id, status) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status, updatedAt: Date.now() } : t
      ),
    }))
    scheduleSave(get())
  },

  deleteTask: (id) => {
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }))
    scheduleSave(get())
  },

  setTasks: (tasks) => {
    set({ tasks })
    scheduleSave(get())
  },

  loadFromProject: async (dir) => {
    set({ projectDir: dir })
    try {
      const raw = await window.nexClaw?.tasks?.load(dir)
      if (Array.isArray(raw) && raw.length > 0) {
        const tasks = raw.map((t: Record<string, unknown>) => ({
          id: (t.id as string) || crypto.randomUUID(),
          title: (t.title as string) || '',
          description: (t.description as string) || '',
          status: (['backlog', 'in_progress', 'review', 'done'].includes(t.status as string)
            ? t.status
            : 'backlog') as TaskStatus,
          priority: (['low', 'medium', 'high'].includes(t.priority as string)
            ? t.priority
            : 'medium') as TaskPriority,
          source: (t.source === 'ai' ? 'ai' : 'user') as TaskSource,
          createdAt: (t.createdAt as number) || Date.now(),
          updatedAt: (t.updatedAt as number) || Date.now(),
        }))
        set({ tasks })
      } else {
        set({ tasks: [] })
      }
    } catch {
      set({ tasks: [] })
    }
  },

  saveToProject: () => {
    const { projectDir, tasks } = get()
    if (projectDir && window.nexClaw?.tasks) {
      window.nexClaw.tasks.save(projectDir, tasks).catch(() => {})
    }
  },

  syncFromTodoWrite: (todos, merge) => {
    set((state) => {
      if (merge) {
        const existing = [...state.tasks]
        const existingByContent = new Map<string, Task>()
        for (const t of existing) {
          existingByContent.set(t.title.toLowerCase().trim(), t)
        }

        const updatedIds = new Set<string>()
        const newTasks: Task[] = []

        for (let i = 0; i < todos.length; i++) {
          const todo = todos[i]
          const key = todo.content.toLowerCase().trim()
          const match = existingByContent.get(key)

          if (match) {
            updatedIds.add(match.id)
            const newStatus = mapTodoStatus(todo.status)
            if (match.status !== newStatus) {
              const idx = existing.findIndex((t) => t.id === match.id)
              if (idx >= 0) {
                existing[idx] = {
                  ...existing[idx],
                  status: newStatus,
                  updatedAt: Date.now(),
                }
              }
            }
          } else {
            newTasks.push({
              id: crypto.randomUUID(),
              title: todo.content,
              description: '',
              status: mapTodoStatus(todo.status),
              priority: mapTodoPriority(i, todos.length),
              source: 'ai',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })
          }
        }

        return { tasks: [...existing, ...newTasks] }
      }

      const tasks: Task[] = todos.map((todo, i) => ({
        id: crypto.randomUUID(),
        title: todo.content,
        description: '',
        status: mapTodoStatus(todo.status),
        priority: mapTodoPriority(i, todos.length),
        source: 'ai' as TaskSource,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }))

      const userTasks = state.tasks.filter((t) => t.source === 'user')
      return { tasks: [...userTasks, ...tasks] }
    })
    scheduleSave(get())
  },

  getTaskContext: () => {
    const { tasks } = get()
    if (tasks.length === 0) return ''

    const lines = ['[Current project tasks:]']
    const byStatus: Record<string, Task[]> = {}
    for (const t of tasks) {
      if (!byStatus[t.status]) byStatus[t.status] = []
      byStatus[t.status].push(t)
    }

    const order: TaskStatus[] = ['in_progress', 'backlog', 'review', 'done']
    for (const status of order) {
      const group = byStatus[status]
      if (!group?.length) continue
      for (const t of group) {
        const label = status === 'in_progress' ? 'IN PROGRESS'
          : status === 'done' ? 'DONE'
          : status === 'review' ? 'REVIEW'
          : 'BACKLOG'
        lines.push(`- [${label}] ${t.title}${t.source === 'user' ? ' (user-added)' : ''}`)
      }
    }

    return lines.join('\n')
  },
}))
