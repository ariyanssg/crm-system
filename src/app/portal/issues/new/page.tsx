'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

function NewIssueForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSelectedSubscription = searchParams.get('subscription')
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [selectedSubscription, setSelectedSubscription] = useState(preSelectedSubscription || '')

  useEffect(() => {
    const fetchSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('subscriptions')
        .select('*, product:products(*)')
        .eq('customer_id', user.id)
        .eq('status', 'active')

      if (data) setSubscriptions(data)
    }

    fetchSubscriptions()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in')
      setLoading(false)
      return
    }

    const formData = new FormData(e.currentTarget)
    
    const issueData = {
      customer_id: user.id,
      subscription_id: selectedSubscription,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      status: 'open' as const,
      priority: 'medium' as const,
    }

    try {
      const { error } = await supabase.from('issues').insert(issueData)

      if (error) throw error

      router.push('/portal/issues')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit issue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Issue Details</CardTitle>
        <CardDescription>
          Describe the issue you&apos;re experiencing with your subscription
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Product</Label>
            <Select
              value={selectedSubscription}
              onValueChange={setSelectedSubscription}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select the product with the issue" />
              </SelectTrigger>
              <SelectContent>
                {subscriptions.map((sub: any) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.product?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Issue Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Brief description of the issue"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Please describe the issue in detail. Include any error messages, when the issue started, and steps to reproduce..."
              rows={6}
              required
              disabled={loading}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading || !selectedSubscription}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Issue
            </Button>
            <Link href="/portal/issues">
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default function NewIssuePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/portal/issues">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Report an Issue</h1>
          <p className="text-muted-foreground">Let us know about any problems</p>
        </div>
      </div>

      <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <NewIssueForm />
      </Suspense>
    </div>
  )
}
