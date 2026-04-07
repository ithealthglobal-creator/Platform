'use client'

import { useState } from 'react'
import { WarningAlt, Checkmark, Close, Edit } from '@carbon/icons-react'
import { Button } from '@/components/ui/button'

interface ApprovalCardProps {
  toolCalls: Array<{
    name: string
    args: Record<string, unknown>
    id: string
  }>
  message: string
  onApprove: () => void
  onReject: () => void
  onEdit?: (modifiedArgs: Record<string, unknown>) => void
}

export function ApprovalCard({ toolCalls, message, onApprove, onReject, onEdit }: ApprovalCardProps) {
  const [editMode, setEditMode] = useState(false)
  const [editedJson, setEditedJson] = useState<string>(
    JSON.stringify(toolCalls[0]?.args ?? {}, null, 2)
  )
  const [jsonError, setJsonError] = useState<string | null>(null)

  const handleEdit = () => {
    try {
      const parsed = JSON.parse(editedJson) as Record<string, unknown>
      setJsonError(null)
      onEdit?.(parsed)
      setEditMode(false)
    } catch {
      setJsonError('Invalid JSON — please fix before saving.')
    }
  }

  return (
    <div className="border-2 border-yellow-400 bg-yellow-50 rounded-lg p-4 my-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <WarningAlt size={20} className="text-yellow-600 flex-shrink-0" />
        <span className="font-semibold text-yellow-800 text-sm">Action Required</span>
      </div>

      {/* Message */}
      <p className="text-sm text-gray-700 mb-3">{message}</p>

      {/* Tool call preview */}
      <div className="space-y-2 mb-4">
        {toolCalls.map(tc => (
          <div key={tc.id} className="bg-white border border-yellow-200 rounded p-2">
            <p className="text-xs font-mono font-medium text-gray-700 mb-1">{tc.name}</p>
            {!editMode ? (
              <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(tc.args, null, 2)}
              </pre>
            ) : (
              <div>
                <textarea
                  className="w-full bg-gray-100 rounded p-2 text-xs font-mono resize-y min-h-[100px] border border-gray-300 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  value={editedJson}
                  onChange={e => setEditedJson(e.target.value)}
                />
                {jsonError && <p className="text-xs text-red-600 mt-1">{jsonError}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white gap-1"
          onClick={onApprove}
        >
          <Checkmark size={14} />
          Approve
        </Button>

        {onEdit && !editMode && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => setEditMode(true)}
          >
            <Edit size={14} />
            Edit
          </Button>
        )}

        {editMode && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={handleEdit}
          >
            <Checkmark size={14} />
            Save &amp; Approve
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-red-600 border-red-300 hover:bg-red-50"
          onClick={onReject}
        >
          <Close size={14} />
          Reject
        </Button>
      </div>
    </div>
  )
}
