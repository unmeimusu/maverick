import { getContext, getScope, type Scope, setContext } from '@maverick-js/signals';

import { isUndefined } from '../std/unit';

export interface Context<T> {
  id: symbol;
  provide?: () => T;
}

export function createContext<T>(provide?: () => T): Context<T> {
  return { id: Symbol(), provide };
}

export function provideContext<T>(context: Context<T>, value?: T, scope: Scope = getScope()!) {
  if (__DEV__ && !scope) {
    throw Error('[maverick] attempting to provide context outside `root` or `setup` function');
  }

  const hasProvidedValue = !isUndefined(value);

  if (__DEV__ && !hasProvidedValue && !context.provide) {
    throw Error('[maverick] context can not be provided without a value or `provide` function');
  }

  setContext(context.id, hasProvidedValue ? value : context.provide?.(), scope);
}

export function useContext<T>(context: Context<T>): T {
  const value = getContext(context.id) as T | undefined;

  if (__DEV__ && isUndefined(value)) {
    throw Error('[maverick] attempting to use context without providing first');
  }

  return value!;
}

export function hasProvidedContext(context: Context<any>): boolean {
  return !isUndefined(getContext(context.id));
}
