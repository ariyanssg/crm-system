'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, Copy, Check, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface SecurePasswordFieldProps {
  value: string
  recordId?: string
  recordType?: 'master_account' | 'subscription'
  onChange?: (value: string) => void
  disabled?: boolean
  placeholder?: string
  name?: string
  required?: boolean
  isEditing?: boolean
}

export function SecurePasswordField({
  value,
  recordId,
  recordType,
  onChange,
  disabled = false,
  placeholder = 'Enter password',
  name,
  required = false,
  isEditing = false,
}: SecurePasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [decryptedPassword, setDecryptedPassword] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleRevealPassword = async () => {
    if (showPassword) {
      setShowPassword(false)
      setDecryptedPassword(null)
      return
    }

    if (isEditing || !value) {
      setShowPassword(true)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        password: value,
        ...(recordId && { recordId }),
        ...(recordType && { recordType }),
      })

      const response = await fetch(`/api/encrypt?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setDecryptedPassword(data.password)
        setShowPassword(true)
      } else {
        toast.error('Failed to reveal password')
      }
    } catch (error) {
      toast.error('Failed to reveal password')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    const passwordToCopy = decryptedPassword || value
    await navigator.clipboard.writeText(passwordToCopy)
    setCopied(true)
    toast.success('Password copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const displayValue = showPassword 
    ? (decryptedPassword || value) 
    : (value ? '••••••••••••' : '')

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            value={displayValue}
            readOnly
            className="pr-20 bg-muted font-mono"
          />
          <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRevealPassword}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            {showPassword && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        type={showPassword ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className="pr-10"
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
  )
}

// Display only component for viewing passwords securely
export function SecurePasswordDisplay({
  value,
  recordId,
  recordType,
}: {
  value: string
  recordId: string
  recordType: 'master_account' | 'subscription'
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [decryptedPassword, setDecryptedPassword] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleRevealPassword = async () => {
    if (showPassword) {
      setShowPassword(false)
      setDecryptedPassword(null)
      return
    }

    if (!value) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        password: value,
        recordId,
        recordType,
      })

      const response = await fetch(`/api/encrypt?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setDecryptedPassword(data.password)
        setShowPassword(true)
      } else {
        toast.error('Failed to reveal password')
      }
    } catch (error) {
      toast.error('Failed to reveal password')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!decryptedPassword) return
    await navigator.clipboard.writeText(decryptedPassword)
    setCopied(true)
    toast.success('Password copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  if (!value) {
    return <span className="text-muted-foreground">Not set</span>
  }

  return (
    <div className="flex items-center gap-2">
      <Lock className="h-4 w-4 text-muted-foreground" />
      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
        {showPassword ? decryptedPassword : '••••••••'}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleRevealPassword}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </Button>
      {showPassword && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  )
}
