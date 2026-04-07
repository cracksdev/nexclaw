import React from 'react'
import { ShieldAlert, Check, X, Infinity } from 'lucide-react'
import type { PermissionRequest } from '../../stores/chatStore'

interface PermissionDialogProps {
  permission: PermissionRequest
  onAllowOnce: () => void
  onAllowAlways: () => void
  onDeny: () => void
}

export function PermissionDialog({
  permission,
  onAllowOnce,
  onAllowAlways,
  onDeny,
}: PermissionDialogProps) {
  const hasAlwaysHint =
    Array.isArray(permission.permissionSuggestions) &&
    permission.permissionSuggestions.length > 0

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <ShieldAlert size={16} className="text-accent" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary mb-1">
            Permission required
          </p>
          <p className="text-xs text-text-secondary mb-2">
            The assistant wants to use{' '}
            <span className="font-mono text-accent font-medium">{permission.tool}</span>
          </p>

          {Object.keys(permission.input).length > 0 && (
            <pre className="text-xs bg-white rounded-lg p-2 overflow-x-auto mb-3 text-text-secondary border border-border">
              {JSON.stringify(permission.input, null, 2)}
            </pre>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAllowOnce}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-btn-primary text-white hover:bg-btn-primary-hover transition-colors"
            >
              <Check size={14} />
              Yes
            </button>
            <button
              type="button"
              onClick={onAllowAlways}
              title={
                hasAlwaysHint
                  ? 'Allow and remember for this project'
                  : 'Allow and mark as permanent preference'
              }
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent/90 text-white hover:bg-accent transition-colors"
            >
              <Infinity size={14} />
              Yes, always
            </button>
            <button
              type="button"
              onClick={onDeny}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-text-secondary hover:bg-bg-hover transition-colors"
            >
              <X size={14} />
              No
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
