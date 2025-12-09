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
import { Plus, Edit, User, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

const ITEMS_PER_PAGE = 10

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  const supabase = createClient()

  const fetchCustomers = async () => {
    setLoading(true)
    
    try {
      // First, fetch customer profiles
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('role', 'customer')

      // Apply search filter
      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('is_active', statusFilter === 'active')
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      query = query
        .order('created_at', { ascending: false })
        .range(from, to)

      const { data: profilesData, count, error: profilesError } = await query

      if (profilesError) {
        console.error('Error fetching customers:', profilesError.message, profilesError.code, profilesError.details)
        setCustomers([])
        setTotalCount(0)
        setLoading(false)
        return
      }

      // If we have profiles, fetch subscription details for each customer
      if (profilesData && profilesData.length > 0) {
        const customerIds = profilesData.map(p => p.id)
        
        // Get all subscriptions with their emails
        const { data: subsData } = await supabase
          .from('subscriptions')
          .select('customer_id, individual_email, invited_email')
          .in('customer_id', customerIds)
        
        // Group subscriptions by customer and collect emails
        const subsCounts: Record<string, number> = {}
        const subsEmails: Record<string, string[]> = {}
        
        if (subsData) {
          subsData.forEach((sub: { customer_id: string, individual_email: string | null, invited_email: string | null }) => {
            subsCounts[sub.customer_id] = (subsCounts[sub.customer_id] || 0) + 1
            
            if (!subsEmails[sub.customer_id]) {
              subsEmails[sub.customer_id] = []
            }
            
            // Add individual or invited email if present
            const email = sub.individual_email || sub.invited_email
            if (email && !subsEmails[sub.customer_id].includes(email)) {
              subsEmails[sub.customer_id].push(email)
            }
          })
        }
        
        // Merge subscription counts and emails into profiles
        const customersWithCounts = profilesData.map(profile => ({
          ...profile,
          subscriptions_count: subsCounts[profile.id] || 0,
          subscription_emails: subsEmails[profile.id] || []
        }))
        
        setCustomers(customersWithCounts)
      } else {
        setCustomers([])
      }
      
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Error:', err)
      setCustomers([])
      setTotalCount(0)
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchCustomers()
  }, [currentPage, statusFilter])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchCustomers()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customer accounts</p>
        </div>
        <Link href="/admin/customers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchCustomers}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Subscriptions</TableHead>
                <TableHead>Subscription Emails</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : customers.length > 0 ? (
                customers.map((customer: any) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{customer.full_name || 'Unnamed'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {customer.subscriptions_count || 0} active
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {customer.subscription_emails && customer.subscription_emails.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {customer.subscription_emails.map((email: string, idx: number) => (
                            <code key={idx} className="text-xs bg-muted px-2 py-0.5 rounded block">
                              {email}
                            </code>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.is_active ? 'default' : 'destructive'}>
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(customer.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/customers/${customer.id}`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'No customers found matching your filters' 
                      : 'No customers found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} customers
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
