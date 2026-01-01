# Class and Method CODE_REF Examples

This document demonstrates valid class and method CODE_REF patterns.

## Class Reference

The complete `User` class:

<!-- CODE_REF: src/basic/classes.ts:5-72 -->

```typescript
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
```

## Method Reference

The `getName` method from the User class:

<!-- CODE_REF: src/basic/classes.ts#User#getName -->

```typescript
/**
 * Gets the user's name
 * @returns The user's name
 */
getName(): string {
  return this.name;
}
```

## Another Method

The `updateEmail` method:

<!-- CODE_REF: src/basic/classes.ts#User#updateEmail -->

```typescript
/**
 * Updates the user's email
 * @param newEmail - The new email address
 */
updateEmail(newEmail: string): void {
  this.email = newEmail;
}
```

## Static Method

The static `createGuest` method:

<!-- CODE_REF: src/basic/classes.ts#User#createGuest -->

```typescript
/**
 * Creates a default guest user
 * @returns A new User instance for guests
 */
static createGuest(): User {
  return new User('Guest', 'guest@example.com', 0);
}
```

## Product Class

A simpler class with public properties:

<!-- CODE_REF: src/basic/classes.ts:74-92 -->

```typescript
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
```

## Generic Class

The generic `Stack` class:

<!-- CODE_REF: src/advanced/generics.ts:24-61 -->

```typescript
/**
 * Generic class representing a stack data structure
 */
export class Stack<T> {
  private items: T[] = [];

  /**
   * Pushes an item onto the stack
   * @param item - The item to push
   */
  push(item: T): void {
    this.items.push(item);
  }

  /**
   * Pops an item from the stack
   * @returns The popped item or undefined
   */
  pop(): T | undefined {
    return this.items.pop();
  }

  /**
   * Peeks at the top item without removing it
   * @returns The top item or undefined
   */
  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  /**
   * Gets the size of the stack
   * @returns The number of items
   */
  size(): number {
    return this.items.length;
  }
}
```
