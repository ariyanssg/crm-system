'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Loader2, Send, User } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import type { Profile } from '@/types/database'

export default function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()

  const [issue, setIssue] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
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
        .select(`
          *,
          subscription:subscriptions(*, product:products(*))
        `)
        .eq('id', id)
        .single()

      if (issueError) {
        setError('Issue not found')
      } else {
        setIssue(issueData)
      }

      const { data: commentsData } = await supabase
        .from('issue_comments')
        .select('*, user:profiles(*)')
        .eq('issue_id', id)
        .eq('is_internal', false)
        .order('created_at', { ascending: true })

      if (commentsData) setComments(commentsData)
      setLoading(false)
    }

    fetchData()
  }, [id, supabase])

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
        <Link href="/portal/issues">
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
        <Link href="/portal/issues">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{issue.title}</h1>
          <p className="text-muted-foreground">
            {issue.subscription?.product?.name} - Opened on{' '}
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
          <CardTitle>Updates</CardTitle>
          <CardDescription>Communication with support</CardDescription>
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
                      {comment.user?.role === 'admin' ? 'Support' : 'You'}
                    </span>
                    {comment.user?.role === 'admin' && (
                      <Badge variant="outline" className="text-xs">Support Team</Badge>
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
              No updates yet. Our team will respond soon.
            </p>
          )}

          {issue.status !== 'closed' && issue.status !== 'resolved' && (
            <>
              <Separator />

              <div className="space-y-2">
                <Label>Add a Comment</Label>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Provide additional information..."
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
            </>
          )}

          {(issue.status === 'resolved' || issue.status === 'closed') && (
            <Alert>
              <AlertDescription>
                This issue has been {issue.status}. If you&apos;re still experiencing problems,
                please open a new issue.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
