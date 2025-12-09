'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Eye, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

const ITEMS_PER_PAGE = 10

export default function IssuesPage() {
  const [issues, setIssues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  const supabase = createClient()

  const fetchIssues = async () => {
    setLoading(true)
    
    try {
      let query = supabase
        .from('issues')
        .select('*', { count: 'exact' })

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      // Apply priority filter
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter)
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      query = query
        .order('created_at', { ascending: false })
        .range(from, to)

      const { data: issuesData, count, error: issuesError } = await query

      if (issuesError) {
        console.error('Error fetching issues:', issuesError.message, issuesError.code)
        setIssues([])
        setTotalCount(0)
        setLoading(false)
        return
      }

      if (issuesData && issuesData.length > 0) {
        // Get unique IDs
        const customerIds = Array.from(new Set(issuesData.map(i => i.customer_id).filter(Boolean)))
        const subscriptionIds = Array.from(new Set(issuesData.map(i => i.subscription_id).filter(Boolean)))

        // Fetch related data
        let customersData: any[] = []
        let subscriptionsData: any[] = []
        let productsData: any[] = []

        if (customerIds.length > 0) {
          const { data } = await supabase.from('profiles').select('*').in('id', customerIds)
          customersData = data || []
        }

        if (subscriptionIds.length > 0) {
          const { data } = await supabase.from('subscriptions').select('*').in('id', subscriptionIds)
          subscriptionsData = data || []
        }

        // Get product IDs from subscriptions
        const productIds = Array.from(new Set(subscriptionsData.map((s: any) => s.product_id).filter(Boolean)))
        
        if (productIds.length > 0) {
          const { data } = await supabase.from('products').select('*').in('id', productIds)
          productsData = data || []
        }

        // Create lookup maps
        const customersMap: Record<string, any> = {}
        const subscriptionsMap: Record<string, any> = {}
        const productsMap: Record<string, any> = {}
        
        customersData.forEach((c: any) => { customersMap[c.id] = c })
        productsData.forEach((p: any) => { productsMap[p.id] = p })
        subscriptionsData.forEach((s: any) => { 
          subscriptionsMap[s.id] = { ...s, product: productsMap[s.product_id] || null }
        })

        // Merge data
        let enrichedData = issuesData.map(issue => ({
          ...issue,
          customer: customersMap[issue.customer_id] || null,
          subscription: subscriptionsMap[issue.subscription_id] || null
        }))

        // Apply search filter client-side
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          enrichedData = enrichedData.filter((issue: any) =>
            issue.title?.toLowerCase().includes(q) ||
            issue.description?.toLowerCase().includes(q) ||
            issue.customer?.full_name?.toLowerCase().includes(q) ||
            issue.customer?.email?.toLowerCase().includes(q)
          )
        }
        
        setIssues(enrichedData)
      } else {
        setIssues([])
      }
      
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Error:', err)
      setIssues([])
      setTotalCount(0)
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchIssues()
  }, [currentPage, statusFilter, priorityFilter])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchIssues()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    open: 'destructive',
    in_progress: 'default',
    resolved: 'secondary',
    closed: 'outline',
  }

  const priorityColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    low: 'outline',
    medium: 'secondary',
    high: 'default',
    critical: 'destructive',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Issues</h1>
          <p className="text-muted-foreground">Customer support tickets</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchIssues}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : issues.length > 0 ? (
                issues.map((issue: any) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">{issue.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {issue.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{issue.customer?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{issue.customer?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{issue.subscription?.product?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={priorityColors[issue.priority]}>
                        {issue.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[issue.status]}>
                        {issue.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(issue.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/issues/${issue.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' 
                      ? 'No issues found matching your filters' 
                      : 'No issues found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} issues
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
