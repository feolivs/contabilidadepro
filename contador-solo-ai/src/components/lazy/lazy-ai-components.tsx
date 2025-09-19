'use client'

import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Bot, MessageSquare, Sparkles } from 'lucide-react'

// Lazy load AI-related components
const AIChat = lazy(() => import('@/components/chat/ai-chat').then(module => ({
  default: module.AIChat
})))

const AIAssistantWidget = lazy(() => import('@/components/dashboard/ai-assistant-widget').then(module => ({
  default: module.AIAssistantWidget
})))

const OpenAIStatus = lazy(() => import('@/components/assistente/openai-status').then(module => ({
  default: module.OpenAIStatus
})))

interface LazyAIComponentProps {
  [key: string]: any
}

function AIChatSkeleton() {
  return (
    <Card className="w-full h-96">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5" />
          <CardTitle>Chat IA</CardTitle>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages skeleton */}
        <div className="space-y-3">
          <div className="flex items-start space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="flex items-start space-x-2 justify-end">
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-2/3 ml-auto" />
              <Skeleton className="h-4 w-1/3 ml-auto" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        {/* Input skeleton */}
        <div className="mt-4">
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

function AIWidgetSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5" />
          <CardTitle className="text-sm">Assistente IA</CardTitle>
          <Sparkles className="h-4 w-4 animate-pulse text-blue-500" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-8 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

function AIStatusSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm flex items-center space-x-2">
          <Bot className="h-4 w-4" />
          <span>Status OpenAI</span>
          <Loader2 className="h-3 w-3 animate-spin" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-6 w-16" />
        </div>
      </CardContent>
    </Card>
  )
}

export function LazyAIChat(props: LazyAIComponentProps) {
  return (
    <Suspense fallback={<AIChatSkeleton />}>
      <AIChat {...props} />
    </Suspense>
  )
}

export function LazyAIAssistantWidget(props: LazyAIComponentProps) {
  return (
    <Suspense fallback={<AIWidgetSkeleton />}>
      <AIAssistantWidget {...props} />
    </Suspense>
  )
}

export function LazyOpenAIStatus(props: LazyAIComponentProps) {
  return (
    <Suspense fallback={<AIStatusSkeleton />}>
      <OpenAIStatus {...props} />
    </Suspense>
  )
}