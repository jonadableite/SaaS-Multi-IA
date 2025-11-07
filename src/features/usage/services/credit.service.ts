import { prisma } from "@/services/prisma";
import { AppError, AppErrorCode } from "@/utils/app-error";

/**
 * @class CreditService
 * @description Service for managing user credits
 */
export class CreditService {
  /**
   * @method checkCredits
   * @description Check if user has sufficient credits
   */
  async checkCredits(userId: string, required: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw AppError.createNotFoundError("User");
    }

    return user.credits >= required;
  }

  /**
   * @method deductCredits
   * @description Deduct credits from user account (transactional)
   */
  async deductCredits(
    userId: string,
    amount: number,
    referenceId: string, // Usage ID or request ID for reference
  ): Promise<number> {
    return prisma.$transaction(async (tx) => {
      // Lock user row for update
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user) {
        throw AppError.createNotFoundError("User");
      }

      if (user.credits < amount) {
        throw AppError.createInsufficientCreditsError(amount, user.credits);
      }

      // Update credits
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          credits: {
            decrement: amount,
          },
        },
        select: { credits: true },
      });

      return updated.credits;
    });
  }

  /**
   * @method addCredits
   * @description Add credits to user account
   */
  async addCredits(userId: string, amount: number): Promise<number> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: amount,
        },
      },
      select: { credits: true },
    });

    return user.credits;
  }

  /**
   * @method getCredits
   * @description Get current credit balance
   */
  async getCredits(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw AppError.createNotFoundError("User");
    }

    return user.credits;
  }

  /**
   * @method ensureInitialCredits
   * @description Ensure user has initial credits based on their plan
   * This is called automatically when credits are checked and user has 0 credits
   */
  async ensureInitialCredits(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, userPlan: true },
    });

    if (!user) {
      throw AppError.createNotFoundError("User");
    }

    // If user already has credits, return current balance
    if (user.credits > 0) {
      return user.credits;
    }

    // Define initial credits based on plan
    const initialCredits: Record<string, number> = {
      FREE: 1000, // 1000 credits for free plan (enough for ~10 chat messages)
      PRO: 5000, // 5000 credits for pro plan
      BUSINESS: 20000, // 20000 credits for business plan
      ENTERPRISE: 100000, // 100000 credits for enterprise plan
    };

    const creditsToAdd = initialCredits[user.userPlan] || initialCredits.FREE;

    // Add initial credits
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: creditsToAdd,
        },
      },
      select: { credits: true },
    });

    return updated.credits;
  }
}
