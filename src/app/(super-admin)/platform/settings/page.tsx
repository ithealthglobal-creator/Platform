'use client'

import { Settings } from '@carbon/icons-react'

export default function PlatformSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-poppins text-2xl font-semibold text-gray-900">Platform Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Global configuration for the Servolu platform.</p>
      </div>

      <div className="bg-white rounded-lg border p-12 flex flex-col items-center justify-center text-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <Settings size={28} className="text-gray-400" />
        </div>
        <div>
          <p className="text-base font-medium text-gray-700">Coming Soon</p>
          <p className="mt-1 text-sm text-gray-400">
            Platform-wide settings will be configured here in a future release.
          </p>
        </div>
      </div>
    </div>
  )
}
