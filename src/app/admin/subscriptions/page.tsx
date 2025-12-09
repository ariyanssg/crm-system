'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Plus, 
  Edit, 
  CreditCard, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  MoreHorizontal,
  Trash,
  FileDown,
  Copy,
  CheckSquare
} from 'lucide-react'
import { format, isPast, isWithinInterval, addDays } from 'date-fns'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const ITEMS_PER_PAGE = 10

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<Set<string>>(new Set())
  
  const supabase = createClient()

  const fetchSubscriptions = async () => {
    setLoading(true)
    setSelectedSubscriptions(new Set()) // Clear selection on refetch
    
    try {
      // First fetch subscriptions
      let query = supabase
        .from('subscriptions')
        .select('*', { count: 'exact' })

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      query = query
        .order('created_at', { ascending: false })
        .range(from, to)

      const { data: subsData, count, error: subsError } = await query

      if (subsError) {
        console.error('Error fetching subscriptions:', subsError.message, subsError.code)
        setSubscriptions([])
        setTotalCount(0)
        setLoading(false)
        return
      }

      if (subsData && subsData.length > 0) {
        // Get unique customer and product IDs
        const customerIds = Array.from(new Set(subsData.map(s => s.customer_id).filter(Boolean)))
        const productIds = Array.from(new Set(subsData.map(s => s.product_id).filter(Boolean)))
        const masterAccountIds = Array.from(new Set(subsData.map(s => s.master_account_id).filter(Boolean)))

        // Fetch customers, products, and master accounts
        let customersData: any[] = []
        let productsData: any[] = []
        let masterAccountsData: any[] = []

        if (customerIds.length > 0) {
          const { data } = await supabase.from('profiles').select('*').in('id', customerIds)
          customersData = data || []
        }

        if (productIds.length > 0) {
          const { data } = await supabase.from('products').select('*').in('id', productIds)
          productsData = data || []
        }

        if (masterAccountIds.length > 0) {
          const { data } = await supabase.from('master_accounts').select('*').in('id', masterAccountIds)
          masterAccountsData = data || []
        }

        // Create lookup maps
        const customersMap: Record<string, any> = {}
        const productsMap: Record<string, any> = {}
        const masterAccountsMap: Record<string, any> = {}
        
        customersData.forEach((c: any) => { customersMap[c.id] = c })
        productsData.forEach((p: any) => { productsMap[p.id] = p })
        masterAccountsData.forEach((m: any) => { masterAccountsMap[m.id] = m })

        // Merge data
        let enrichedData = subsData.map(sub => ({
          ...sub,
          customer: customersMap[sub.customer_id] || null,
          product: productsMap[sub.product_id] || null,
          master_account: masterAccountsMap[sub.master_account_id] || null
        }))

        // Apply search filter client-side
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          enrichedData = enrichedData.filter((sub: any) =>
            sub.customer?.full_name?.toLowerCase().includes(q) ||
            sub.customer?.email?.toLowerCase().includes(q) ||
            sub.product?.name?.toLowerCase().includes(q)
          )
        }
        
        setSubscriptions(enrichedData)
      } else {
        setSubscriptions([])
      }
      
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Error:', err)
      setSubscriptions([])
      setTotalCount(0)
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [currentPage, statusFilter])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchSubscriptions()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    pending: 'secondary',
    expired: 'destructive',
    suspended: 'outline',
  }

  const getExpiryBadge = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    
    if (isPast(end)) {
      return <Badge variant="destructive">Expired</Badge>
    }
    
    if (isWithinInterval(end, { start: now, end: addDays(now, 7) })) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Expiring Soon</Badge>
    }
    
    return null
  }

  // Selection Handlers
  const toggleSelectAll = () => {
    if (selectedSubscriptions.size === subscriptions.length) {
      setSelectedSubscriptions(new Set())
    } else {
      setSelectedSubscriptions(new Set(subscriptions.map(s => s.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedSubscriptions)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedSubscriptions(newSelected)
  }

  // Bulk Actions
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedSubscriptions.size} subscriptions?`)) return

    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .in('id', Array.from(selectedSubscriptions))

      if (error) throw error

      toast.success('Subscriptions deleted successfully')
      fetchSubscriptions()
    } catch (error) {
      console.error('Error deleting subscriptions:', error)
      toast.error('Failed to delete subscriptions')
    }
  }

  const handleExportPDF = () => {
    const doc = new jsPDF()
    
    // Filter data based on selection or export all visible
    const dataToExport = selectedSubscriptions.size > 0 
      ? subscriptions.filter(s => selectedSubscriptions.has(s.id))
      : subscriptions

    const tableData = dataToExport.map(sub => [
      sub.customer?.full_name || 'Unknown',
      sub.product?.name || 'Unknown',
      sub.product?.product_type || '-',
      sub.master_account?.account_email || '-',
      sub.status,
      format(new Date(sub.start_date), 'yyyy-MM-dd'),
      format(new Date(sub.end_date), 'yyyy-MM-dd')
    ])

    autoTable(doc, {
      head: [['Customer', 'Product', 'Type', 'Master Account', 'Status', 'Start Date', 'End Date']],
      body: tableData,
    })

    doc.save('subscriptions-report.pdf')
    toast.success('PDF exported successfully')
  }

  const handleCopyToClipboard = (sub: any) => {
    const text = `
Customer: ${sub.customer?.full_name}
Customer Email: ${sub.customer?.email || 'N/A'}
Family Email: ${sub.master_account?.account_email || 'N/A'}
Product: ${sub.product?.name}
Status: ${sub.status}
Start: ${format(new Date(sub.start_date), 'yyyy-MM-dd')}
End: ${format(new Date(sub.end_date), 'yyyy-MM-dd')}
    `.trim()
    
    navigator.clipboard.writeText(text)
    toast.success('Subscription details copied to clipboard')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">Manage customer subscriptions</p>
        </div>
        <div className="flex gap-2">
          {selectedSubscriptions.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <CheckSquare className="mr-2 h-4 w-4" />
                  {selectedSubscriptions.size} Selected
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export Selected
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive">
                  <Trash className="mr-2 h-4 w-4" />
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="outline" onClick={handleExportPDF}>
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Link href="/admin/subscriptions/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Subscription
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer or product..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchSubscriptions}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={subscriptions.length > 0 && selectedSubscriptions.size === subscriptions.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Master Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : subscriptions.length > 0 ? (
                subscriptions.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedSubscriptions.has(sub.id)}
                        onCheckedChange={() => toggleSelect(sub.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <CreditCard className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{sub.customer?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{sub.customer?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{sub.product?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {sub.product?.product_type === 'shared' ? 'Shared' : 'Individual'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub.master_account ? (
                        <span className="text-sm">{sub.master_account.account_email}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusColors[sub.status]}>
                          {sub.status}
                        </Badge>
                        {sub.status === 'active' && getExpiryBadge(sub.end_date)}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(sub.start_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(new Date(sub.end_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleCopyToClipboard(sub)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Details
                          </DropdownMenuItem>
                          <Link href={`/admin/subscriptions/${sub.id}`}>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={async () => {
                              if (!confirm('Are you sure you want to delete this subscription?')) return
                              const { error } = await supabase.from('subscriptions').delete().eq('id', sub.id)
                              if (error) toast.error('Failed to delete')
                              else {
                                toast.success('Deleted successfully')
                                fetchSubscriptions()
                              }
                            }}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'No subscriptions found matching your filters' 
                      : 'No subscriptions found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} subscriptions
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
