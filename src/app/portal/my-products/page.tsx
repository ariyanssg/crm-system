import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, Calendar, Mail, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { format, isPast, addDays, isWithinInterval } from 'date-fns'

export default async function MyProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*, product:products(*)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  const getStatusBadge = (status: string, endDate: string) => {
    if (status === 'active') {
      const isExpiringSoon = isWithinInterval(new Date(endDate), {
        start: new Date(),
        end: addDays(new Date(), 7),
      })
      
      if (isPast(new Date(endDate))) {
        return <Badge variant="destructive">Expired</Badge>
      }
      
      if (isExpiringSoon) {
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Expiring Soon</Badge>
      }
      
      return (
        <Badge variant="default">
          <CheckCircle className="mr-1 h-3 w-3" />
          Active
        </Badge>
      )
    }

    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      suspended: 'destructive',
      expired: 'destructive',
    }

    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Products</h1>
        <p className="text-muted-foreground">Your subscription details and status</p>
      </div>

      {subscriptions && subscriptions.length > 0 ? (
        <div className="grid gap-4">
          {subscriptions.map((sub: any) => (
            <Card key={sub.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle>{sub.product?.name}</CardTitle>
                      <CardDescription>
                        {sub.product?.product_type === 'shared' ? 'Shared Plan' : 'Individual Account'}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(sub.status, sub.end_date)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Start Date</p>
                      <p className="font-medium">{format(new Date(sub.start_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">End Date</p>
                      <p className="font-medium">{format(new Date(sub.end_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>

                  {sub.product?.product_type === 'shared' && sub.invited_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Invited Email</p>
                        <p className="font-medium">{sub.invited_email}</p>
                      </div>
                    </div>
                  )}

                  {sub.product?.product_type === 'individual' && sub.individual_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Account Email</p>
                        <p className="font-medium">{sub.individual_email}</p>
                      </div>
                    </div>
                  )}
                </div>

                {sub.notes && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">{sub.notes}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Link href={`/portal/issues/new?subscription=${sub.id}`}>
                    <Button variant="outline" size="sm">
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Report Issue
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No Subscriptions</h3>
            <p className="text-muted-foreground text-center mt-2">
              You don&apos;t have any active subscriptions yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
