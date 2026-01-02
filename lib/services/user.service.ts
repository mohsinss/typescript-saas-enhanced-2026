import { BaseService } from "./base.service";
import { UserRepository, UserDocument } from "@/lib/repositories/user.repository";
import { BusinessRuleError, ConflictError } from "@/lib/errors";
import { sendWelcomeEmail } from "@/lib/email/mailgun";
import { logger } from "@/lib/infrastructure/logger";
// import bcrypt from "bcryptjs"; // Uncomment when bcryptjs is installed

export class UserService extends BaseService<UserDocument> {
  private userRepo: UserRepository;

  constructor() {
    const repo = new UserRepository();
    super(repo, "User");
    this.userRepo = repo;
  }

  /**
   * Create a new user
   */
  async createUser(data: {
    email: string;
    name?: string;
    image?: string;
    password?: string;
  }): Promise<UserDocument> {
    // Check if user already exists
    const existingUser = await this.userRepo.findByEmail(data.email);
    
    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    // Hash password if provided
    let hashedPassword = data.password; // TODO: Hash when bcryptjs is installed
    // if (data.password) {
    //   hashedPassword = await bcrypt.hash(data.password, 10);
    // }

    // Create user (password field removed as it's not in the User model)
    const user = await this.create({
      ...data,
      email: data.email.toLowerCase(),
      // password: hashedPassword, // User model doesn't have password field
    });

    // Send welcome email (don't await)
    sendWelcomeEmail(user.email, user.name).catch((error) => {
      logger.error("Failed to send welcome email", error, {
        userId: user._id,
      });
    });

    return user;
  }

  /**
   * Get user by email
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userRepo.findByEmail(email);
  }

  /**
   * Update user subscription
   */
  async updateSubscription(
    userId: string,
    priceId: string,
    customerId: string
  ): Promise<UserDocument> {
    const user = await this.userRepo.updateSubscription(userId, {
      priceId,
      customerId,
      hasAccess: true,
    });

    if (!user) {
      throw new BusinessRuleError("Failed to update subscription");
    }

    logger.info("User subscription updated", {
      userId,
      priceId,
      customerId,
    });

    return user;
  }

  /**
   * Cancel user subscription
   */
  async cancelSubscription(userId: string): Promise<UserDocument> {
    const user = await this.userRepo.revokeAccess(userId);

    if (!user) {
      throw new BusinessRuleError("Failed to cancel subscription");
    }

    logger.info("User subscription cancelled", { userId });

    return user;
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    return user.hasAccess && !!user.customerId;
  }

  /**
   * Get all active subscribers
   */
  async getActiveSubscribers(): Promise<UserDocument[]> {
    return this.userRepo.findActiveSubscribers();
  }
}
