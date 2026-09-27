import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Builds a conditional class string and resolves conflicting Tailwind
 * utilities, with later inputs taking precedence.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
