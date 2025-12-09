import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  CreditCard, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { format, addDays, isAfter, isBefore } from 'date-fns'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Fetch dashboard stats
  const [
    { count: totalCustomers },
    { count: activeSubscriptions },
    { count: openIssues },
    { data: expiringSubscriptions },
    { data: recentIssues },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('issues').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    supabase.from('subscriptions')
      .select('*, customer:profiles(*), product:products(*)')
      .eq('status', 'active')
      .lte('end_date', format(addDays(new Date(), 7), 'yyyy-MM-dd'))
      .gte('end_date', format(new Date(), 'yyyy-MM-dd'))
      .order('end_date', { ascending: true })
      .limit(5),
    supabase.from('issues')
      .select('*, customer:profiles(*), subscription:subscriptions(*, product:products(*))')
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const stats = [
    { 
      title: 'Total Customers', 
      value: totalCustomers || 0, 
      icon: Users,
      href: '/admin/customers',
      color: 'text-blue-600'
    },
    { 
      title: 'Active Subscriptions', 
      value: activeSubscriptions || 0, 
      icon: CreditCard,
      href: '/admin/subscriptions',
      color: 'text-green-600'
    },
    { 
      title: 'Open Issues', 
      value: openIssues || 0, 
      icon: AlertCircle,
      href: '/admin/issues',
      color: 'text-orange-600'
    },
    { 
      title: 'Expiring Soon', 
      value: expiringSubscriptions?.length || 0, 
      icon: Clock,
      href: '/admin/subscriptions?filter=expiring',
      color: 'text-red-600'
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your subscription business</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Recent Issues
            </CardTitle>
            <CardDescription>Issues requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            {recentIssues && recentIssues.length > 0 ? (
              <div className="space-y-4">
                {recentIssues.map((issue: any) => (
                  <Link
                    key={issue.id}
                    href={`/admin/issues/${issue.id}`}
                    className="flex items-start justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{issue.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {issue.customer?.full_name || issue.customer?.email} - {issue.subscription?.product?.name}
                      </p>
                    </div>
                    <Badge variant={issue.status === 'open' ? 'destructive' : 'secondary'}>
                      {issue.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No open issues</p>
            )}
            <Link href="/admin/issues" className="block text-center text-sm text-primary hover:underline mt-4">
              View all issues
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-red-600" />
              Expiring Subscriptions
            </CardTitle>
            <CardDescription>Subscriptions expiring in the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {expiringSubscriptions && expiringSubscriptions.length > 0 ? (
              <div className="space-y-4">
                {expiringSubscriptions.map((sub: any) => (
                  <Link
                    key={sub.id}
                    href={`/admin/subscriptions/${sub.id}`}
                    className="flex items-start justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{sub.customer?.full_name || sub.customer?.email}</p>
                      <p className="text-xs text-muted-foreground">{sub.product?.name}</p>
                    </div>
                    <Badge variant="outline" className="text-red-600">
                      {format(new Date(sub.end_date), 'MMM d')}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No subscriptions expiring soon</p>
            )}
            <Link href="/admin/subscriptions" className="block text-center text-sm text-primary hover:underline mt-4">
              View all subscriptions
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
