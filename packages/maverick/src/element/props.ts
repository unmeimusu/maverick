import type { SignalOptions } from '@maverick-js/signals';

export const PROP_DEF = Symbol(__DEV__ ? 'PROP_DEF' : 0);

export function defineProp<Value>(definition: DefineProp<Value>): PropDefinition<Value> {
  return { [PROP_DEF]: true, ...definition } as PropDefinition<Value>;
}

export type AttributeValue = string | null;

export interface EmptyRecord extends Record<string, never> {}

export interface AttributeType<Value = unknown> {
  readonly from: ((value: AttributeValue) => Value) | false;
  readonly to?: (value: Value) => AttributeValue;
}

export type PropDeclarations<Props> = Readonly<{
  [Prop in keyof Props]: PropDeclaration<Props[Prop]>;
}>;

export type PropDeclaration<Value = unknown> = Value | PropDefinition<Value>;

export type PropDefinitions<Props> = Readonly<{
  [Prop in keyof Props]: PropDefinition<Props[Prop]>;
}>;

export interface PropDefinition<Value = unknown> extends SignalOptions<Value> {
  /** @internal */
  [PROP_DEF]: true;
  /**
   * The initial value of this property.
   */
  value: Value;
  /**
   * Whether the property is associated with an attribute, or a custom name for the associated
   * attribute. By default this is `true` and the attribute name is inferred by kebab-casing the
   * property name.
   */
  attribute?: string | false;
  /**
   * Convert between an attribute value and property value. If not specified it will be inferred
   * from the initial value.
   */
  type?: AttributeType<Value>;
}

export type DefineProp<Value> = Omit<PropDefinition<Value>, typeof PROP_DEF>;
