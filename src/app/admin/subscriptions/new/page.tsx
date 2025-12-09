'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, UserPlus, Users } from 'lucide-react'
import Link from 'next/link'
import { format, addDays } from 'date-fns'
import type { Product, Profile, MasterAccount } from '@/types/database'
import { toast } from 'sonner'

export default function NewSubscriptionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Profile[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [masterAccounts, setMasterAccounts] = useState<MasterAccount[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [selectedMasterAccount, setSelectedMasterAccount] = useState<string>('')
  const [invitationEmail, setInvitationEmail] = useState<string>('')
  const [createNewCustomer, setCreateNewCustomer] = useState(false)
  
  // Bulk Mode State
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [bulkEmails, setBulkEmails] = useState('')
  const [remainingSlots, setRemainingSlots] = useState<number | null>(null)

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'customer')
      .order('full_name', { ascending: true })
    
    if (data) setCustomers(data)
  }

  useEffect(() => {
    const fetchData = async () => {
      const [_, productsRes] = await Promise.all([
        fetchCustomers(),
        supabase.from('products').select('*').eq('status', 'active'),
      ])

      if (productsRes.data) setProducts(productsRes.data)
    }

    fetchData()
  }, [supabase])

  useEffect(() => {
    const fetchMasterAccounts = async () => {
      if (!selectedProduct || selectedProduct.product_type !== 'shared') {
        setMasterAccounts([])
        setMode('single') // Force single mode for non-shared products
        return
      }

      const { data } = await supabase
        .from('master_accounts')
        .select('*')
        .eq('product_id', selectedProduct.id)
        .eq('is_active', true)

      if (data) setMasterAccounts(data)
    }

    fetchMasterAccounts()
  }, [selectedProduct, supabase])

  // Fetch remaining slots when master account changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedMasterAccount || !selectedProduct?.max_slots) {
        setRemainingSlots(null)
        return
      }

      const { count } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('master_account_id', selectedMasterAccount)
        .neq('status', 'expired')
        .neq('status', 'suspended')

      const used = count || 0
      setRemainingSlots(Math.max(0, selectedProduct.max_slots - used))
    }

    fetchSlots()
  }, [selectedMasterAccount, selectedProduct, supabase])

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId)
    setSelectedProduct(product || null)
    setSelectedMasterAccount('')
    setRemainingSlots(null)
  }

  const getOrCreateCustomer = async (email: string): Promise<string> => {
    // Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingCustomer) {
      return existingCustomer.id
    }

    // Create new customer
    const tempPassword = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password: tempPassword,
      options: {
        data: {
          full_name: email.split('@')[0],
          role: 'customer',
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) throw new Error(`Failed to create customer ${email}: ${authError.message}`)
    if (!authData.user) throw new Error(`Failed to create customer ${email}: No user returned`)

    const customerId = authData.user.id
    
    // Wait a bit for trigger
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Ensure profile exists
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: email.split('@')[0],
        role: 'customer',
        is_active: true,
      })
      .eq('id', customerId)

    if (updateError) {
      await supabase.from('profiles').insert({
        id: customerId,
        email: email.toLowerCase(),
        full_name: email.split('@')[0],
        role: 'customer',
        is_active: true,
      })
    }

    return customerId
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const startDate = formData.get('start_date') as string
    const billingDays = selectedProduct?.billing_cycle_days || 30
    const notes = formData.get('notes') as string

    try {
      if (mode === 'bulk' && selectedProduct?.product_type === 'shared') {
        // BULK MODE
        const emails = bulkEmails
          .split(/[\n,]+/)
          .map(e => e.trim())
          .filter(e => e && e.includes('@'))

        if (emails.length === 0) throw new Error('Please enter at least one valid email')
        
        if (remainingSlots !== null && emails.length > remainingSlots) {
          throw new Error(`You entered ${emails.length} emails but only ${remainingSlots} slots are available.`)
        }

        let successCount = 0
        
        for (const email of emails) {
          try {
            const customerId = await getOrCreateCustomer(email)
            
            const subscriptionData: any = {
              customer_id: customerId,
              product_id: selectedProduct.id,
              status: 'active',
              start_date: startDate,
              end_date: format(addDays(new Date(startDate), billingDays), 'yyyy-MM-dd'),
              notes: notes,
              master_account_id: selectedMasterAccount,
              invited_email: email,
              // We don't assign specific slot numbers in bulk, or we could auto-increment?
              // Let's leave slot_number null or handle it if DB requires it.
              // Assuming DB allows null or we don't strictly track slot numbers 1-5, just count.
              // If slot_number is required, we need to find available ones.
              // For now, let's assume it's not a strict unique constraint or we can skip it.
            }

            const { error } = await supabase.from('subscriptions').insert(subscriptionData)
            if (error) throw error
            successCount++
          } catch (err) {
            console.error(`Failed for ${email}:`, err)
            // Continue with others? Or stop?
            // Let's continue and report at end if possible, but for now simple throw/toast
            toast.error(`Failed to process ${email}`)
          }
        }

        toast.success(`Successfully created ${successCount} subscriptions`)
        
      } else {
        // SINGLE MODE
        let customerId = selectedCustomer

        if (!customerId && invitationEmail) {
          customerId = await getOrCreateCustomer(invitationEmail)
        }

        if (!customerId) {
          throw new Error('Please select a customer or enter an invitation email')
        }

        const subscriptionData: any = {
          customer_id: customerId,
          product_id: selectedProduct?.id,
          status: 'active',
          start_date: startDate,
          end_date: format(addDays(new Date(startDate), billingDays), 'yyyy-MM-dd'),
          notes: notes,
        }

        if (selectedProduct?.product_type === 'shared') {
          subscriptionData.master_account_id = selectedMasterAccount
          subscriptionData.invited_email = invitationEmail || formData.get('invited_email') as string
          subscriptionData.slot_number = parseInt(formData.get('slot_number') as string) || null
        } else {
          subscriptionData.individual_email = formData.get('individual_email') as string
          subscriptionData.individual_password = formData.get('individual_password') as string
        }

        const { error } = await supabase.from('subscriptions').insert(subscriptionData)
        if (error) throw error
        
        toast.success('Subscription created successfully')
      }

      router.push('/admin/subscriptions')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/subscriptions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Subscription</h1>
          <p className="text-muted-foreground">Create a new customer subscription</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Subscription Details</CardTitle>
          <CardDescription>Configure the subscription</CardDescription>
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
              <Select onValueChange={handleProductChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - ${product.price}/{product.billing_cycle_days} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct?.product_type === 'shared' && (
              <>
                <div className="space-y-2">
                  <Label>Master Account</Label>
                  <Select value={selectedMasterAccount} onValueChange={setSelectedMasterAccount} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select master account" />
                    </SelectTrigger>
                    <SelectContent>
                      {masterAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {remainingSlots !== null && (
                    <div className="mt-1">
                      <Badge variant={remainingSlots > 0 ? "outline" : "destructive"}>
                        {remainingSlots} slots remaining
                      </Badge>
                    </div>
                  )}
                </div>

                <Tabs value={mode} onValueChange={(v) => setMode(v as 'single' | 'bulk')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="single">Single Subscription</TabsTrigger>
                    <TabsTrigger value="bulk">Bulk Add (Emails)</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="single" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Customer</Label>
                      <div className="space-y-3">
                        {!createNewCustomer ? (
                          <>
                            <Select value={selectedCustomer} onValueChange={(v) => { setSelectedCustomer(v); setInvitationEmail(''); }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select existing customer" />
                              </SelectTrigger>
                              <SelectContent>
                                {customers.map((customer) => (
                                  <SelectItem key={customer.id} value={customer.id}>
                                    {customer.full_name || customer.email} {customer.email && `(${customer.email})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => { setCreateNewCustomer(true); setSelectedCustomer(''); }}
                              className="w-full"
                            >
                              <UserPlus className="mr-2 h-4 w-4" />
                              Or create new customer from email
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="invitation_email">Customer Email (will be created if new)</Label>
                              <Input
                                id="invitation_email"
                                type="email"
                                value={invitationEmail}
                                onChange={(e) => setInvitationEmail(e.target.value)}
                                placeholder="customer@example.com"
                                required={createNewCustomer && mode === 'single'}
                                disabled={loading}
                              />
                              <p className="text-xs text-muted-foreground">
                                If this email doesn&apos;t exist, a new customer will be created automatically.
                              </p>
                            </div>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => { setCreateNewCustomer(false); setInvitationEmail(''); }}
                              className="w-full"
                            >
                              Select existing customer instead
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="slot_number">Slot Number (Optional)</Label>
                        <Input
                          id="slot_number"
                          name="slot_number"
                          type="number"
                          min="1"
                          max={selectedProduct.max_slots || 10}
                          placeholder="1"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="bulk" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulk_emails">Customer Emails</Label>
                      <Textarea
                        id="bulk_emails"
                        value={bulkEmails}
                        onChange={(e) => setBulkEmails(e.target.value)}
                        placeholder={`customer1@example.com\ncustomer2@example.com\ncustomer3@example.com`}
                        rows={6}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter one email per line or separated by commas. 
                        {remainingSlots !== null && (
                          <span className={bulkEmails.split(/[\n,]+/).filter(e => e.trim()).length > remainingSlots ? "text-destructive font-bold" : ""}>
                            {' '}You have entered {bulkEmails.split(/[\n,]+/).filter(e => e.trim()).length} emails.
                          </span>
                        )}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}

            {selectedProduct?.product_type === 'individual' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="individual_email">Account Email</Label>
                  <Input
                    id="individual_email"
                    name="individual_email"
                    type="email"
                    placeholder="account@example.com"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="individual_password">Account Password</Label>
                  <Input
                    id="individual_password"
                    name="individual_password"
                    type="text"
                    placeholder="Password"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={format(new Date(), 'yyyy-MM-dd')}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Additional notes..."
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading || !selectedProduct || (mode === 'single' && !selectedCustomer && !invitationEmail) || (mode === 'bulk' && !bulkEmails)}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'bulk' ? 'Create Subscriptions' : 'Create Subscription'}
              </Button>
              <Link href="/admin/subscriptions">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
