/**
 * Connection Prompts Utility
 * 
 * Generates smart prompts and suggestions for maintaining
 * connections with family and friends.
 */

import type { ConnectionPrompt, FamilyMember } from '@/types/lifeManagement';

interface ConnectionContext {
  memberId: string;
  lastInteraction: Date;
  relationship: FamilyMember['relationship'];
  recentEvents: string[];
  preferences: string[];
}

export class ConnectionPrompts {
  /**
   * Generate connection prompts based on context
   */
  generatePrompts(context: ConnectionContext): ConnectionPrompt[] {
    const prompts: ConnectionPrompt[] = [];
    const daysSinceInteraction = this.daysSince(context.lastInteraction);

    // Generate prompts based on relationship type
    switch (context.relationship) {
      case 'spouse':
        prompts.push(...this.generateSpousePrompts(context, daysSinceInteraction));
        break;
      case 'child':
        prompts.push(...this.generateChildPrompts(context, daysSinceInteraction));
        break;
      case 'parent':
        prompts.push(...this.generateParentPrompts(context, daysSinceInteraction));
        break;
      case 'sibling':
        prompts.push(...this.generateSiblingPrompts(context, daysSinceInteraction));
        break;
      default:
        prompts.push(...this.generateGeneralPrompts(context, daysSinceInteraction));
    }

    // Sort by priority
    return prompts.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Generate prompts for spouse
   */
  private generateSpousePrompts(
    context: ConnectionContext,
    daysSince: number
  ): ConnectionPrompt[] {
    const prompts: ConnectionPrompt[] = [];

    if (daysSince > 1) {
      prompts.push({
        id: `prompt_${Date.now()}_1`,
        memberId: context.memberId,
        lastInteraction: context.lastInteraction,
        suggestedAction: 'Plan a date night this week',
        priority: 'high',
        dismissed: false,
        createdAt: new Date(),
      });
    }

    if (daysSince > 3) {
      prompts.push({
        id: `prompt_${Date.now()}_2`,
        memberId: context.memberId,
        lastInteraction: context.lastInteraction,
        suggestedAction: 'Have a meaningful conversation about your day',
        priority: 'medium',
        dismissed: false,
        createdAt: new Date(),
      });
    }

    prompts.push({
      id: `prompt_${Date.now()}_3`,
      memberId: context.memberId,
      lastInteraction: context.lastInteraction,
      suggestedAction: 'Share something you appreciate about them',
      priority: 'low',
      dismissed: false,
      createdAt: new Date(),
    });

    return prompts;
  }

  /**
   * Generate prompts for children
   */
  private generateChildPrompts(
    context: ConnectionContext,
    daysSince: number
  ): ConnectionPrompt[] {
    const prompts: ConnectionPrompt[] = [];

    if (daysSince > 2) {
      prompts.push({
        id: `prompt_${Date.now()}_1`,
        memberId: context.memberId,
        lastInteraction: context.lastInteraction,
        suggestedAction: 'Ask about their day at school',
        priority: 'high',
        dismissed: false,
        createdAt: new Date(),
      });
    }

    if (daysSince > 5) {
      prompts.push({
        id: `prompt_${Date.now()}_2`,
        memberId: context.memberId,
        lastInteraction: context.lastInteraction,
        suggestedAction: 'Plan a fun activity together',
        priority: 'medium',
        dismissed: false,
        createdAt: new Date(),
      });
    }

    prompts.push({
      id: `prompt_${Date.now()}_3`,
      memberId: context.memberId,
      lastInteraction: context.lastInteraction,
      suggestedAction: 'Read a book or play a game together',
      priority: 'low',
      dismissed: false,
      createdAt: new Date(),
    });

    return prompts;
  }

  /**
   * Generate prompts for parents
   */
  private generateParentPrompts(
    context: ConnectionContext,
    daysSince: number
  ): ConnectionPrompt[] {
    const prompts: ConnectionPrompt[] = [];

    if (daysSince > 3) {
      prompts.push({
        id: `prompt_${Date.now()}_1`,
        memberId: context.memberId,
        lastInteraction: context.lastInteraction,
        suggestedAction: 'Call and check in on them',
        priority: 'high',
        dismissed: false,
        createdAt: new Date(),
      });
    }

    if (daysSince > 7) {
      prompts.push({
        id: `prompt_${Date.now()}_2`,
        memberId: context.memberId,
        lastInteraction: context.lastInteraction,
        suggestedAction: 'Plan a visit or video call',
        priority: 'medium',
        dismissed: false,
        createdAt: new Date(),
      });
    }

    prompts.push({
      id: `prompt_${Date.now()}_3`,
      memberId: context.memberId,
      lastInteraction: context.lastInteraction,
      suggestedAction: 'Share a photo or update about your life',
      priority: 'low',
      dismissed: false,
      createdAt: new Date(),
    });

    return prompts;
  }

  /**
   * Generate prompts for siblings
   */
  private generateSiblingPrompts(
    context: ConnectionContext,
    daysSince: number
  ): ConnectionPrompt[] {
    const prompts: ConnectionPrompt[] = [];

    if (daysSince > 7) {
      prompts.push({
        id: `prompt_${Date.now()}_1`,
        memberId: context.memberId,
        lastInteraction: context.lastInteraction,
        suggestedAction: 'Send a message to catch up',
        priority: 'high',
        dismissed: false,
        createdAt: new Date(),
      });
    }

    if (daysSince > 14) {
      prompts.push({
        id: `prompt_${Date.now()}_2`,
        memberId: context.memberId,
        lastInteraction: context.lastInteraction,
        suggestedAction: 'Plan a family gathering',
        priority: 'medium',
        dismissed: false,
        createdAt: new Date(),
      });
    }

    prompts.push({
      id: `prompt_${Date.now()}_3`,
      memberId: context.memberId,
      lastInteraction: context.lastInteraction,
      suggestedAction: 'Share a funny memory',
      priority: 'low',
      dismissed: false,
      createdAt: new Date(),
    });

    return prompts;
  }

  /**
   * Generate general prompts
   */
  private generateGeneralPrompts(
    context: ConnectionContext,
    daysSince: number
  ): ConnectionPrompt[] {
    const prompts: ConnectionPrompt[] = [];

    if (daysSince > 7) {
      prompts.push({
        id: `prompt_${Date.now()}_1`,
        memberId: context.memberId,
        lastInteraction: context.lastInteraction,
        suggestedAction: 'Reach out and say hello',
        priority: 'high',
        dismissed: false,
        createdAt: new Date(),
      });
    }

    if (daysSince > 14) {
      prompts.push({
        id: `prompt_${Date.now()}_2`,
        memberId: context.memberId,
        lastInteraction: context.lastInteraction,
        suggestedAction: 'Schedule a catch-up call',
        priority: 'medium',
        dismissed: false,
        createdAt: new Date(),
      });
    }

    prompts.push({
      id: `prompt_${Date.now()}_3`,
      memberId: context.memberId,
      lastInteraction: context.lastInteraction,
      suggestedAction: 'Send a thoughtful message',
      priority: 'low',
      dismissed: false,
      createdAt: new Date(),
    });

    return prompts;
  }

  /**
   * Calculate days since a date
   */
  private daysSince(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get priority color
   */
  getPriorityColor(priority: ConnectionPrompt['priority']): string {
    const colors: Record<ConnectionPrompt['priority'], string> = {
      high: 'text-red-600 dark:text-red-400',
      medium: 'text-yellow-600 dark:text-yellow-400',
      low: 'text-green-600 dark:text-green-400',
    };
    return colors[priority];
  }

  /**
   * Get priority background color
   */
  getPriorityBg(priority: ConnectionPrompt['priority']): string {
    const colors: Record<ConnectionPrompt['priority'], string> = {
      high: 'bg-red-100 dark:bg-red-900/20',
      medium: 'bg-yellow-100 dark:bg-yellow-900/20',
      low: 'bg-green-100 dark:bg-green-900/20',
    };
    return colors[priority];
  }

  /**
   * Filter prompts by priority
   */
  filterByPriority(
    prompts: ConnectionPrompt[],
    priority: ConnectionPrompt['priority']
  ): ConnectionPrompt[] {
    return prompts.filter(p => p.priority === priority);
  }

  /**
   * Get active (non-dismissed) prompts
   */
  getActivePrompts(prompts: ConnectionPrompt[]): ConnectionPrompt[] {
    return prompts.filter(p => !p.dismissed);
  }

  /**
   * Dismiss a prompt
   */
  dismissPrompt(prompts: ConnectionPrompt[], promptId: string): ConnectionPrompt[] {
    return prompts.map(p =>
      p.id === promptId ? { ...p, dismissed: true } : p
    );
  }
}

// Export singleton instance
export const connectionPrompts = new ConnectionPrompts();
