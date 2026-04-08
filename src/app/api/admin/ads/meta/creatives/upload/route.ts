import { isAdminOrAbove } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiPostFormData } from '@/lib/meta-api'

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()
  if (!profile || !isAdminOrAbove(profile.role)) return null
  return { ...user, company_id: profile.company_id }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const validTypes = ['image/jpeg', 'image/png']
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPG and PNG files are allowed' }, { status: 400 })
  }

  if (file.size > 30 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 30MB' }, { status: 400 })
  }

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted, ad_account_id')
    .eq('company_id', admin.company_id)
    .single()

  if (!integration?.access_token_encrypted || !integration.ad_account_id) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  try {
    // Step 1: Upload to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileName = `${admin.company_id}/${Date.now()}-${file.name}`

    const { error: storageError } = await supabaseAdmin.storage
      .from('ad-creatives')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (storageError) {
      return NextResponse.json({ error: `Storage upload failed: ${storageError.message}` }, { status: 500 })
    }

    // Get a signed URL for the uploaded file (valid for 1 year)
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from('ad-creatives')
      .createSignedUrl(fileName, 365 * 24 * 60 * 60)

    const imageUrl = signedUrlData?.signedUrl || ''

    // Step 2: Upload to Meta AdImages API
    const metaFormData = new FormData()
    metaFormData.append('filename', file.name)
    metaFormData.append('bytes', fileBuffer.toString('base64'))

    const metaResult = await metaApiPostFormData<{ images: Record<string, { hash: string }> }>(
      `/${integration.ad_account_id}/adimages`,
      metaFormData,
      { accessToken }
    )

    // Extract the image hash from the response
    const imageKeys = Object.keys(metaResult.images || {})
    const imageHash = imageKeys.length > 0 ? metaResult.images[imageKeys[0]].hash : null

    if (!imageHash) {
      return NextResponse.json({ error: 'Failed to get image hash from Meta' }, { status: 500 })
    }

    return NextResponse.json({ image_hash: imageHash, image_url: imageUrl })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
