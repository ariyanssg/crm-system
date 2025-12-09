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
import { Plus, Edit, KeyRound, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

const ITEMS_PER_PAGE = 10

export default function MasterAccountsPage() {
  const [masterAccounts, setMasterAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  const supabase = createClient()

  const fetchMasterAccounts = async () => {
    setLoading(true)
    
    try {
      let query = supabase
        .from('master_accounts')
        .select('*', { count: 'exact' })

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

      const { data: accountsData, count, error: accountsError } = await query

      if (accountsError) {
        console.error('Error fetching master accounts:', accountsError.message, accountsError.code)
        setMasterAccounts([])
        setTotalCount(0)
        setLoading(false)
        return
      }

      if (accountsData && accountsData.length > 0) {
        // Get unique product IDs
        const productIds = Array.from(new Set(accountsData.map(a => a.product_id).filter(Boolean)))
        const accountIds = accountsData.map(a => a.id)

        // Fetch products and subscription counts in parallel
        let productsData: any[] = []
        let subsData: any[] = []

        if (productIds.length > 0) {
          const { data } = await supabase.from('products').select('*').in('id', productIds)
          productsData = data || []
        }

        if (accountIds.length > 0) {
          const { data } = await supabase.from('subscriptions').select('master_account_id').in('master_account_id', accountIds)
          subsData = data || []
        }

        // Create lookup maps
        const productsMap: Record<string, any> = {}
        const subsCounts: Record<string, number> = {}
        
        productsData.forEach((p: any) => { productsMap[p.id] = p })
        subsData.forEach((s: any) => { 
          subsCounts[s.master_account_id] = (subsCounts[s.master_account_id] || 0) + 1
        })

        // Merge data
        let enrichedData = accountsData.map(account => ({
          ...account,
          product: productsMap[account.product_id] || null,
          subscriptions_count: subsCounts[account.id] || 0
        }))

        // Apply search filter client-side
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          enrichedData = enrichedData.filter((account: any) =>
            account.account_email?.toLowerCase().includes(q) ||
            account.product?.name?.toLowerCase().includes(q)
          )
        }
        
        setMasterAccounts(enrichedData)
      } else {
        setMasterAccounts([])
      }
      
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Error:', err)
      setMasterAccounts([])
      setTotalCount(0)
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchMasterAccounts()
  }, [currentPage, statusFilter])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchMasterAccounts()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Master Accounts</h1>
          <p className="text-muted-foreground">Manage family/shared account credentials</p>
        </div>
        <Link href="/admin/master-accounts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Master Account
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or product..."
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
            <Button variant="outline" size="icon" onClick={fetchMasterAccounts}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Account Email</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Slots Used</TableHead>
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
              ) : masterAccounts.length > 0 ? (
                masterAccounts.map((account: any) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <KeyRound className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{account.product?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{account.account_email}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{account.account_password || '••••••••'}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {account.subscriptions_count || 0} / {account.product?.max_slots || '?'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.is_active ? 'default' : 'destructive'}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(account.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/master-accounts/${account.id}`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'No master accounts found matching your filters' 
                      : 'No master accounts found. Add your first shared account credentials.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} accounts
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
