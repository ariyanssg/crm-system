'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { format, addDays } from 'date-fns'

export default function EditSubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch subscription first
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('id', id)
          .single()

        if (subError) {
          setError('Subscription not found')
          setLoading(false)
          return
        }

        // Fetch related data
        let customer = null
        let product = null
        let masterAccount = null

        if (subData.customer_id) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', subData.customer_id)
            .single()
          customer = data
        }

        if (subData.product_id) {
          const { data } = await supabase
            .from('products')
            .select('*')
            .eq('id', subData.product_id)
            .single()
          product = data
        }

        if (subData.master_account_id) {
          const { data } = await supabase
            .from('master_accounts')
            .select('*')
            .eq('id', subData.master_account_id)
            .single()
          masterAccount = data
        }

        setSubscription({
          ...subData,
          customer,
          product,
          master_account: masterAccount,
        })
      } catch (err) {
        setError('Failed to load subscription')
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
        .from('subscriptions')
        .update({
          status: formData.get('status') as string,
          end_date: formData.get('end_date') as string,
          invited_email: formData.get('invited_email') as string,
          notes: formData.get('notes') as string,
        })
        .eq('id', id)

      if (error) throw error

      router.push('/admin/subscriptions')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subscription')
    } finally {
      setSaving(false)
    }
  }

  const handleRenew = async () => {
    if (!subscription) return
    setSaving(true)

    const newEndDate = addDays(new Date(subscription.end_date), subscription.product?.billing_cycle_days || 30)

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          end_date: format(newEndDate, 'yyyy-MM-dd'),
          status: 'active',
        })
        .eq('id', id)

      if (error) throw error

      setSubscription((prev: any) => ({
        ...prev,
        end_date: format(newEndDate, 'yyyy-MM-dd'),
        status: 'active',
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to renew subscription')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>Subscription not found</AlertDescription>
        </Alert>
        <Link href="/admin/subscriptions">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Subscriptions
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/subscriptions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Edit Subscription</h1>
            <p className="text-muted-foreground">
              {subscription.customer?.full_name} - {subscription.product?.name}
            </p>
          </div>
        </div>
        <Button onClick={handleRenew} disabled={saving}>
          Renew Subscription
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
            <CardDescription>Update subscription information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Input value={subscription.customer?.full_name || subscription.customer?.email} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label>Product</Label>
                <Input value={subscription.product?.name} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select name="status" defaultValue={subscription.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input value={subscription.start_date} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    defaultValue={subscription.end_date}
                    disabled={saving}
                  />
                </div>
              </div>

              {subscription.product?.product_type === 'shared' && (
                <div className="space-y-2">
                  <Label htmlFor="invited_email">Invited Email</Label>
                  <Input
                    id="invited_email"
                    name="invited_email"
                    type="email"
                    defaultValue={subscription.invited_email || ''}
                    disabled={saving}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={subscription.notes || ''}
                  rows={3}
                  disabled={saving}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Link href="/admin/subscriptions">
                  <Button variant="outline" type="button">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              {subscription.product?.product_type === 'shared' ? 'Master account details' : 'Individual account credentials'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscription.product?.product_type === 'shared' && subscription.master_account ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Master Account Email</Label>
                  <p className="font-medium">{subscription.master_account.account_email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Slot Number</Label>
                  <p className="font-medium">{subscription.slot_number || 'Not assigned'}</p>
                </div>
              </div>
            ) : subscription.product?.product_type === 'individual' ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Account Email</Label>
                  <p className="font-medium">{subscription.individual_email || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Password</Label>
                  <p className="font-medium font-mono">{subscription.individual_password || 'Not set'}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No account information available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
