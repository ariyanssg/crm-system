import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Package,
  AlertCircle,
  Calendar,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import { format, isPast, addDays, isWithinInterval } from 'date-fns'

export default async function PortalDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const [
    { data: subscriptions },
    { data: openIssues },
  ] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*, product:products(*)')
      .eq('customer_id', user.id)
      .eq('status', 'active')
      .order('end_date', { ascending: true }),
    supabase
      .from('issues')
      .select('*, subscription:subscriptions(*, product:products(*))')
      .eq('customer_id', user.id)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const activeCount = subscriptions?.length || 0
  const issueCount = openIssues?.length || 0
  const expiringCount = subscriptions?.filter((s: any) => {
    const end = new Date(s.end_date)
    return isWithinInterval(end, { start: new Date(), end: addDays(new Date(), 7) })
  }).length || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back!</h1>
        <p className="text-muted-foreground">Here&apos;s an overview of your subscriptions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Package className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <AlertCircle className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{issueCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Calendar className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{expiringCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Subscriptions</CardTitle>
            <CardDescription>Your active products</CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptions && subscriptions.length > 0 ? (
              <div className="space-y-4">
                {subscriptions.slice(0, 3).map((sub: any) => {
                  const isExpiringSoon = isWithinInterval(new Date(sub.end_date), {
                    start: new Date(),
                    end: addDays(new Date(), 7),
                  })

                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                          <Package className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{sub.product?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Expires: {format(new Date(sub.end_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      {isExpiringSoon ? (
                        <Badge variant="destructive">Expiring Soon</Badge>
                      ) : (
                        <Badge variant="default">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active subscriptions
              </p>
            )}
            <Link href="/portal/my-products" className="block mt-4">
              <Button variant="outline" className="w-full">View All Products</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Issues</CardTitle>
            <CardDescription>Your support tickets</CardDescription>
          </CardHeader>
          <CardContent>
            {openIssues && openIssues.length > 0 ? (
              <div className="space-y-4">
                {openIssues.map((issue: any) => (
                  <Link
                    key={issue.id}
                    href={`/portal/issues/${issue.id}`}
                    className="block p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{issue.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {issue.subscription?.product?.name}
                        </p>
                      </div>
                      <Badge variant={issue.status === 'open' ? 'destructive' : 'secondary'}>
                        {issue.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No open issues
              </p>
            )}
            <Link href="/portal/issues" className="block mt-4">
              <Button variant="outline" className="w-full">View All Issues</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
