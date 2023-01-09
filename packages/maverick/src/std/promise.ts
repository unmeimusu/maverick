export interface DeferredPromise<ResolveType = void, RejectType = void> {
  promise: Promise<ResolveType | undefined>;
  resolve: (value?: ResolveType) => void;
  reject: (reason: RejectType) => void;
}

/**
 * Creates an empty Promise and defers resolving/rejecting it.
 */
export function deferredPromise<ResolveType = void, RejectType = void>(): DeferredPromise<
  ResolveType,
  RejectType
> {
  let resolve!: (value: ResolveType | undefined) => void, reject!: (reason: RejectType) => void;

  const promise: Promise<ResolveType | undefined> = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Wraps a promise so it can timeout.
 */
export function timedPromise<T>(
  promise: Promise<T>,
  timeout: number,
  timeoutMsg: string,
): Promise<T> {
  const timer = new Promise((_, reject) => {
    const timerId = setTimeout(() => {
      clearTimeout(timerId);
      reject(timeoutMsg);
    }, timeout);
  });

  return Promise.race([promise, timer]) as Promise<T>;
}
