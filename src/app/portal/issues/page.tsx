import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, AlertCircle, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'

export default async function PortalIssuesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: issues } = await supabase
    .from('issues')
    .select(`
      *,
      subscription:subscriptions(*, product:products(*))
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    open: 'destructive',
    in_progress: 'default',
    resolved: 'secondary',
    closed: 'outline',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Issues</h1>
          <p className="text-muted-foreground">Track your support tickets</p>
        </div>
        <Link href="/portal/issues/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Report Issue
          </Button>
        </Link>
      </div>

      {issues && issues.length > 0 ? (
        <div className="grid gap-4">
          {issues.map((issue: any) => (
            <Link key={issue.id} href={`/portal/issues/${issue.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{issue.title}</CardTitle>
                        <CardDescription>
                          {issue.subscription?.product?.name} - {format(new Date(issue.created_at), 'MMM d, yyyy')}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={statusColors[issue.status]}>
                      {issue.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {issue.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No Issues</h3>
            <p className="text-muted-foreground text-center mt-2">
              You haven&apos;t reported any issues yet.
            </p>
            <Link href="/portal/issues/new" className="mt-4">
              <Button>Report an Issue</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
