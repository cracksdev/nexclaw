import React from 'react'
import {
  MessageSquare,
  Clock,
  Zap,
  TrendingUp,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { useSessionStore } from '../../stores/sessionStore'
import { useTaskStore } from '../../stores/taskStore'
import { useNavigationStore } from '../../stores/navigationStore'

function StatCard({ icon: Icon, label, value, accent = false }: {
  icon: React.ElementType
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div className="bg-bg-primary border border-border rounded-xl p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${accent ? 'bg-accent/10' : 'bg-bg-secondary'}`}>
        <Icon size={20} className={accent ? 'text-accent' : 'text-text-secondary'} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-text-primary">{value}</p>
        <p className="text-xs text-text-muted mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { sessions } = useSessionStore()
  const { tasks } = useTaskStore()
  const { setPage } = useNavigationStore()

  const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0)
  const activeTasks = tasks.filter((t) => t.status === 'in_progress').length
  const completedTasks = tasks.filter((t) => t.status === 'done').length

  const recentSessions = [...sessions]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5)

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">Overview of your activity and tasks</p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard icon={MessageSquare} label="Chat Sessions" value={sessions.length} accent />
          <StatCard icon={Zap} label="Total Messages" value={totalMessages} />
          <StatCard icon={TrendingUp} label="Active Tasks" value={activeTasks} accent />
          <StatCard icon={Clock} label="Completed Tasks" value={completedTasks} />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-bg-primary border border-border rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-text-primary">Recent Sessions</h2>
              <button
                onClick={() => setPage('chat')}
                className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-border">
              {recentSessions.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <MessageSquare size={24} className="mx-auto text-text-muted mb-2" />
                  <p className="text-xs text-text-muted">No sessions yet. Start a chat!</p>
                </div>
              )}
              {recentSessions.map((session) => (
                <div key={session.id} className="px-5 py-3 hover:bg-bg-hover transition-colors cursor-pointer" onClick={() => setPage('chat')}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary truncate max-w-[250px]">{session.title}</p>
                    <span className="text-[10px] text-text-muted shrink-0 ml-2">{formatTime(session.updatedAt)}</span>
                  </div>
                  <p className="text-xs text-text-muted truncate mt-0.5">{session.preview || 'Empty session'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-bg-primary border border-border rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-text-primary">Quick Actions</h2>
            </div>
            <div className="p-5 space-y-3">
              <button
                onClick={() => setPage('chat')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-accent/40 hover:bg-accent/5 transition-all text-left group"
              >
                <MessageSquare size={18} className="text-accent shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">New Chat</p>
                  <p className="text-xs text-text-muted">Start a conversation with Claude</p>
                </div>
              </button>
              <button
                onClick={() => setPage('tasks')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-accent/40 hover:bg-accent/5 transition-all text-left group"
              >
                <Zap size={18} className="text-accent shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">Create Task</p>
                  <p className="text-xs text-text-muted">Add a task to your board</p>
                </div>
              </button>
              <button
                onClick={() => setPage('skills')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-accent/40 hover:bg-accent/5 transition-all text-left group"
              >
                <Sparkles size={18} className="text-accent shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">Browse Skills</p>
                  <p className="text-xs text-text-muted">Explore available agent skills</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
