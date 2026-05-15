'use client'

import { SocialPostForm } from '../_components/social-post-form'

export default function NewSocialPostPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">New Social Post</h1>
        <p className="text-sm text-muted-foreground">Track an organic post as a funnel awareness source.</p>
      </div>
      <SocialPostForm />
    </div>
  )
}
