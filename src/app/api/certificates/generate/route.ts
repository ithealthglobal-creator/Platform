import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { jsPDF } from 'jspdf'

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') return null
  return user
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { certificate_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { certificate_id } = body
  if (!certificate_id) {
    return NextResponse.json({ error: 'certificate_id is required' }, { status: 400 })
  }

  // Fetch certificate with course and user details
  const { data: certificate, error: certError } = await supabaseAdmin
    .from('certificates')
    .select('*, courses(title), profiles:user_id(display_name, email)')
    .eq('id', certificate_id)
    .single()

  if (certError || !certificate) {
    return NextResponse.json(
      { error: 'Certificate not found' },
      { status: 404 }
    )
  }

  const userName =
    certificate.profiles?.display_name ||
    certificate.profiles?.email ||
    'Unknown User'
  const courseName = certificate.courses?.title || 'Unknown Course'
  const score = certificate.score
  const certificateNumber = certificate.certificate_number
  const issuedAt = new Date(certificate.issued_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Generate PDF
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Border
  doc.setDrawColor(0, 102, 153)
  doc.setLineWidth(2)
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20)
  doc.setLineWidth(0.5)
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28)

  // Branding header
  doc.setFontSize(16)
  doc.setTextColor(0, 102, 153)
  doc.text('IThealth', pageWidth / 2, 32, { align: 'center' })

  // Subtitle
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text('Healthcare IT Compliance & Training', pageWidth / 2, 40, {
    align: 'center',
  })

  // Divider line
  doc.setDrawColor(0, 102, 153)
  doc.setLineWidth(0.5)
  doc.line(60, 46, pageWidth - 60, 46)

  // Title
  doc.setFontSize(28)
  doc.setTextColor(40, 40, 40)
  doc.text('Certificate of Completion', pageWidth / 2, 62, { align: 'center' })

  // "This is to certify that"
  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text('This is to certify that', pageWidth / 2, 78, { align: 'center' })

  // User name
  doc.setFontSize(24)
  doc.setTextColor(0, 51, 102)
  doc.text(userName, pageWidth / 2, 92, { align: 'center' })

  // "has successfully completed"
  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text('has successfully completed', pageWidth / 2, 104, {
    align: 'center',
  })

  // Course name
  doc.setFontSize(18)
  doc.setTextColor(40, 40, 40)
  doc.text(courseName, pageWidth / 2, 118, { align: 'center' })

  // Score
  doc.setFontSize(14)
  doc.setTextColor(0, 102, 153)
  doc.text(`Score: ${score}%`, pageWidth / 2, 132, { align: 'center' })

  // Bottom details
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Certificate No: ${certificateNumber}`, pageWidth / 2, 155, {
    align: 'center',
  })
  doc.text(`Issued: ${issuedAt}`, pageWidth / 2, 162, { align: 'center' })

  // Generate PDF buffer
  const pdfArrayBuffer = doc.output('arraybuffer')
  const pdfBuffer = Buffer.from(pdfArrayBuffer)

  // Upload to Supabase Storage
  const storagePath = `certificates/${certificate_id}.pdf`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('certificates')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json(
      { error: `Failed to upload PDF: ${uploadError.message}` },
      { status: 500 }
    )
  }

  // Get public URL
  const { data: publicUrlData } = supabaseAdmin.storage
    .from('certificates')
    .getPublicUrl(storagePath)

  const pdfUrl = publicUrlData.publicUrl

  // Update certificate record with pdf_url
  const { error: updateError } = await supabaseAdmin
    .from('certificates')
    .update({ pdf_url: pdfUrl })
    .eq('id', certificate_id)

  if (updateError) {
    return NextResponse.json(
      { error: `Failed to update certificate: ${updateError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ pdf_url: pdfUrl })
}
