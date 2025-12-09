import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get user to determine redirect
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        // If this is a password recovery, redirect to update password page
        if (type === 'recovery') {
          return NextResponse.redirect(`${origin}/auth/update-password`)
        }

        // Otherwise redirect based on role
        const redirectPath = profile?.role === 'admin' ? '/admin/dashboard' : '/portal/dashboard'
        return NextResponse.redirect(`${origin}${redirectPath}`)
      }
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}
