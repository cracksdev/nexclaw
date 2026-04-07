import React, { useState, useCallback } from 'react'
import {
  Plus,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle2,
  Eye,
  Sparkles,
  User,
  Send,
  ChevronDown,
  ListChecks,
} from 'lucide-react'
import { useTaskStore, type TaskStatus, type TaskPriority, type Task } from '../../stores/taskStore'
import { useCli } from '../../hooks/useCli'
import { useNavigationStore } from '../../stores/navigationStore'

const COLUMNS: { id: TaskStatus; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'backlog', label: 'Backlog', icon: Clock, color: 'text-text-muted' },
  { id: 'in_progress', label: 'In Progress', icon: AlertCircle, color: 'text-blue-500' },
  { id: 'review', label: 'Review', icon: Eye, color: 'text-purple-500' },
  { id: 'done', label: 'Done', icon: CheckCircle2, color: 'text-green-500' },
]

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-blue-50 text-blue-600 border-blue-200',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  high: 'bg-red-50 text-red-600 border-red-200',
}

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  backlog: 'border-t-gray-300',
  in_progress: 'border-t-blue-400',
  review: 'border-t-purple-400',
  done: 'border-t-green-400',
}

function SourceBadge({ source }: { source: 'user' | 'ai' }) {
  if (source === 'ai') {
    return (
      <span className="flex items-center gap-0.5 text-[9px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded">
        <Sparkles size={9} />
        AI
      </span>
    )
  }
  return (
    <span className="flex items-center gap-0.5 text-[9px] font-medium text-text-muted bg-bg-secondary px-1.5 py-0.5 rounded">
      <User size={9} />
      You
    </span>
  )
}

function TaskCard({ task, onDelete, onMove, onEdit }: {
  task: Task
  onDelete: () => void
  onMove: (status: TaskStatus) => void
  onEdit: (update: Partial<Task>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle.trim() !== task.title) {
      onEdit({ title: editTitle.trim() })
    }
    setEditing(false)
  }

  return (
    <div className={`bg-bg-primary border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-all group ${
      task.status === 'in_progress' && task.source === 'ai' ? 'ring-1 ring-accent/30' : ''
    }`}>
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${PRIORITY_STYLES[task.priority]}`}>
            {task.priority}
          </span>
          <SourceBadge source={task.source} />
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-text-muted hover:text-error transition-all"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {editing ? (
        <input
          autoFocus
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSaveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveTitle()
            if (e.key === 'Escape') { setEditTitle(task.title); setEditing(false) }
          }}
          className="w-full text-sm font-medium text-text-primary bg-transparent outline-none border-b border-accent/40 mb-1"
        />
      ) : (
        <p
          className={`text-sm font-medium mb-1 cursor-text ${
            task.status === 'done' ? 'text-text-muted line-through' : 'text-text-primary'
          }`}
          onClick={() => setEditing(true)}
        >
          {task.title}
        </p>
      )}

      {task.description && (
        <p className="text-xs text-text-muted mb-2 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-muted">{formatDate(task.updatedAt)}</span>
        <div className="relative">
          <select
            value={task.status}
            onChange={(e) => onMove(e.target.value as TaskStatus)}
            className="text-[10px] bg-transparent text-text-muted border-none outline-none cursor-pointer hover:text-text-primary appearance-none pr-3"
          >
            {COLUMNS.map((col) => (
              <option key={col.id} value={col.id}>{col.label}</option>
            ))}
          </select>
          <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
      </div>
    </div>
  )
}

function QuickAddInput({ onSubmit }: {
  onSubmit: (title: string) => void
}) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim())
      setValue('')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 relative">
        <Plus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
          }}
          placeholder="Add a task to backlog..."
          className="w-full bg-bg-secondary border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 transition-colors"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-btn-primary text-white hover:bg-btn-primary-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Add
      </button>
    </div>
  )
}

function NewTaskForm({ onSubmit, onCancel, defaultStatus }: {
  onSubmit: (task: { title: string; description: string; priority: TaskPriority; status: TaskStatus }) => void
  onCancel: () => void
  defaultStatus: TaskStatus
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')

  return (
    <div className="bg-bg-primary border border-accent/30 rounded-lg p-3 shadow-sm space-y-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        className="w-full bg-transparent text-sm font-medium text-text-primary placeholder-text-muted outline-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && title.trim()) {
            onSubmit({ title: title.trim(), description, priority, status: defaultStatus })
          }
          if (e.key === 'Escape') onCancel()
        }}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full bg-transparent text-xs text-text-secondary placeholder-text-muted outline-none resize-none"
      />
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={`text-[10px] font-medium px-2 py-0.5 rounded border transition-colors ${
                priority === p ? PRIORITY_STYLES[p] : 'border-border text-text-muted hover:border-border'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={onCancel} className="text-xs text-text-muted hover:text-text-primary px-2 py-1 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => title.trim() && onSubmit({ title: title.trim(), description, priority, status: defaultStatus })}
            disabled={!title.trim()}
            className="text-xs bg-btn-primary text-white px-3 py-1 rounded-md hover:bg-btn-primary-hover disabled:opacity-30 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

function ProgressHeader({ tasks }: { tasks: Task[] }) {
  const total = tasks.length
  if (total === 0) return null

  const done = tasks.filter((t) => t.status === 'done').length
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 h-2 bg-bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct === 100
              ? 'rgb(34, 197, 94)'
              : 'linear-gradient(90deg, rgb(234, 88, 12), rgb(59, 130, 246))',
          }}
        />
      </div>
      <div className="flex items-center gap-3 text-xs text-text-muted shrink-0">
        <span><span className="font-semibold text-green-600">{done}</span> done</span>
        <span><span className="font-semibold text-blue-500">{inProgress}</span> active</span>
        <span><span className="font-semibold text-text-primary">{total}</span> total</span>
        <span className="font-semibold text-text-primary">{pct}%</span>
      </div>
    </div>
  )
}

export function TaskBoard() {
  const { tasks, addTask, updateTask, moveTask, deleteTask } = useTaskStore()
  const { sendMessage } = useCli()
  const { setPage } = useNavigationStore()
  const [addingTo, setAddingTo] = useState<TaskStatus | null>(null)

  const handleQuickAdd = useCallback((title: string) => {
    addTask({
      title,
      description: '',
      status: 'backlog',
      priority: 'medium',
      source: 'user',
    })
  }, [addTask])

  const handleSendBacklogToClaude = useCallback(() => {
    const backlogTasks = tasks.filter((t) => t.status === 'backlog')
    if (backlogTasks.length === 0) return

    const taskList = backlogTasks.map((t) => `- ${t.title}`).join('\n')
    const prompt = `I have the following tasks in my backlog. Please work through them systematically, updating the task status as you go:\n\n${taskList}`

    setPage('chat')
    setTimeout(() => sendMessage(prompt), 100)
  }, [tasks, sendMessage, setPage])

  const backlogCount = tasks.filter((t) => t.status === 'backlog').length

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="px-6 py-5 border-b border-border">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent/10">
                <ListChecks size={20} className="text-accent" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-text-primary">Tasks</h1>
                <p className="text-xs text-text-muted mt-0.5">
                  {tasks.length === 0
                    ? 'Add tasks manually or let Claude create them from your conversations'
                    : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} across ${new Set(tasks.map((t) => t.status)).size} columns`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {backlogCount > 0 && (
                <button
                  onClick={handleSendBacklogToClaude}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-accent/30 text-accent hover:bg-accent/5 transition-colors"
                >
                  <Send size={13} />
                  Send {backlogCount} to Claude
                </button>
              )}
              <button
                onClick={() => setAddingTo('backlog')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-btn-primary text-white hover:bg-btn-primary-hover transition-colors"
              >
                <Plus size={16} />
                New Task
              </button>
            </div>
          </div>

          <ProgressHeader tasks={tasks} />

          <QuickAddInput onSubmit={handleQuickAdd} />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto px-6 py-4">
        <div className="flex gap-3 min-h-0 h-full max-w-7xl mx-auto">
          {COLUMNS.map(({ id, label, icon: Icon, color }) => {
            const columnTasks = tasks.filter((t) => t.status === id)
            return (
              <div key={id} className="flex-1 min-w-[260px] flex flex-col">
                <div className={`flex items-center justify-between mb-2.5 px-2 pb-2 border-b-2 ${
                  id === 'in_progress' ? 'border-blue-400' :
                  id === 'done' ? 'border-green-400' :
                  id === 'review' ? 'border-purple-400' :
                  'border-gray-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={color} />
                    <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">{label}</span>
                    <span className="text-[10px] bg-bg-secondary text-text-muted px-1.5 py-0.5 rounded-full font-medium">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setAddingTo(id)}
                    className="p-0.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 rounded-lg bg-bg-secondary/30 p-2">
                  {addingTo === id && (
                    <NewTaskForm
                      defaultStatus={id}
                      onSubmit={(task) => {
                        addTask({ ...task, source: 'user' })
                        setAddingTo(null)
                      }}
                      onCancel={() => setAddingTo(null)}
                    />
                  )}
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDelete={() => deleteTask(task.id)}
                      onMove={(status) => moveTask(task.id, status)}
                      onEdit={(update) => updateTask(task.id, update)}
                    />
                  ))}
                  {columnTasks.length === 0 && addingTo !== id && (
                    <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                      <Icon size={20} className="mb-2 opacity-30" />
                      <p className="text-xs">No tasks</p>
                      {id === 'backlog' && (
                        <p className="text-[10px] mt-1 text-center max-w-[180px]">
                          Add tasks here or send a message — Claude will create them automatically
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
