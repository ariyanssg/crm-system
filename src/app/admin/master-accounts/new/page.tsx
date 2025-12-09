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
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import type { Product } from '@/types/database'

export default function NewMasterAccountPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('product_type', 'shared')
        .eq('status', 'active')

      if (data) setProducts(data)
    }

    fetchProducts()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    const accountData = {
      product_id: formData.get('product_id') as string,
      account_email: formData.get('account_email') as string,
      account_password: formData.get('account_password') as string,
      recovery_email: formData.get('recovery_email') as string || null,
      recovery_phone: formData.get('recovery_phone') as string || null,
      authenticator_secret: formData.get('authenticator_secret') as string || null,
      notes: formData.get('notes') as string || null,
      is_active: true,
    }

    try {
      const { error } = await supabase.from('master_accounts').insert(accountData)

      if (error) throw error

      router.push('/admin/master-accounts')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create master account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/master-accounts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Master Account</h1>
          <p className="text-muted-foreground">Add credentials for a shared/family plan</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Account Credentials</CardTitle>
          <CardDescription>
            Enter the master account credentials. These will be stored securely.
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
              <Select name="product_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.max_slots} slots)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_email">Account Email</Label>
              <Input
                id="account_email"
                name="account_email"
                type="email"
                placeholder="familymanager@gmail.com"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_password">Account Password</Label>
              <div className="relative">
                <Input
                  id="account_password"
                  name="account_password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recovery_email">Recovery Email (optional)</Label>
                <Input
                  id="recovery_email"
                  name="recovery_email"
                  type="email"
                  placeholder="recovery@gmail.com"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recovery_phone">Recovery Phone (optional)</Label>
                <Input
                  id="recovery_phone"
                  name="recovery_phone"
                  type="tel"
                  placeholder="+1234567890"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="authenticator_secret">2FA/Authenticator Secret (optional)</Label>
              <Input
                id="authenticator_secret"
                name="authenticator_secret"
                type="text"
                placeholder="JBSWY3DPEHPK3PXP..."
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Additional notes, security questions, etc..."
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Master Account
              </Button>
              <Link href="/admin/master-accounts">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
