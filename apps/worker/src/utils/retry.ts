/**
 * Retry Utility with Exponential Backoff
 *
 * Rule 60: All external AI calls (Gemini) MUST implement Exponential Backoff retry.
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
};

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  options: Required<RetryOptions>
): number {
  const exponentialDelay =
    options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
  const delay = exponentialDelay + jitter;
  return Math.min(delay, options.maxDelayMs);
}

/**
 * Check if error is retryable (rate limit, server error, network error)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Rate limit errors
    if (
      message.includes("rate limit") ||
      message.includes("429") ||
      message.includes("quota")
    ) {
      return true;
    }
    // Server errors
    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504")
    ) {
      return true;
    }
    // Network errors
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnreset")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Execute a function with exponential backoff retry
 *
 * @param fn - The async function to execute
 * @param options - Retry options
 * @returns The result of the function or throws the last error
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts: Required<RetryOptions> = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if it's the last attempt or error is not retryable
      if (attempt === opts.maxRetries || !isRetryableError(error)) {
        throw lastError;
      }

      const delay = calculateDelay(attempt, opts);
      console.log(
        `Retry attempt ${attempt + 1}/${opts.maxRetries} after ${Math.round(
          delay
        )}ms - Error: ${lastError.message}`
      );
      await sleep(delay);
    }
  }

  throw lastError || new Error("Unexpected retry failure");
}

/**
 * Wrap a Gemini API call with retry logic
 */
export async function withGeminiRetry<T>(fn: () => Promise<T>): Promise<T> {
  return withRetry(fn, {
    maxRetries: 5,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  });
}
