import type { JSX } from '../jsx';
import { onDispose } from '../reactivity';
import { isFunction } from '../../utils/unit';
import { insertNodeAtMarker } from './markers';

export function isDOMNode(node: any): node is Node {
  return node instanceof Node;
}

export function isDOMElement(node: any): node is Element {
  return isDOMNode(node) && node.nodeType === 1;
}

export function isDOMFragment(node: any): node is DocumentFragment {
  return isDOMNode(node) && node.nodeType === 11;
}

export function createFragment() {
  return document.createDocumentFragment();
}

export function insert(
  parent: Node | DocumentFragment,
  value: JSX.Element,
  before: Node | null = null,
) {
  const marker = document.createComment('$$');
  if (before === null) parent.appendChild(marker);
  else parent.insertBefore(marker, before);
  insertNodeAtMarker(marker, value);
}

export function listen<Target extends EventTarget, EventType extends string>(
  target: Target,
  type: EventType,
  handler: EventType extends keyof JSX.GlobalOnAttributes
    ? JSX.EventHandler<JSX.TargetedEvent<Target, JSX.GlobalOnAttributes[EventType]>>
    : JSX.EventHandler,
  options?: AddEventListenerOptions | boolean,
) {
  if (__NODE__) return;
  target.addEventListener(type as string, handler as JSX.EventHandler, options);
  onDispose(() => {
    target.removeEventListener(type as string, handler as JSX.EventHandler, options);
  });
}

/**
 * Sets or removes the given attribute `value`. Falsy values except `''` and `0` will remove
 * the attribute.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Glossary/Falsy}
 */
export function setAttribute(element: Element, name: string, value: unknown) {
  if (!value && value !== '' && value !== 0) {
    element.removeAttribute(name);
  } else {
    const attrValue = value + '';
    if (element.getAttribute(name) !== attrValue) {
      element.setAttribute(name, attrValue);
    }
  }
}

/**
 * Sets or removes the given style `value`. Falsy values will remove the style.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Glossary/Falsy}
 */
export function setStyle(element: HTMLElement, property: string, value: unknown) {
  if (!value && value !== 0) {
    element.style.removeProperty(property);
  } else {
    element.style.setProperty(property, value + '');
  }
}

/**
 * Toggles the given class `name`. Falsy values will remove the class from the list.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Glossary/Falsy}
 */
export function toggleClass(element: Element, name: string, value: unknown) {
  element.classList[value ? 'add' : 'remove'](name);
}
