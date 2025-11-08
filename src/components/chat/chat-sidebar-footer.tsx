'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CreditCard, Zap, TrendingUp, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/utils/cn'
import { api } from '@/igniter.client'

// Plan limits configuration
const PLAN_LIMITS: Record<string, number> = {
  FREE: 1000,
  PRO: 5000,
  BUSINESS: 20000,
  ENTERPRISE: 100000,
}

// Plan display names
const PLAN_NAMES: Record<string, string> = {
  FREE: 'Gratuito',
  PRO: 'Pro',
  BUSINESS: 'Business',
  ENTERPRISE: 'Enterprise',
}

// Plan colors for progress bar
const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-gradient-to-r from-gray-400 to-gray-500',
  PRO: 'bg-gradient-to-r from-blue-500 to-blue-600',
  BUSINESS: 'bg-gradient-to-r from-purple-500 to-purple-600',
  ENTERPRISE: 'bg-gradient-to-r from-amber-500 to-amber-600',
}

interface UsageStats {
  credits: number
  totalCost: number
  costLast30Days: number
}

interface ChatSidebarFooterProps {
  className?: string
  userPlan?: string
}

export function ChatSidebarFooter({
  className,
  userPlan = 'FREE',
}: ChatSidebarFooterProps) {
  const router = useRouter()
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch usage stats
  const { data: statsData, isLoading: isLoadingStats } =
    // @ts-expect-error - Igniter.js query types may not match exactly
    api.usage.stats.useQuery()

  useEffect(() => {
    if (statsData) {
      const response = statsData as any
      const extractedStats: UsageStats = {
        credits: response?.data?.credits ?? response?.credits ?? 0,
        totalCost: response?.data?.totalCost ?? response?.totalCost ?? 0,
        costLast30Days:
          response?.data?.costLast30Days ?? response?.costLast30Days ?? 0,
      }
      setStats(extractedStats)
      setIsLoading(false)
    } else {
      setIsLoading(isLoadingStats)
    }
  }, [statsData, isLoadingStats])

  // Calculate usage percentage and remaining credits
  const planLimit = PLAN_LIMITS[userPlan] || PLAN_LIMITS.FREE
  const currentCredits = stats?.credits ?? 0
  const usedCredits = planLimit - currentCredits
  const usagePercentage = Math.min((usedCredits / planLimit) * 100, 100)

  // Calculate days until refill (assuming monthly billing cycle)
  const getDaysUntilRefill = () => {
    const now = new Date()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const daysRemaining = Math.ceil(
      (endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )
    return daysRemaining
  }

  const daysUntilRefill = getDaysUntilRefill()

  // Format credits for display
  const formatCredits = (credits: number) => {
    if (credits >= 1000) {
      return `${(credits / 1000).toFixed(1)}K`
    }
    return credits.toString()
  }

  const handleManagePlan = () => {
    router.push('/app/settings/organization/billing')
  }

  if (isLoading) {
    return (
      <div className={cn('border-t border-border/50 p-4 space-y-3', className)}>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'border-t border-border/50 p-4 glass-effect',
        className,
      )}
    >
      <div className="space-y-3">
        {/* Plan Name and Manage Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                userPlan === 'FREE' && 'bg-gray-500/20',
                userPlan === 'PRO' && 'bg-blue-500/20',
                userPlan === 'BUSINESS' && 'bg-purple-500/20',
                userPlan === 'ENTERPRISE' && 'bg-amber-500/20',
              )}
            >
              {userPlan === 'FREE' && (
                <CreditCard className="w-4 h-4 text-gray-400" />
              )}
              {userPlan === 'PRO' && (
                <Zap className="w-4 h-4 text-blue-500" />
              )}
              {(userPlan === 'BUSINESS' || userPlan === 'ENTERPRISE') && (
                <TrendingUp
                  className={cn(
                    'w-4 h-4',
                    userPlan === 'BUSINESS' && 'text-purple-500',
                    userPlan === 'ENTERPRISE' && 'text-amber-500',
                  )}
                />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plano</p>
              <p className="text-sm font-semibold text-foreground">
                {PLAN_NAMES[userPlan] || 'Gratuito'}
              </p>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleManagePlan}
                  className="h-8 px-2 hover:bg-primary/10 transition-all-smooth"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Gerenciar plano</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Credits Display with Progress */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Créditos</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm font-bold text-foreground cursor-help">
                    {formatCredits(currentCredits)} /{' '}
                    {formatCredits(planLimit)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-semibold">
                      Créditos disponíveis: {currentCredits.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Limite do plano: {planLimit.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Utilizados: {usedCredits.toLocaleString()} (
                      {usagePercentage.toFixed(1)}%)
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Custom Progress Bar with Gradient */}
          <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${usagePercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                PLAN_COLORS[userPlan] || PLAN_COLORS.FREE,
                usagePercentage > 80 && 'bg-gradient-to-r from-red-500 to-red-600',
              )}
            />
            {/* Glow effect for high usage */}
            {usagePercentage > 80 && (
              <motion.div
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-full"
              />
            )}
          </div>

          {/* Refill Information */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Renovação em {daysUntilRefill}{' '}
              {daysUntilRefill === 1 ? 'dia' : 'dias'}
            </span>
            {usagePercentage > 80 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleManagePlan}
                      className="h-6 px-2 text-xs hover:bg-primary/10 transition-all-smooth text-primary"
                    >
                      Upgrade
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Faça upgrade para mais créditos</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Warning for low credits */}
        {usagePercentage > 90 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            <p className="text-xs text-destructive font-medium">
              Créditos baixos! Considere fazer upgrade.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

