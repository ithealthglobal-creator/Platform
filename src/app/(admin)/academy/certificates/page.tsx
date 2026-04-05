'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Certificate } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { View, Misuse } from '@carbon/icons-react'

interface CertificateRow extends Certificate {
  course_name: string | null
  user_display_name: string | null
}

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCertificates = useCallback(async () => {
    setLoading(true)

    // Fetch certificates with course name
    const { data, error } = await supabase
      .from('certificates')
      .select('*, course:courses(name)')
      .order('issued_at', { ascending: false })

    if (error) {
      toast.error('Failed to load certificates')
      setLoading(false)
      return
    }

    const rows = data ?? []

    // Fetch profile display names for user_ids
    const userIds = [...new Set(rows.map((r: Record<string, unknown>) => r.user_id as string))]
    let profileMap: Record<string, string> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds)

      if (profiles) {
        profileMap = Object.fromEntries(
          profiles.map((p: { id: string; display_name: string }) => [p.id, p.display_name])
        )
      }
    }

    const mapped: CertificateRow[] = rows.map((c: Record<string, unknown>) => ({
      id: c.id as string,
      course_id: c.course_id as string,
      user_id: c.user_id as string,
      certificate_number: c.certificate_number as string,
      issued_at: c.issued_at as string,
      revoked_at: c.revoked_at as string | null,
      score: c.score as number,
      pdf_url: c.pdf_url as string | null,
      created_at: c.created_at as string,
      course_name: (c.course as { name: string } | null)?.name ?? null,
      user_display_name: profileMap[c.user_id as string] ?? null,
    }))

    setCertificates(mapped)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCertificates()
  }, [fetchCertificates])

  const handleRevoke = useCallback(
    async (id: string, certNumber: string) => {
      if (!confirm('Revoke this certificate?')) return

      const { error } = await supabase
        .from('certificates')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        toast.error('Failed to revoke certificate')
        return
      }

      toast.success(`Certificate ${certNumber} revoked`)
      fetchCertificates()
    },
    [fetchCertificates]
  )

  const handleViewPdf = useCallback((url: string) => {
    window.open(url, '_blank')
  }, [])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Certificate #</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Course</TableHead>
              <TableHead className="w-[100px]">Score</TableHead>
              <TableHead className="w-[130px]">Issued</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : certificates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No certificates found
                </TableCell>
              </TableRow>
            ) : (
              certificates.map((cert) => {
                const isActive = cert.revoked_at === null

                return (
                  <TableRow key={cert.id}>
                    <TableCell className="font-medium font-mono text-sm">
                      {cert.certificate_number}
                    </TableCell>
                    <TableCell>{cert.user_display_name ?? '—'}</TableCell>
                    <TableCell>{cert.course_name ?? '—'}</TableCell>
                    <TableCell>{cert.score}%</TableCell>
                    <TableCell>{formatDate(cert.issued_at)}</TableCell>
                    <TableCell>
                      <Badge variant={isActive ? 'default' : 'destructive'}>
                        {isActive ? 'Active' : 'Revoked'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={!cert.pdf_url}
                          onClick={() => cert.pdf_url && handleViewPdf(cert.pdf_url)}
                          title="View PDF"
                        >
                          <View size={16} />
                        </Button>
                        {isActive && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleRevoke(cert.id, cert.certificate_number)}
                            title="Revoke"
                          >
                            <Misuse size={16} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
