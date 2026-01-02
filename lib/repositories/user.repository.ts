import User from "@/models/User";
import { BaseRepository } from "./base.repository";

export interface UserDocument {
  _id: string;
  name?: string;
  email: string;
  image?: string;
  customerId?: string;
  priceId?: string;
  hasAccess: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UserRepository extends BaseRepository<any> {
  constructor() {
    super(User);
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.findOne({ email: email.toLowerCase() });
  }

  /**
   * Find a user by Stripe customer ID
   */
  async findByCustomerId(customerId: string): Promise<UserDocument | null> {
    return this.findOne({ customerId });
  }

  /**
   * Update user subscription
   */
  async updateSubscription(
    userId: string,
    subscription: {
      priceId: string;
      customerId: string;
      hasAccess: boolean;
    }
  ): Promise<UserDocument | null> {
    return this.update(userId, subscription);
  }

  /**
   * Revoke user access
   */
  async revokeAccess(userId: string): Promise<UserDocument | null> {
    return this.update(userId, { hasAccess: false });
  }

  /**
   * Grant user access
   */
  async grantAccess(userId: string): Promise<UserDocument | null> {
    return this.update(userId, { hasAccess: true });
  }

  /**
   * Get users with active subscriptions
   */
  async findActiveSubscribers(): Promise<UserDocument[]> {
    return this.find({ hasAccess: true, customerId: { $exists: true } });
  }

  /**
   * Get users by price/plan ID
   */
  async findByPriceId(priceId: string): Promise<UserDocument[]> {
    return this.find({ priceId });
  }
}
