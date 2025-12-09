'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default function EditMasterAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [account, setAccount] = useState<any>(null)
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: accountData, error: accountError } = await supabase
        .from('master_accounts')
        .select('*')
        .eq('id', id)
        .single()

      if (accountError) {
        setError('Master account not found')
        setLoading(false)
        return
      }

      // Fetch product
      let product = null
      if (accountData.product_id) {
        const { data } = await supabase.from('products').select('*').eq('id', accountData.product_id).single()
        product = data
      }

      setAccount({ ...accountData, product })

      // Fetch subscriptions
      const { data: subsData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('master_account_id', id)
        .order('created_at', { ascending: false })

      if (subsData) {
        // Fetch customers for subscriptions
        const customerIds = Array.from(new Set(subsData.map(s => s.customer_id).filter(Boolean)))
        let customersData: any[] = []
        if (customerIds.length > 0) {
          const { data } = await supabase.from('profiles').select('*').in('id', customerIds)
          customersData = data || []
        }
        const customersMap: Record<string, any> = {}
        customersData.forEach((c: any) => { customersMap[c.id] = c })
        const enrichedSubs = subsData.map(s => ({ ...s, customer: customersMap[s.customer_id] || null }))
        setSubscriptions(enrichedSubs)
      }
      setLoading(false)
    }

    fetchData()
  }, [id, supabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const formData = new FormData(e.currentTarget)

    try {
      const { error } = await supabase
        .from('master_accounts')
        .update({
          account_email: formData.get('account_email') as string,
          account_password: formData.get('account_password') as string,
          recovery_email: formData.get('recovery_email') as string || null,
          recovery_phone: formData.get('recovery_phone') as string || null,
          authenticator_secret: formData.get('authenticator_secret') as string || null,
          notes: formData.get('notes') as string || null,
          is_active: account.is_active,
        })
        .eq('id', id)

      if (error) throw error

      router.push('/admin/master-accounts')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update master account')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = () => {
    setAccount((prev: any) => ({ ...prev, is_active: !prev.is_active }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>Master account not found</AlertDescription>
        </Alert>
        <Link href="/admin/master-accounts">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Master Accounts
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/master-accounts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Master Account</h1>
          <p className="text-muted-foreground">{account.product?.name}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Credentials</CardTitle>
            <CardDescription>Update the master account credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account_email">Account Email</Label>
                <Input
                  id="account_email"
                  name="account_email"
                  type="email"
                  defaultValue={account.account_email}
                  required
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_password">Account Password</Label>
                <div className="relative">
                  <Input
                    id="account_password"
                    name="account_password"
                    type={showPassword ? 'text' : 'password'}
                    defaultValue={account.account_password}
                    required
                    disabled={saving}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recovery_email">Recovery Email</Label>
                  <Input
                    id="recovery_email"
                    name="recovery_email"
                    type="email"
                    defaultValue={account.recovery_email || ''}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recovery_phone">Recovery Phone</Label>
                  <Input
                    id="recovery_phone"
                    name="recovery_phone"
                    type="tel"
                    defaultValue={account.recovery_phone || ''}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="authenticator_secret">2FA Secret</Label>
                <Input
                  id="authenticator_secret"
                  name="authenticator_secret"
                  defaultValue={account.authenticator_secret || ''}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={account.notes || ''}
                  rows={3}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label>Account Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {account.is_active ? 'Account is active' : 'Account is disabled'}
                  </p>
                </div>
                <Switch
                  checked={account.is_active}
                  onCheckedChange={toggleActive}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Link href="/admin/master-accounts">
                  <Button variant="outline" type="button">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned Subscriptions</CardTitle>
            <CardDescription>
              {subscriptions.length} / {account.product?.max_slots || '?'} slots used
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptions.length > 0 ? (
              <div className="space-y-3">
                {subscriptions.map((sub: any) => (
                  <Link
                    key={sub.id}
                    href={`/admin/subscriptions/${sub.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{sub.customer?.full_name || sub.customer?.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Slot {sub.slot_number || 'N/A'} - {sub.invited_email}
                      </p>
                    </div>
                    <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                      {sub.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No subscriptions assigned to this account
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
