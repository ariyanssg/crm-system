import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  CreditCard, 
  DollarSign, 
  TrendingUp,
  Package,
  AlertCircle,
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const today = new Date()
  const thirtyDaysAgo = subDays(today, 30)
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)

  const [
    { count: totalCustomers },
    { count: activeSubscriptions },
    { count: totalProducts },
    { count: openIssues },
    { data: subscriptions },
    { data: recentCustomers },
    { data: productStats },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('issues').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    supabase.from('subscriptions')
      .select('*, product:products(price)')
      .eq('status', 'active'),
    supabase.from('profiles')
      .select('*')
      .eq('role', 'customer')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('products')
      .select(`
        *,
        subscriptions:subscriptions(count)
      `)
      .eq('status', 'active')
      .order('name'),
  ])

  // Calculate monthly recurring revenue
  const monthlyRevenue = subscriptions?.reduce((sum: number, sub: any) => {
    return sum + (Number(sub.product?.price) || 0)
  }, 0) || 0

  const stats = [
    { 
      title: 'Total Customers', 
      value: totalCustomers || 0, 
      icon: Users,
      description: 'Registered customers',
      color: 'text-blue-600'
    },
    { 
      title: 'Active Subscriptions', 
      value: activeSubscriptions || 0, 
      icon: CreditCard,
      description: 'Currently active',
      color: 'text-green-600'
    },
    { 
      title: 'Monthly Revenue', 
      value: `$${monthlyRevenue.toFixed(2)}`, 
      icon: DollarSign,
      description: 'Recurring revenue',
      color: 'text-emerald-600'
    },
    { 
      title: 'Open Issues', 
      value: openIssues || 0, 
      icon: AlertCircle,
      description: 'Pending support',
      color: 'text-orange-600'
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Business metrics and insights</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product Performance</CardTitle>
            <CardDescription>Subscriptions per product</CardDescription>
          </CardHeader>
          <CardContent>
            {productStats && productStats.length > 0 ? (
              <div className="space-y-4">
                {productStats.map((product: any) => {
                  const subCount = product.subscriptions?.[0]?.count || 0
                  const maxSlots = product.max_slots || 1
                  const fillPercentage = product.product_type === 'shared' 
                    ? Math.min((subCount / maxSlots) * 100, 100)
                    : 100

                  return (
                    <div key={product.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{product.name}</span>
                        </div>
                        <Badge variant="outline">
                          {subCount} {product.product_type === 'shared' ? `/ ${maxSlots}` : ''} subs
                        </Badge>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${fillPercentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No products found</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Customers</CardTitle>
            <CardDescription>New signups in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCustomers && recentCustomers.length > 0 ? (
              <div className="space-y-4">
                {recentCustomers.map((customer: any) => (
                  <div key={customer.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{customer.full_name || 'Unnamed'}</p>
                      <p className="text-xs text-muted-foreground">{customer.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(customer.created_at), 'MMM d')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No new customers in the last 30 days
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
          <CardDescription>Key performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Avg. Revenue per Customer</p>
              <p className="text-2xl font-bold mt-1">
                ${totalCustomers ? (monthlyRevenue / totalCustomers).toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Active Products</p>
              <p className="text-2xl font-bold mt-1">{totalProducts || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Issue Resolution Rate</p>
              <p className="text-2xl font-bold mt-1">--</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
