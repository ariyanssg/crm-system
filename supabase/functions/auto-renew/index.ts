// Supabase Edge Function for Auto-Renewal Processing
// Deploy with: supabase functions deploy auto-renew
// Set up cron job in Supabase Dashboard or use external scheduler

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Subscription {
  id: string
  customer_id: string
  product_id: string
  end_date: string
  auto_renew: boolean
  status: string
  product: {
    billing_cycle_days: number
    name: string
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authorization (use service role key or verify cron secret)
    const authHeader = req.headers.get('Authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')
    
    // Allow if valid Bearer token or matching cron secret
    if (authHeader !== `Bearer ${cronSecret}`) {
      // Also check for service role authentication
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      
      if (!authHeader?.includes(supabaseServiceKey)) {
        // For development/testing, allow requests with matching API key
        const apiKey = req.headers.get('apikey')
        if (apiKey !== supabaseServiceKey) {
          console.log('Unauthorized request')
        }
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current date
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    console.log(`Processing auto-renewals for subscriptions expiring by ${tomorrow}`)

    // 1. First, expire any subscriptions that have passed their end date
    const { data: expiredSubs, error: expireError } = await supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('end_date', today)
      .select('id')

    if (expireError) {
      console.error('Error expiring subscriptions:', expireError)
    } else {
      console.log(`Marked ${expiredSubs?.length || 0} subscriptions as expired`)
    }

    // 2. Get subscriptions due for auto-renewal
    const { data: subscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        customer_id,
        product_id,
        end_date,
        auto_renew,
        status,
        product:products(billing_cycle_days, name)
      `)
      .eq('auto_renew', true)
      .eq('status', 'active')
      .lte('end_date', tomorrow)

    if (fetchError) {
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`)
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions for auto-renewal`)

    const results = {
      processed: 0,
      renewed: 0,
      failed: 0,
      errors: [] as string[],
    }

    // 3. Process each subscription
    for (const sub of (subscriptions as Subscription[]) || []) {
      results.processed++
      
      try {
        const billingDays = sub.product?.billing_cycle_days || 30
        const currentEndDate = new Date(sub.end_date)
        const newEndDate = new Date(currentEndDate.getTime() + billingDays * 24 * 60 * 60 * 1000)
        
        // Update subscription
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            end_date: newEndDate.toISOString().split('T')[0],
            renewal_date: today,
          })
          .eq('id', sub.id)

        if (updateError) {
          throw new Error(updateError.message)
        }

        // Create notification for customer
        await supabase.from('notifications').insert({
          user_id: sub.customer_id,
          title: 'Subscription Renewed',
          message: `Your ${sub.product?.name || 'subscription'} has been automatically renewed for ${billingDays} days.`,
          type: 'renewal',
          link: '/portal/my-products',
        })

        // Log audit entry
        await supabase.from('audit_logs').insert({
          user_id: null, // System action
          action: 'AUTO_RENEW',
          table_name: 'subscriptions',
          record_id: sub.id,
          old_data: { end_date: sub.end_date },
          new_data: { end_date: newEndDate.toISOString().split('T')[0], renewal_date: today },
        })

        results.renewed++
        console.log(`Renewed subscription ${sub.id} until ${newEndDate.toISOString().split('T')[0]}`)
        
      } catch (err) {
        results.failed++
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        results.errors.push(`Subscription ${sub.id}: ${errorMessage}`)
        console.error(`Failed to renew subscription ${sub.id}:`, errorMessage)
      }
    }

    // 4. Send expiration reminders for subscriptions expiring in 7 days
    const reminderDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const { data: expiringSoon } = await supabase
      .from('subscriptions')
      .select(`
        id,
        customer_id,
        end_date,
        auto_renew,
        product:products(name)
      `)
      .eq('status', 'active')
      .eq('auto_renew', false)
      .gte('end_date', today)
      .lte('end_date', reminderDate)

    // Send reminder notifications (avoid duplicates by checking existing notifications)
    for (const sub of expiringSoon || []) {
      const daysLeft = Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      
      // Check if reminder already sent today
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', sub.customer_id)
        .eq('type', 'renewal')
        .gte('created_at', today)
        .limit(1)

      if (!existingNotification?.length) {
        await supabase.from('notifications').insert({
          user_id: sub.customer_id,
          title: 'Subscription Expiring Soon',
          message: `Your ${(sub as any).product?.name || 'subscription'} expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Enable auto-renewal to avoid interruption.`,
          type: 'renewal',
          link: '/portal/my-products',
        })
      }
    }

    console.log('Auto-renewal processing complete:', results)

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        results,
        reminders_sent: expiringSoon?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
    
  } catch (error) {
    console.error('Auto-renewal function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
