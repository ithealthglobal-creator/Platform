import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'

export async function GET(request: NextRequest) {
  const certId = request.nextUrl.searchParams.get('id')
  if (!certId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch certificate — only if owned by requesting user
  const { data: certificate, error: certError } = await supabaseAdmin
    .from('certificates')
    .select('*, courses(name, phase:phases(name)), profiles:user_id(display_name, email, company:companies(name))')
    .eq('id', certId)
    .eq('user_id', user.id)
    .single()

  if (certError || !certificate) {
    return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
  }

  // Generate PDF using same jsPDF logic as the admin route
  const userName = certificate.profiles?.display_name || certificate.profiles?.email || 'Unknown User'
  const courseName = certificate.courses?.name || 'Unknown Course'
  const phaseName = certificate.courses?.phase?.name || ''
  const companyName = certificate.profiles?.company?.name || ''
  const score = certificate.score
  const certificateNumber = certificate.certificate_number
  const issuedAt = new Date(certificate.issued_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Border
  doc.setDrawColor(0, 102, 153)
  doc.setLineWidth(2)
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20)
  doc.setLineWidth(0.5)
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28)

  // Header
  doc.setFontSize(16)
  doc.setTextColor(0, 102, 153)
  doc.text('IThealth.ai', pageWidth / 2, 32, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text('Your IT Modernisation Champion', pageWidth / 2, 40, { align: 'center' })

  doc.setDrawColor(0, 102, 153)
  doc.setLineWidth(0.5)
  doc.line(60, 46, pageWidth - 60, 46)

  doc.setFontSize(28)
  doc.setTextColor(40, 40, 40)
  doc.text('Certificate of Completion', pageWidth / 2, 62, { align: 'center' })

  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text('This is to certify that', pageWidth / 2, 78, { align: 'center' })

  doc.setFontSize(24)
  doc.setTextColor(0, 51, 102)
  doc.text(userName, pageWidth / 2, 92, { align: 'center' })

  if (companyName) {
    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    doc.text(companyName, pageWidth / 2, 100, { align: 'center' })
  }

  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text('has successfully completed', pageWidth / 2, 110, { align: 'center' })

  doc.setFontSize(18)
  doc.setTextColor(40, 40, 40)
  doc.text(courseName, pageWidth / 2, 124, { align: 'center' })

  if (phaseName) {
    doc.setFontSize(11)
    doc.setTextColor(100, 100, 100)
    doc.text(`Phase: ${phaseName}`, pageWidth / 2, 132, { align: 'center' })
  }

  doc.setFontSize(14)
  doc.setTextColor(0, 102, 153)
  doc.text(`Score: ${score}%`, pageWidth / 2, 142, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Certificate No: ${certificateNumber}`, pageWidth / 2, 158, { align: 'center' })
  doc.text(`Issued: ${issuedAt}`, pageWidth / 2, 165, { align: 'center' })

  const pdfArrayBuffer = doc.output('arraybuffer')
  return new NextResponse(pdfArrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificate-${certificate.certificate_number}.pdf"`,
    },
  })
}
