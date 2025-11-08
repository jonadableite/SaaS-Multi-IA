import { igniter } from '@/igniter'
import { AccountController } from '@/@saas-boilerplate/features/account/controllers/account.controller'
import { ApiKeyController } from '@/@saas-boilerplate/features/api-key/controllers/api-key.controller'
import { AuthController } from '@/@saas-boilerplate/features/auth/controllers/auth.controller'
import { InvitationController } from '@/@saas-boilerplate/features/invitation/controllers/invitation.controller'
import { OrganizationController } from '@/@saas-boilerplate/features/organization/controllers/organization.controller'
import { MembershipController } from '@/@saas-boilerplate/features/membership/controllers/membership.controller'
import { UserController } from '@/@saas-boilerplate/features/user/controllers/user.controller'
import { WebhookController } from '@/@saas-boilerplate/features/webhook/controllers/webhook.controller'
import { SessionController } from '@/@saas-boilerplate/features/session/controllers/session.controller'
import { PlanController } from '@/@saas-boilerplate/features/plan/controllers/plan.controller'
import { LeadController } from './features/lead/controllers/lead.controller'
import { SubmissionController } from './features/submission/controllers/submission.controller'
import { IntegrationController } from './@saas-boilerplate/features/integration/controllers/integration.controller'
import { BillingController } from './@saas-boilerplate/features/billing/controllers/billing.controller'
import { NotificationController } from './@saas-boilerplate/features/notification/controllers/notification.controller'
import { AdminController } from './@saas-boilerplate/features/admin/controllers/admin.controller'
import { StatsController } from './@saas-boilerplate/features/admin/controllers/stats.controller'
import { SubscriptionController } from './@saas-boilerplate/features/admin/controllers/subscription.controller'
import { ChatController } from './features/chat/controllers/chat.controller'
import { ConversationController } from './features/conversation/controllers/conversation.controller'
import { AgentController } from './features/agent/controllers/agent.controller'
import { UsageController } from './features/usage/controllers/usage.controller'
import { MemoryController } from './features/memory/controllers/memory.controller'
import { PromptController } from './features/prompt/controllers/prompt.controller'
import { SocialController } from './features/social/controllers/social.controller'
import { KnowledgeController } from './features/knowledge/controllers/knowledge.controller'
import { ToolsController } from './features/tools/controllers/tools.controller'
import { DocumentController } from './features/document/controllers/document.controller'

/**
 * @router AppRouter
 * @description Main application router that aggregates all feature controllers into a unified API.
 *
 * This router serves as the central hub for all API endpoints in the application, combining:
 * - SaaS Boilerplate controllers for core functionality (auth, billing, organization management)
 * - Custom feature controllers for application-specific functionality (leads, submissions)
 * - Integration controllers for third-party services and webhooks
 * - Content management controllers for blog, help center, and content operations
 *
 * The router follows a hierarchical structure where each controller is namespaced under its
 * feature name, providing clear API organization and preventing naming conflicts.
 *
 * @example
 * ```typescript
 * // Accessing different controller endpoints
 * const authEndpoints = api.auth // Authentication endpoints
 * const leadEndpoints = api.lead // Lead management endpoints
 * const billingEndpoints = api.billing // Billing and subscription endpoints
 * ```
 *
 * @see {@link igniter.router} for the underlying router implementation
 */
export const AppRouter = igniter.router({
  controllers: {
    // SaaS Boilerplate controllers - Core platform functionality
    account: AccountController, // User account management
    apiKey: ApiKeyController, // API key authentication and management
    auth: AuthController, // Authentication and session management
    invitation: InvitationController, // Organization invitation system
    membership: MembershipController, // Organization membership management
    organization: OrganizationController, // Organization CRUD operations
    integration: IntegrationController, // Third-party service integrations
    user: UserController, // User profile and management
    webhook: WebhookController, // Webhook handling and processing
    session: SessionController, // Session management and validation
    plan: PlanController, // Subscription plan management
    billing: BillingController, // Billing and payment processing
    notification: NotificationController, // Notification system

    // Custom controllers - Application-specific functionality
    submission: SubmissionController, // Form submission handling
    lead: LeadController, // Lead management and tracking

    // Multi-IA controllers - AI chat and agent management
    chat: ChatController, // AI chat operations
    conversation: ConversationController, // Conversation management
    agent: AgentController, // AI agent management
    usage: UsageController, // Usage tracking and statistics
    memory: MemoryController, // User memory management
    prompt: PromptController, // Prompt library management
    social: SocialController, // Social network integrated search
    knowledge: KnowledgeController, // Knowledge ingestion and search
    tools: ToolsController, // Productivity tools (summarize, tasks, outline)
    document: DocumentController, // Automated document generation

    // Admin controllers - Super-administrative functionality
    admin: AdminController, // Administrative operations
    stats: StatsController, // System statistics and analytics
    subscription: SubscriptionController, // Subscription and plan management
  },
})

export type AppRouterType = typeof AppRouter
