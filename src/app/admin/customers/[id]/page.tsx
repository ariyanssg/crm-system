'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [customer, setCustomer] = useState<any>(null)
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: customerData, error: customerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (customerError) {
        setError('Customer not found')
      } else {
        setCustomer(customerData)
      }

      const { data: subsData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })

      if (subsData) {
        // Fetch products for subscriptions
        const productIds = Array.from(new Set(subsData.map(s => s.product_id).filter(Boolean)))
        let productsData: any[] = []
        if (productIds.length > 0) {
          const { data } = await supabase.from('products').select('*').in('id', productIds)
          productsData = data || []
        }
        const productsMap: Record<string, any> = {}
        productsData.forEach((p: any) => { productsMap[p.id] = p })
        const enrichedSubs = subsData.map(s => ({ ...s, product: productsMap[s.product_id] || null }))
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
        .from('profiles')
        .update({
          full_name: formData.get('full_name') as string,
          phone: formData.get('phone') as string,
          is_active: customer.is_active,
        })
        .eq('id', id)

      if (error) throw error

      router.push('/admin/customers')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = () => {
    setCustomer((prev: any) => ({ ...prev, is_active: !prev.is_active }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>Customer not found</AlertDescription>
        </Alert>
        <Link href="/admin/customers">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/customers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Customer</h1>
          <p className="text-muted-foreground">Update customer information</p>
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
            <CardTitle>Customer Details</CardTitle>
            <CardDescription>Update customer information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={customer.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  defaultValue={customer.full_name || ''}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={customer.phone || ''}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Account Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {customer.is_active ? 'Customer can access the portal' : 'Customer is deactivated'}
                  </p>
                </div>
                <Switch
                  checked={customer.is_active}
                  onCheckedChange={toggleActive}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Link href="/admin/customers">
                  <Button variant="outline" type="button">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
            <CardDescription>Customer&apos;s active and past subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptions.length > 0 ? (
              <div className="space-y-3">
                {subscriptions.map((sub: any) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div>
                      <p className="font-medium">{sub.product?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(sub.start_date), 'MMM d')} - {format(new Date(sub.end_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                      {sub.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No subscriptions found
              </p>
            )}
            <Link href={`/admin/subscriptions/new?customer=${id}`} className="block mt-4">
              <Button variant="outline" className="w-full">Add Subscription</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
