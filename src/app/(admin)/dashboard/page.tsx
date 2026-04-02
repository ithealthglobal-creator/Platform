'use client'

import { useAuth } from '@/contexts/auth-context'
import { Breadcrumb } from '@/components/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserMultiple, Building, Task, Growth } from '@carbon/icons-react'

const stats = [
  { title: 'Total Customers', value: '24', icon: Building },
  { title: 'Active Users', value: '142', icon: UserMultiple },
  { title: 'Open Tickets', value: '18', icon: Task },
  { title: 'MRR', value: '$48,200', icon: Growth },
]

export default function DashboardPage() {
  const { profile } = useAuth()

  return (
    <div>
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-1">
        Welcome back, {profile?.display_name ?? 'Admin'}
      </h1>
      <p className="text-muted-foreground mb-6">
        Here is an overview of your platform.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon size={20} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
