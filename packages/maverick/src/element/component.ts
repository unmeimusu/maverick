import type { JSX, Store, StoreFactory } from '../runtime';
import type { WritableKeys } from '../std/types';
import { ComponentController } from './controller';
import type { CustomElementDefinition } from './define';
import type { ComponentInstance } from './instance';

export interface ComponentAPI {
  props?: {};
  events?: {};
  cssvars?: {};
  store?: {};
}

export interface AnyComponentAPI {
  props?: any;
  events?: any;
  cssvars?: any;
  store?: any;
}

export class Component<
  API extends ComponentAPI = AnyComponentAPI,
> extends ComponentController<API> {
  constructor(instance: ComponentInstance<API>) {
    super(instance);
    if (this.render && !instance._renderer) {
      instance._renderer = this.render.bind(this);
    }
  }

  render?(): JSX.Element;

  destroy(): void {
    this.instance._destroy();
  }
}

export interface AnyComponent extends Component<AnyComponentAPI> {}

export interface ComponentConstructor<
  T extends Component = AnyComponent,
  API extends ComponentAPI = InferComponentAPI<T>,
> {
  el: CustomElementDefinition<API>;
  new (instance: ComponentInstance<API>): Component<API>;
}

export type InferComponentAPI<T> = T extends Component<infer API> ? API : never;

export type InferComponentProps<T> = T extends Component<infer API>
  ? NonNullable<API['props']>
  : T extends ComponentAPI
  ? NonNullable<T['props']>
  : never;

export type InferComponentEvents<T> = T extends Component<infer API>
  ? NonNullable<API['events']>
  : T extends ComponentAPI
  ? NonNullable<T['events']>
  : never;

export type InferComponentCSSProps<T> = T extends Component<infer API>
  ? NonNullable<API['cssvars']>
  : T extends ComponentAPI
  ? NonNullable<T['cssvars']>
  : never;

export type InferComponentStoreFactory<T> = T extends Component<infer API>
  ? NonNullable<API['store']>
  : T extends ComponentAPI
  ? NonNullable<T['store']>
  : never;

export type InferComponentMembers<T> = T extends Component<infer API>
  ? Omit<NonNullable<API['props']>, keyof T> & T
  : never;

export type InferComponentCSSVars<
  Component extends AnyComponent,
  CSSProps = InferComponentCSSProps<Component>,
> = { [Var in WritableKeys<CSSProps> as `--${Var & string}`]: CSSProps[Var] };
