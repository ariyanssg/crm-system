'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Loader2, Send, User } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import type { IssueWithRelations, IssueComment, Profile } from '@/types/database'

export default function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [issue, setIssue] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingComment, setSendingComment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setCurrentUser(profile)
      }

      const { data: issueData, error: issueError } = await supabase
        .from('issues')
        .select('*')
        .eq('id', id)
        .single()

      if (issueError) {
        setError('Issue not found')
        setLoading(false)
        return
      }

      // Fetch related data
      let customer = null
      let subscription = null

      if (issueData.customer_id) {
        const { data } = await supabase.from('profiles').select('*').eq('id', issueData.customer_id).single()
        customer = data
      }

      if (issueData.subscription_id) {
        const { data: subData } = await supabase.from('subscriptions').select('*').eq('id', issueData.subscription_id).single()
        if (subData && subData.product_id) {
          const { data: prodData } = await supabase.from('products').select('*').eq('id', subData.product_id).single()
          subscription = { ...subData, product: prodData }
        } else {
          subscription = subData
        }
      }

      setIssue({ ...issueData, customer, subscription })

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('issue_comments')
        .select('*')
        .eq('issue_id', id)
        .order('created_at', { ascending: true })

      if (commentsData) {
        // Fetch user data for each comment
        const userIds = Array.from(new Set(commentsData.map(c => c.user_id).filter(Boolean)))
        let usersData: any[] = []
        if (userIds.length > 0) {
          const { data } = await supabase.from('profiles').select('*').in('id', userIds)
          usersData = data || []
        }
        const usersMap: Record<string, any> = {}
        usersData.forEach((u: any) => { usersMap[u.id] = u })
        const enrichedComments = commentsData.map(c => ({ ...c, user: usersMap[c.user_id] || null }))
        setComments(enrichedComments)
      }
      setLoading(false)
    }

    fetchData()
  }, [id, supabase])

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true)
    try {
      const updateData: any = { status: newStatus }
      
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString()
        updateData.resolved_by = currentUser?.id
      }

      const { error } = await supabase
        .from('issues')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      setIssue((prev: any) => ({ ...prev, ...updateData }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  const handlePriorityChange = async (newPriority: string) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('issues')
        .update({ priority: newPriority })
        .eq('id', id)

      if (error) throw error

      setIssue((prev: any) => ({ ...prev, priority: newPriority }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update priority')
    } finally {
      setSaving(false)
    }
  }

  const handleSendComment = async () => {
    if (!newComment.trim() || !currentUser) return

    setSendingComment(true)
    try {
      const { data, error } = await supabase
        .from('issue_comments')
        .insert({
          issue_id: id,
          user_id: currentUser.id,
          message: newComment,
          is_internal: false,
        })
        .select('*, user:profiles(*)')
        .single()

      if (error) throw error

      setComments((prev) => [...prev, data])
      setNewComment('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send comment')
    } finally {
      setSendingComment(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!issue) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>Issue not found</AlertDescription>
        </Alert>
        <Link href="/admin/issues">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Issues
          </Button>
        </Link>
      </div>
    )
  }

  const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    open: 'destructive',
    in_progress: 'default',
    resolved: 'secondary',
    closed: 'outline',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/issues">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{issue.title}</h1>
          <p className="text-muted-foreground">
            Opened by {issue.customer?.full_name || issue.customer?.email} on{' '}
            {format(new Date(issue.created_at), 'MMM d, yyyy')}
          </p>
        </div>
        <Badge variant={statusColors[issue.status]} className="text-sm">
          {issue.status.replace('_', ' ')}
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{issue.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
              <CardDescription>Communication history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length > 0 ? (
                comments.map((comment: any) => (
                  <div
                    key={comment.id}
                    className={`flex gap-3 p-3 rounded-lg ${
                      comment.user?.role === 'admin' ? 'bg-primary/5' : 'bg-muted'
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background border">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {comment.user?.full_name || comment.user?.email}
                        </span>
                        {comment.user?.role === 'admin' && (
                          <Badge variant="outline" className="text-xs">Admin</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{comment.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet
                </p>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Add Comment</Label>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type your response..."
                  rows={3}
                />
                <Button
                  onClick={handleSendComment}
                  disabled={sendingComment || !newComment.trim()}
                >
                  {sendingComment ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <Select
                  value={issue.status}
                  onValueChange={handleStatusChange}
                  disabled={saving}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-muted-foreground">Priority</Label>
                <Select
                  value={issue.priority}
                  onValueChange={handlePriorityChange}
                  disabled={saving}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <Label className="text-muted-foreground">Customer</Label>
                <p className="font-medium">{issue.customer?.full_name || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">{issue.customer?.email}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Product</Label>
                <p className="font-medium">{issue.subscription?.product?.name || 'N/A'}</p>
              </div>

              {issue.resolved_at && (
                <div>
                  <Label className="text-muted-foreground">Resolved</Label>
                  <p className="text-sm">
                    {format(new Date(issue.resolved_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
