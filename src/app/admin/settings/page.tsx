'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Settings, 
  Shield, 
  Bell, 
  Database, 
  RefreshCw, 
  Save,
  Users,
  ClipboardList,
  Calendar
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface AuditLog {
  id: string
  user_id: string
  action: string
  table_name: string
  record_id: string | null
  old_data: any
  new_data: any
  ip_address: string | null
  created_at: string
  user?: {
    full_name: string | null
    email: string
  }
}

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  created_at: string
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [auditLoading, setAuditLoading] = useState(true)
  const [auditPage, setAuditPage] = useState(1)
  const [auditFilter, setAuditFilter] = useState<string>('all')
  const [totalAuditLogs, setTotalAuditLogs] = useState(0)
  
  // System settings
  const [settings, setSettings] = useState({
    autoRenewalEnabled: true,
    renewalReminderDays: 7,
    issueAutoCloseAfterDays: 30,
    enableEmailNotifications: true,
    enableAuditLogging: true,
  })

  const supabase = createClient()
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    fetchAuditLogs()
    fetchAdmins()
  }, [auditPage, auditFilter])

  const fetchAuditLogs = async () => {
    setAuditLoading(true)
    
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:profiles(full_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((auditPage - 1) * ITEMS_PER_PAGE, auditPage * ITEMS_PER_PAGE - 1)

    if (auditFilter !== 'all') {
      query = query.eq('table_name', auditFilter)
    }

    const { data, count } = await query
    setAuditLogs(data || [])
    setTotalAuditLogs(count || 0)
    setAuditLoading(false)
  }

  const fetchAdmins = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: false })

    setAdmins(data || [])
  }

  const toggleAdminStatus = async (userId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !isActive })
      .eq('id', userId)

    if (error) {
      toast.error('Failed to update admin status')
    } else {
      toast.success(`Admin ${isActive ? 'deactivated' : 'activated'} successfully`)
      fetchAdmins()
    }
  }

  const saveSettings = async () => {
    setLoading(true)
    // In a real app, you'd save these to a settings table
    await new Promise(resolve => setTimeout(resolve, 500))
    toast.success('Settings saved successfully')
    setLoading(false)
  }

  const getActionBadgeColor = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (action) {
      case 'INSERT': return 'default'
      case 'UPDATE': return 'secondary'
      case 'DELETE': return 'destructive'
      default: return 'outline'
    }
  }

  const totalAuditPages = Math.ceil(totalAuditLogs / ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage system configuration and view audit logs</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="admins">
            <Users className="mr-2 h-4 w-4" />
            Admins
          </TabsTrigger>
          <TabsTrigger value="audit">
            <ClipboardList className="mr-2 h-4 w-4" />
            Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Subscription Settings
              </CardTitle>
              <CardDescription>
                Configure automatic subscription handling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Auto-Renewal Processing</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically renew subscriptions when they expire
                  </p>
                </div>
                <Switch
                  checked={settings.autoRenewalEnabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, autoRenewalEnabled: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Renewal Reminder (Days Before)</Label>
                <Input
                  type="number"
                  value={settings.renewalReminderDays}
                  onChange={(e) => 
                    setSettings(prev => ({ 
                      ...prev, 
                      renewalReminderDays: parseInt(e.target.value) || 7 
                    }))
                  }
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">
                  Send reminder notifications this many days before expiration
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure system notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email notifications for important events
                  </p>
                </div>
                <Switch
                  checked={settings.enableEmailNotifications}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enableEmailNotifications: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure audit logging and security features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Audit Logging</Label>
                  <p className="text-sm text-muted-foreground">
                    Log all data changes for security and compliance
                  </p>
                </div>
                <Switch
                  checked={settings.enableAuditLogging}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enableAuditLogging: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Auto-Close Issues After (Days)</Label>
                <Input
                  type="number"
                  value={settings.issueAutoCloseAfterDays}
                  onChange={(e) => 
                    setSettings(prev => ({ 
                      ...prev, 
                      issueAutoCloseAfterDays: parseInt(e.target.value) || 30 
                    }))
                  }
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">
                  Automatically close resolved issues after this many days
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={loading}>
              {loading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Settings
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="admins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Administrator Accounts
              </CardTitle>
              <CardDescription>
                Manage admin users and their access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.length > 0 ? (
                    admins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">
                          {admin.full_name || 'Unnamed'}
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>
                          <Badge variant={admin.is_active ? 'default' : 'destructive'}>
                            {admin.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(admin.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAdminStatus(admin.id, admin.is_active)}
                          >
                            {admin.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No admin accounts found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Audit Logs
                  </CardTitle>
                  <CardDescription>
                    View all system changes and activities
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={auditFilter} onValueChange={setAuditFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by table" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tables</SelectItem>
                      <SelectItem value="products">Products</SelectItem>
                      <SelectItem value="subscriptions">Subscriptions</SelectItem>
                      <SelectItem value="master_accounts">Master Accounts</SelectItem>
                      <SelectItem value="issues">Issues</SelectItem>
                      <SelectItem value="profiles">Profiles</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={fetchAuditLogs}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Table</TableHead>
                        <TableHead>Record ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.length > 0 ? (
                        auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm">
                              {format(new Date(log.created_at), 'MMM d, h:mm a')}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">
                                  {log.user?.full_name || 'System'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {log.user?.email || ''}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getActionBadgeColor(log.action)}>
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {log.table_name}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {log.record_id?.substring(0, 8) || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No audit logs found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {totalAuditPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {((auditPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
                        {Math.min(auditPage * ITEMS_PER_PAGE, totalAuditLogs)} of {totalAuditLogs}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={auditPage === 1}
                          onClick={() => setAuditPage(prev => prev - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={auditPage >= totalAuditPages}
                          onClick={() => setAuditPage(prev => prev + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
