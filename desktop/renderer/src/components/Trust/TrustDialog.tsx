import React, { useEffect, useState } from 'react'
import { ShieldCheck, FolderOpen, AlertTriangle, ExternalLink } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'

interface TrustDialogProps {
  folder: string
  onTrust: () => void
  onExit: () => void
}

export function TrustDialog({ folder, onTrust, onExit }: TrustDialogProps) {
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected(0)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected(1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (selected === 0) onTrust()
        else onExit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onExit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selected, onTrust, onExit])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-bg-primary border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-accent/10">
              <ShieldCheck size={24} className="text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Accessing workspace:</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-3 bg-bg-secondary rounded-lg border border-border mb-5">
            <FolderOpen size={16} className="text-accent shrink-0" />
            <p className="text-sm font-mono text-text-primary truncate">{folder}</p>
          </div>

          <div className="flex items-start gap-3 mb-5 px-1">
            <AlertTriangle size={16} className="text-yellow-500 mt-0.5 shrink-0" />
            <div className="text-sm text-text-secondary leading-relaxed">
              <p className="mb-2">
                Quick safety check: Is this a project you created or one you trust?
                (Like your own code, a well-known open source project, or work from your team).
                If not, take a moment to review what's in this folder first.
              </p>
              <p className="text-text-muted">
                NexClaw will be able to <span className="text-text-primary font-medium">read, edit, and execute</span> files here.
              </p>
            </div>
          </div>

          <a
            href="https://docs.anthropic.com/en/docs/claude-code/security"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline mb-5 px-1"
          >
            <ExternalLink size={12} />
            Security guide
          </a>

          <div className="space-y-2">
            <button
              onClick={onTrust}
              onMouseEnter={() => setSelected(0)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                selected === 0
                  ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                  : 'border-border hover:border-accent/30'
              }`}
            >
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selected === 0 ? 'border-accent' : 'border-border'
              }`}>
                {selected === 0 && <span className="w-2.5 h-2.5 rounded-full bg-accent" />}
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">1. Yes, I trust this folder</p>
              </div>
            </button>

            <button
              onClick={onExit}
              onMouseEnter={() => setSelected(1)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                selected === 1
                  ? 'border-red-400 bg-red-50 ring-2 ring-red-200'
                  : 'border-border hover:border-red-300'
              }`}
            >
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selected === 1 ? 'border-red-400' : 'border-border'
              }`}>
                {selected === 1 && <span className="w-2.5 h-2.5 rounded-full bg-red-400" />}
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">2. No, exit</p>
              </div>
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-bg-secondary border-t border-border">
          <p className="text-[11px] text-text-muted text-center">
            Enter to confirm · Esc to cancel · ↑↓ to select
          </p>
        </div>
      </div>
    </div>
  )
}

export function useTrustCheck() {
  const { workingDirectory } = useSettingsStore()
  const [showTrustDialog, setShowTrustDialog] = useState(false)
  const [trustedFolder, setTrustedFolder] = useState<string | null>(null)
  const [checkDone, setCheckDone] = useState(false)

  useEffect(() => {
    if (!workingDirectory) {
      setCheckDone(true)
      return
    }

    window.nexClaw?.config?.isFolderTrusted(workingDirectory).then((trusted) => {
      if (trusted) {
        setTrustedFolder(workingDirectory)
        setCheckDone(true)
      } else {
        setShowTrustDialog(true)
        setCheckDone(true)
      }
    }).catch(() => {
      setCheckDone(true)
    })
  }, [workingDirectory])

  const handleTrust = () => {
    if (workingDirectory) {
      window.nexClaw?.config?.saveTrustedFolder(workingDirectory)
      setTrustedFolder(workingDirectory)
    }
    setShowTrustDialog(false)
  }

  const handleExit = () => {
    setShowTrustDialog(false)
    useSettingsStore.getState().setWorkingDirectory('')
  }

  return {
    showTrustDialog,
    trustedFolder,
    checkDone,
    currentFolder: workingDirectory,
    handleTrust,
    handleExit,
  }
}
