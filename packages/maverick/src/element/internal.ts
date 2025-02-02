import type { ComponentInstance } from './instance';

let _instances: (ComponentInstance | null)[] = [null];

/** @internal */
export function getComponentInstance(): ComponentInstance | null {
  return _instances[_instances.length - 1];
}

export function setComponentInstance(host: ComponentInstance | null) {
  if (!host) {
    _instances.pop();
    return;
  }

  _instances.push(host);
}

export const CONNECT = /* #__PURE__ */ Symbol(__DEV__ ? 'CONNECT' : 0);
export const PROPS = /* #__PURE__ */ Symbol(__DEV__ ? 'PROPS' : 0);
export const METHODS = /* #__PURE__ */ Symbol(__DEV__ ? 'METHODS' : 0);
