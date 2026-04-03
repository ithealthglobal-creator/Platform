import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

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

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const serviceId = formData.get('serviceId') as string | null
    const type = formData.get('type') as string | null

    if (!file || !serviceId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: file, serviceId, type' },
        { status: 400 }
      )
    }

    if (type !== 'hero' && type !== 'thumbnail') {
      return NextResponse.json(
        { error: 'Type must be "hero" or "thumbnail"' },
        { status: 400 }
      )
    }

    const extension = file.name.split('.').pop() || 'png'
    const storagePath = `services/${serviceId}/${type}.${extension}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin.storage
      .from('service-images')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('service-images')
      .getPublicUrl(storagePath)

    const url = publicUrlData.publicUrl

    const column = type === 'hero' ? 'hero_image_url' : 'thumbnail_url'
    const { error: updateError } = await supabaseAdmin
      .from('services')
      .update({ [column]: url })
      .eq('id', serviceId)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ url })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
