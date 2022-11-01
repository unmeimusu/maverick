import { peek } from '@maverick-js/observables';
import { isNull } from '../utils/unit';
import type { ElementLifecycleCallback, ElementLifecycleManager } from './lifecycle';
import type { MaverickHost } from './types';

let _hosts: (MaverickHost | null)[] = [null],
  _current = 0;

export function getHost(): MaverickHost | null {
  return _hosts[_current];
}

export function setHost(host: MaverickHost | null) {
  if (isNull(host)) {
    _hosts.pop();
    _current--;
    return;
  }

  _hosts.push(host);
  _current++;
}

export const CONNECT = Symbol('CONNECT');
export const MOUNT = Symbol('MOUNT');
export const BEFORE_UPDATE = Symbol('BEFORE_UPDATE');
export const AFTER_UPDATE = Symbol('AFTER_UPDATE');
export const DISCONNECT = Symbol('DISCONNECT');
export const DESTROY = Symbol('DESTROY');

export const LIFECYCLES = [
  CONNECT,
  MOUNT,
  BEFORE_UPDATE,
  AFTER_UPDATE,
  DISCONNECT,
  DESTROY,
] as const;

export function createLifecycleMethod(name: keyof ElementLifecycleManager) {
  return (callback: ElementLifecycleCallback) => {
    if (__SERVER__) return;

    const host = getHost();

    if (!host) {
      if (__DEV__) throw Error('[maverick] lifecycle hook called outside of element setup');
      return;
    }

    host[name].push(() => peek(callback));
  };
}
