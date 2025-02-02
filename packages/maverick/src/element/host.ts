import type { Dispose, Maybe } from '@maverick-js/signals';
import type { Constructor } from 'type-fest';

import type { InferStore, InferStoreRecord, StoreFactory } from '../runtime/store';
import {
  type AnyComponent,
  Component,
  type InferComponentEvents,
  type InferComponentMembers,
  type InferComponentStoreFactory,
} from './component';
import { type ComponentLifecycleCallback } from './instance';

export interface HostElement<T extends Component = AnyComponent> {
  /** @internal type only */
  ts__component?: T;
  /**
   * Whether this component should be kept-alive on DOM disconnection. If `true`, all child
   * host elements will also be kept alive and the instance will need to be manually destroyed.
   *
   * Important to note that if a parent element is kept alive, calling destroy will also destroy
   * all child element instances.
   *
   * ```ts
   * // Destroy this element and all children.
   * element.destroy();
   * ```
   */
  keepAlive: boolean;
  /**
   * Maverick component instance associated with this element.
   *
   * @internal
   */
  readonly component: T | null;
  /**
   * The internal component store.
   *
   * @internal
   */
  readonly $store: InferStore<InferComponentStoreFactory<T>> | null;
  /**
   * Associate this element with a Maverick component instance.
   *
   * @internal
   */
  attachComponent(component: T): void;
  /**
   * Invokes the given callback when the custom element instance has been attached to this host
   * element - this is when all instance members will be defined. The callback will be immediately
   * invoked if the instance is already attached.
   */
  onAttach(callback: ComponentLifecycleCallback): Dispose;
  /**
   * The given `handler` is invoked with the type of event (e.g., `my-event`) when this element
   * dispatches it. Each event type is unique and only passed to the given `handler` once.
   *
   * @internal
   */
  onEventDispatch(handler: (eventType: string) => void): void;
  /**
   * Destroys the underlying custom element instance.
   */
  destroy(): void;
}

export interface HTMLCustomElementConstructor<T extends Component = AnyComponent>
  extends Constructor<HTMLCustomElement<T>> {
  readonly observedAttributes: string[];
}

export type HTMLCustomElement<
  T extends Component = AnyComponent,
  Events = InferComponentEvents<T>,
> = HostElement<T> &
  Omit<HTMLElement, 'addEventListener' | 'removeEventListener'> &
  InferComponentMembers<T> & {
    /**
     * This object contains the state of the component store when available.
     *
     * ```ts
     * const el = document.querySelector('foo-el');
     * el.state.foo;
     * ```
     */
    readonly state: Readonly<InferStoreRecord<InferComponentStoreFactory<T>>>;

    /**
     * Enables subscribing to live updates of component store state.
     *
     * @example
     * ```ts
     * const el = document.querySelector('foo-el');
     * el.subscribe(({ foo, bar }) => {
     *   // Re-run when the value of foo or bar changes.
     * });
     * ```
     */
    subscribe: InferComponentStoreFactory<T> extends StoreFactory<infer Record>
      ? (callback: (state: Readonly<Record>) => Maybe<Dispose>) => Dispose
      : never;

    addEventListener<K extends keyof Events>(
      type: K,
      listener: (this: HTMLElement, ev: Events[K]) => any,
      options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener<K extends keyof MaverickOnAttributes>(
      type: K,
      listener: (this: HTMLElement, ev: MaverickOnAttributes[K]) => any,
      options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener<K extends keyof Events>(
      type: K,
      listener: (this: HTMLElement, ev: Events[K]) => any,
      options?: boolean | EventListenerOptions,
    ): void;
    removeEventListener<K extends keyof MaverickOnAttributes>(
      type: K,
      listener: (this: HTMLElement, ev: MaverickOnAttributes[K]) => any,
      options?: boolean | EventListenerOptions,
    ): void;
    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions,
    ): void;
  };

export type InferElementComponent<T> = T extends HTMLCustomElement<infer Component>
  ? Component
  : never;
