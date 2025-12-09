import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Shield, Users, Zap } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin') {
      redirect('/admin/dashboard')
    } else {
      redirect('/portal/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Package className="h-6 w-6" />
            <span>SubsCRM</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4">
        <section className="py-20 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Manage Your Digital
            <br />
            <span className="text-primary">Subscriptions</span> with Ease
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            A comprehensive CRM system for managing shared subscriptions, 
            customer accounts, and support tickets all in one place.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg">Start Free Trial</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">Sign In</Button>
            </Link>
          </div>
        </section>

        <section className="py-20">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <Package className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Product Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Manage shared and individual subscription products with 
                  configurable slots and pricing.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Customer Portal</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Dedicated portal for customers to view subscriptions 
                  and manage their accounts.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Secure Credentials</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Store master account credentials securely with 
                  encryption and access controls.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Issue Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Built-in support system for customers to report 
                  issues and track resolutions.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 SubsCRM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
