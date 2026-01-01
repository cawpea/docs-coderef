/**
 * Class examples for CODE_REF demonstration
 */

/**
 * Represents a user in the system
 */
export class User {
  private name: string;
  private email: string;
  private age: number;

  /**
   * Creates a new User instance
   * @param name - User's full name
   * @param email - User's email address
   * @param age - User's age
   */
  constructor(name: string, email: string, age: number) {
    this.name = name;
    this.email = email;
    this.age = age;
  }

  /**
   * Gets the user's name
   * @returns The user's name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Gets the user's email
   * @returns The user's email address
   */
  getEmail(): string {
    return this.email;
  }

  /**
   * Gets the user's age
   * @returns The user's age
   */
  getAge(): number {
    return this.age;
  }

  /**
   * Updates the user's email
   * @param newEmail - The new email address
   */
  updateEmail(newEmail: string): void {
    this.email = newEmail;
  }

  /**
   * Checks if user is an adult
   * @returns True if user is 18 or older
   */
  private isAdult(): boolean {
    return this.age >= 18;
  }

  /**
   * Creates a default guest user
   * @returns A new User instance for guests
   */
  static createGuest(): User {
    return new User('Guest', 'guest@example.com', 0);
  }
}

/**
 * Represents a product in an e-commerce system
 */
export class Product {
  constructor(
    public id: string,
    public name: string,
    public price: number
  ) {}

  /**
   * Applies a discount to the product
   * @param percentage - Discount percentage (0-100)
   * @returns The discounted price
   */
  applyDiscount(percentage: number): number {
    return this.price * (1 - percentage / 100);
  }
}
