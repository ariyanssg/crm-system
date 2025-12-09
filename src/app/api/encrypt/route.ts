import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { encrypt, decrypt, isEncrypted } from '@/lib/utils/encryption'

// POST: Encrypt password before saving
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    const encryptedPassword = encrypt(password)
    
    return NextResponse.json({ 
      encrypted: encryptedPassword,
      success: true 
    })
  } catch (error) {
    console.error('Encryption error:', error)
    return NextResponse.json(
      { error: 'Failed to encrypt password' },
      { status: 500 }
    )
  }
}

// GET: Decrypt password for viewing (with audit log)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const encryptedPassword = searchParams.get('password')
    const recordId = searchParams.get('recordId')
    const recordType = searchParams.get('recordType') // 'master_account' or 'subscription'

    if (!encryptedPassword) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    // Log password view in audit log
    if (recordId && recordType) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'PASSWORD_VIEW',
        table_name: recordType === 'master_account' ? 'master_accounts' : 'subscriptions',
        record_id: recordId,
        old_data: null,
        new_data: { action: 'Password viewed by admin' }
      })
    }

    let decryptedPassword = encryptedPassword
    
    // Only decrypt if the password is encrypted
    if (isEncrypted(encryptedPassword)) {
      decryptedPassword = decrypt(encryptedPassword)
    }
    
    return NextResponse.json({ 
      password: decryptedPassword,
      success: true 
    })
  } catch (error) {
    console.error('Decryption error:', error)
    return NextResponse.json(
      { error: 'Failed to decrypt password' },
      { status: 500 }
    )
  }
}
