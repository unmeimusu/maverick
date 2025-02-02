/// <reference lib="dom" />
import type { ConditionalPick, KebabCase } from 'type-fest';

import type { ReadSignal } from './reactivity';

type DOMNode = Node;
type DOMElement = Element;
type DOMEvent = Event;

declare global {
  /**
   * Store all global css variables in this interface so `$cssvar` types can be inferred.
   *
   * @example
   * ```ts
   * declare global {
   *   interface MaverickCSSVarAttributes {
   *     foo: string;
   *   }
   * }
   * ```
   */
  interface MaverickCSSVarAttributes extends JSX.CSSRecord {}

  /**
   * Store all global events in this interface so `$on` types can be inferred.
   *
   * @example
   * ```ts
   * declare global {
   *   interface MaverickOnAttributes {
   *     foo: DOMEvent<number>;
   *   }
   * }
   * ```
   */
  interface MaverickOnAttributes extends HTMLElementEventMap {
    attached: Event;
  }

  /**
   * Store all global directives in this interface so `$use` types can be inferred.
   *
   * @example
   * ```ts
   * declare global {
   *   interface MaverickUseAttributes {
   *     foo: Directive<HTMLElement, [arg1, arg2, ...]>;
   *   }
   * }
   * ```
   */
  interface MaverickUseAttributes extends JSX.DirectiveRecord {}
}

export namespace JSX {
  /**
   * -------------------------------------------------------------------------------------------
   * Primitives
   * -------------------------------------------------------------------------------------------
   */

  export type Observable<T> = T | ReadSignal<T>;
  export type Stringify<P> = P extends string ? P : never;
  export type AttrValue = string | number | boolean | null | undefined;

  export type ObservableRecord<T> = {
    [P in keyof T]: Observable<T[P] | null>;
  };

  export interface AttrsRecord {
    [attrName: string]: AttrValue;
  }

  export type LowercaseRecord<T> = {
    [P in keyof T as Lowercase<Stringify<P>>]?: T[P] | null;
  };

  export type KebabCaseRecord<T> = {
    [P in keyof T as KebabCase<P>]: T[P] | null;
  };

  export interface IntrinsicAttributes {
    key?: any;
  }

  export type Node =
    | DOMNode
    | DOMElement
    | DocumentFragment
    | string
    | number
    | boolean
    | null
    | undefined
    | Nodes
    | NodeFactory;

  export type Nodes = Node[];

  export interface NodeFactory {
    (): Node;
  }

  export type Element = Node | ReadSignal<Node>;

  export interface ElementAttributesProperty {}

  export interface ElementChildrenAttribute {
    $children?: Element;
  }

  /**
   * -------------------------------------------------------------------------------------------
   * Props ($prop)
   * -------------------------------------------------------------------------------------------
   */

  export type PropRecord = Record<string, any>;

  /**
   * Creates `$prop:{name}` type definitions given a prop record.
   *
   * @example
   * ```ts
   * // { foo: string | ReadSignal<string>; '$prop:foo': string | ReadSignal<string>, ... }
   * type Props = PropAttributes<{
   *   foo: string; // foo or $prop:foo
   *   bar: number; // bar or $prop:bar
   *   fooHe: number; // foo-he or $prop:fooHe
   *   bazHe: string[]; // $prop:bazHe (complex value)
   * }>
   * ```
   */
  export type PropAttributes<Props> = {
    [Prop in keyof Props as `$prop:${Stringify<Prop>}`]?: Props[Prop];
  } & KebabCaseRecord<ConditionalPick<Props, AttrValue>>;

  export interface InnerContentAttributes {
    '$prop:innerHTML'?: AttrValue;
    '$prop:innerText'?: AttrValue;
    '$prop:textContent'?: AttrValue;
  }

  /**
   * -------------------------------------------------------------------------------------------
   * Ref ($ref)
   * -------------------------------------------------------------------------------------------
   */

  export type Ref<Element extends DOMElement = DOMElement> = (ref: Element) => void;

  export type RefArray<Element extends DOMElement = DOMElement> = ReadonlyArray<Ref<Element>>;

  export type RefAttributes<Element extends DOMElement> = {
    $ref?: Ref<Element> | RefArray<Element>;
  };

  /**
   * -------------------------------------------------------------------------------------------
   * Events ($on)
   * -------------------------------------------------------------------------------------------
   */

  export type EventRecord = Record<string, Event>;

  export type TargetedEvent<Target extends EventTarget = EventTarget, EventType = Event> = Omit<
    EventType,
    'currentTarget'
  > & {
    readonly currentTarget: Target;
  };

  export type EventHandler<Event = DOMEvent> = {
    (this: never, event: Event): void;
  };

  export type TargetedEventHandler<Target extends EventTarget, Event> = JSX.EventHandler<
    JSX.TargetedEvent<Target, Event>
  >;

  /**
   * All global events with the event `currentTarget` set to the given generic `Target`.
   */
  export type TargetedGlobalEvents<Target extends EventTarget> = {
    [EventType in keyof MaverickOnAttributes]: TargetedEventHandler<
      Target,
      MaverickOnAttributes[EventType]
    >;
  };

  /**
   * Creates `$on:{type}` and `$oncapture:{type}` type definitions given an event record.
   *
   * @example
   * ```ts
   * // { '$on:foo': (event: CustomEvent<string>) => void; '$oncapture:foo', ... }
   * type Events = OnAttributes<{
   *   'foo': CustomEvent<string>;
   *   'baz-he': CustomEvent<number>;
   * }>
   * ```
   */
  export type OnAttributes<Target extends EventTarget = EventTarget, Events = EventRecord> = {
    [EventType in keyof Events as `$on:${Stringify<EventType>}`]?:
      | TargetedEventHandler<Target, Events[EventType]>
      | [(data: any, event: Events[EventType]) => void, any];
  } & OnCaptureAttributes<Target, Events>;

  export type OnCaptureAttributes<
    Target extends EventTarget = EventTarget,
    Events = EventRecord,
  > = {
    [EventType in keyof Events as `$oncapture:${Stringify<EventType>}`]?: TargetedEventHandler<
      Target,
      Events[EventType]
    >;
  };

  /**
   * -------------------------------------------------------------------------------------------
   * Directives ($use)
   * -------------------------------------------------------------------------------------------
   */

  export type Directive<Element extends DOMElement = DOMElement, Args extends any[] = any[]> = (
    element: Element,
    ...args: Args
  ) => void;

  export type DirectiveRecord = Record<string, Directive>;

  /**
   * Creates `$use:{name}` type definitions given a directive record.
   *
   * @example
   * ```ts
   * // { '$use:foo': [bar: string, baz: number] }
   * type Directives = <{
   *   foo: (el: HTMLElement, bar: string, baz: number) => void;
   * }>
   * ```
   */
  export type UseAttributes<Directives extends DirectiveRecord> = {
    [Name in keyof Directives as `$use:${Stringify<Name>}`]: Directives[Name] extends (
      element: any,
      ...args: infer R
    ) => void
      ? R
      : never;
  } & {
    [id: `$use:${string}`]: any;
  };

  /**
   * -------------------------------------------------------------------------------------------
   * Class ($class)
   * -------------------------------------------------------------------------------------------
   */

  export type ClassValue = any;

  export type ClassAttributes = Record<`$class:${string}`, ClassValue>;

  /**
   * -------------------------------------------------------------------------------------------
   * CSS ($style and $cssvar)
   * -------------------------------------------------------------------------------------------
   */

  export type CSSValue = string | number | false | null | undefined;

  export type CSSRecord = Record<string, CSSValue>;

  export type AnyCSSVarAttribute = {
    [id: `$cssvar:${string}`]: CSSValue;
  };

  export type StyleAttributes = {
    [Prop in keyof CSSProperties as `$style:${KebabCase<Stringify<Prop>>}`]: CSSProperties[Prop];
  };

  export type AnyCSSProperty = {
    [key: string]: CSSValue;
  };

  export type CSSProperties = AnyCSSProperty &
    HTMLCSSProperties & {
      cssText?: string | null;
    };

  export interface CSSStyles extends JSX.KebabCaseRecord<JSX.CSSProperties> {}

  /**
   * Creates `$cssvar:{name}` type definitions given CSS variable record.
   *
   * @example
   * ```ts
   * // { '$cssvar:foo': string | ReadSignal<string>, '$cssvar:baz-he': ... }
   * type Vars = CSSVarAttributes<{
   *   foo: string; // foo
   *   bazHe: number; // baz-he
   * }>
   * ```
   */
  export type CSSVarAttributes<Variables> = {
    [Var in keyof Variables as `$cssvar:${Stringify<Var>}`]: Variables[Var] | null | undefined;
  } & AnyCSSVarAttribute;

  /**
   * -------------------------------------------------------------------------------------------
   * HTML
   * -------------------------------------------------------------------------------------------
   */

  export type HTMLPropAttributes<Props extends PropRecord> = {
    [Prop in keyof Props as `$prop:${Stringify<Prop>}`]?: Props[Prop] | null;
  } & HTMLAttrsRecord<Props>;

  export type HTMLAttrsRecord<Props> = LowercaseRecord<ConditionalPick<Props, AttrValue>>;

  export interface HTMLAttrs extends HTMLAttrsRecord<HTMLProperties> {}

  export interface HTMLAttributes extends HTMLPropAttributes<HTMLProperties> {
    $children?: Element;
  }

  export type HTMLCSSProperties = {
    [P in keyof Omit<
      CSSStyleDeclaration,
      'item' | 'setProperty' | 'removeProperty' | 'getPropertyValue' | 'getPropertyPriority'
    >]?: CSSValue;
  };

  export type HTMLDataAttributes = {
    [id: `data-${string}`]: AttrValue;
  };

  // Separate interface so TS can cache it.
  export interface BaseHTMLElementAttributes
    extends HTMLAttributes,
      ClassAttributes,
      StyleAttributes,
      ARIAAttributes,
      HTMLDataAttributes,
      InnerContentAttributes,
      CSSVarAttributes<MaverickCSSVarAttributes>,
      UseAttributes<MaverickUseAttributes> {}

  export type HTMLElementAttributes<
    Element extends DOMElement = DOMElement,
    Props = {},
    Events = {},
    CSSVars = {},
  > = BaseHTMLElementAttributes &
    RefAttributes<Element> &
    PropAttributes<Props> &
    OnAttributes<Element, Events> &
    CSSVarAttributes<CSSVars> &
    OnAttributes<Element, MaverickOnAttributes>;

  export interface HTMLMarqueeElement extends HTMLElement, HTMLMarqueeElementProperties {}

  export interface HTMLMarqueeElementProperties {
    behavior?: 'scroll' | 'slide' | 'alternate';
    bgColor?: string;
    direction?: 'left' | 'right' | 'up' | 'down';
    height?: number | string;
    hspace?: number | string;
    loop?: number | string;
    scrollAmount?: number | string;
    scrollDelay?: number | string;
    trueSpeed?: boolean;
    vspace?: number | string;
    width?: number | string;
  }

  export interface HTMLMarqueeElementAttributes
    extends HTMLPropAttributes<HTMLMarqueeElementProperties> {}

  export interface HTMLProperties {
    // Standard HTML Attributes
    accept?: string;
    acceptCharset?: string;
    accessKey?: string;
    action?: string;
    allow?: string;
    allowFullScreen?: boolean;
    allowTransparency?: boolean;
    alt?: string;
    as?: string;
    async?: boolean;
    autocomplete?: string;
    autoComplete?: string;
    autocorrect?: string;
    autoCorrect?: string;
    autofocus?: boolean;
    autoFocus?: boolean;
    autoPlay?: boolean;
    capture?: boolean | string;
    cellPadding?: number | string;
    cellSpacing?: number | string;
    charSet?: string;
    challenge?: string;
    checked?: boolean;
    cite?: string;
    class?: string;
    className?: string;
    cols?: number;
    colSpan?: number;
    content?: string;
    contentEditable?: boolean;
    contextMenu?: string;
    controls?: boolean;
    controlsList?: string;
    coords?: string;
    crossOrigin?: string;
    data?: string;
    dateTime?: string;
    default?: boolean;
    defaultChecked?: boolean;
    defaultValue?: string;
    defer?: boolean;
    dir?: 'auto' | 'rtl' | 'ltr';
    disabled?: boolean;
    disableRemotePlayback?: boolean;
    download?: any;
    decoding?: 'sync' | 'async' | 'auto';
    draggable?: boolean;
    encType?: string;
    enterkeyhint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
    form?: string;
    formAction?: string;
    formEncType?: string;
    formMethod?: string;
    formNoValidate?: boolean;
    formTarget?: string;
    frameBorder?: number | string;
    headers?: string;
    height?: number | string;
    hidden?: boolean;
    high?: number;
    href?: string;
    hrefLang?: string;
    for?: string;
    htmlFor?: string;
    httpEquiv?: string;
    icon?: string;
    id?: string;
    inputMode?: string;
    integrity?: string;
    is?: string;
    keyParams?: string;
    keyType?: string;
    kind?: string;
    label?: string;
    lang?: string;
    list?: string;
    loading?: 'eager' | 'lazy';
    loop?: boolean;
    low?: number;
    manifest?: string;
    marginHeight?: number;
    marginWidth?: number;
    max?: number | string;
    maxLength?: number;
    media?: string;
    mediaGroup?: string;
    method?: string;
    min?: number | string;
    minLength?: number;
    multiple?: boolean;
    muted?: boolean;
    name?: string;
    nomodule?: boolean;
    nonce?: string;
    noValidate?: boolean;
    open?: boolean;
    optimum?: number;
    part?: string;
    pattern?: string;
    ping?: string;
    placeholder?: string;
    playsInline?: boolean;
    poster?: string;
    preload?: string;
    radioGroup?: string;
    readonly?: boolean;
    readOnly?: boolean;
    referrerpolicy?:
      | 'no-referrer'
      | 'no-referrer-when-downgrade'
      | 'origin'
      | 'origin-when-cross-origin'
      | 'same-origin'
      | 'strict-origin'
      | 'strict-origin-when-cross-origin'
      | 'unsafe-url';
    rel?: string;
    required?: boolean;
    reversed?: boolean;
    role?: string;
    rows?: number;
    rowSpan?: number;
    sandbox?: string;
    scope?: string;
    scoped?: boolean;
    scrolling?: string;
    seamless?: boolean;
    selected?: boolean;
    shape?: string;
    size?: number;
    sizes?: string;
    slot?: string;
    span?: number;
    spellcheck?: boolean;
    spellCheck?: boolean;
    src?: string;
    srcset?: string;
    srcDoc?: string;
    srcLang?: string;
    srcSet?: string;
    start?: number;
    step?: number | string;
    style?: string;
    summary?: string;
    tabIndex?: number;
    target?: string;
    title?: string;
    type?: string;
    useMap?: string;
    value?: string | string[] | number;
    volume?: string | number;
    width?: number | string;
    wmode?: string;
    wrap?: string;

    // Non-standard Attributes
    autocapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';
    autoCapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';
    disablePictureInPicture?: boolean;
    results?: number;
    translate?: 'yes' | 'no';

    // RDFa Attributes
    about?: string;
    datatype?: string;
    inlist?: any;
    prefix?: string;
    property?: string;
    resource?: string;
    typeof?: string;
    vocab?: string;

    // Microdata Attributes
    itemProp?: string;
    itemScope?: boolean;
    itemType?: string;
    itemID?: string;
    itemRef?: string;
  }

  /**
   * -------------------------------------------------------------------------------------------
   * SVG
   * -------------------------------------------------------------------------------------------
   */

  export interface SVGAttributes
    extends KebabCaseRecord<Pick<SVGProperties, KebabCaseSVGProperties>>,
      Pick<SVGProperties, CamelCaseSVGProperties>,
      Omit<SVGProperties, KebabCaseSVGProperties | CamelCaseSVGProperties> {}

  export type SVGElementAttributes<Element extends DOMElement = SVGElement> =
    HTMLElementAttributes<Element> & SVGAttributes;

  export interface PathAttributes {
    d: string;
  }

  export type KebabCaseSVGProperties =
    | 'accentHeight'
    | 'alignmentBaseline'
    | 'arabicForm'
    | 'baselineShift'
    | 'capHeight'
    | 'clipPath'
    | 'clipRule'
    | 'colorInterpolation'
    | 'colorInterpolationFilters'
    | 'colorProfile'
    | 'dominantBaseline'
    | 'enableBackground'
    | 'fillOpacity'
    | 'fillRule'
    | 'floodColor'
    | 'floodOpacity'
    | 'fontFamily'
    | 'fontSize'
    | 'fontSizeAdjust'
    | 'fontStretch'
    | 'fontStyle'
    | 'fontVariant'
    | 'fontWeight'
    | 'glyphName'
    | 'glyphOrientationHorizontal'
    | 'glyphOrientationVertical'
    | 'horizAdvX'
    | 'horizOriginX'
    | 'imageRendering'
    | 'letterSpacing'
    | 'lightingColor'
    | 'markerEnd'
    | 'markerMid'
    | 'markerStart'
    | 'overlinePosition'
    | 'overlineThickness'
    | 'panose1'
    | 'paintOrder'
    | 'pointerEvents'
    | 'shapeRendering'
    | 'stopColor'
    | 'stopOpacity'
    | 'strikethroughPosition'
    | 'strikethroughThickness'
    | 'strokeDasharray'
    | 'strokeDashoffset'
    | 'strokeLinecap'
    | 'strokeLinejoin'
    | 'strokeMiterlimit'
    | 'strokeOpacity'
    | 'strokeWidth'
    | 'textAnchor'
    | 'textDecoration'
    | 'textRendering'
    | 'transformOrigin'
    | 'underlinePosition'
    | 'underlineThickness'
    | 'unicodeBidi'
    | 'unicodeRange'
    | 'unitsPerEm'
    | 'vAlphabetic'
    | 'vHanging'
    | 'vIdeographic'
    | 'vMathematical'
    | 'vectorEffect'
    | 'vertAdvY'
    | 'vertOriginX'
    | 'vertOriginY'
    | 'wordSpacing'
    | 'writingMode'
    | 'xHeight';

  export type CamelCaseSVGProperties =
    | 'attributeName'
    | 'attributeType'
    | 'baseFrequency'
    | 'baseProfile'
    | 'calcMode'
    | 'clipPathUnits'
    | 'contentScriptType'
    | 'contentStyleType'
    | 'diffuseConstant'
    | 'edgeMode'
    | 'filterRes'
    | 'filterUnits'
    | 'glyphRef'
    | 'gradientTransform'
    | 'gradientUnits'
    | 'kernelMatrix'
    | 'kernelUnitLength'
    | 'keyPoints'
    | 'keySplines'
    | 'keyTimes'
    | 'lengthAdjust'
    | 'limitingConeAngle'
    | 'markerHeight'
    | 'markerUnits'
    | 'markerWidth'
    | 'maskContentUnits'
    | 'maskUnits'
    | 'numOctaves'
    | 'pathLength'
    | 'patternContentUnits'
    | 'patternTransform'
    | 'patternUnits'
    | 'pointsAtX'
    | 'pointsAtY'
    | 'pointsAtZ'
    | 'preserveAlpha'
    | 'preserveAspectRatio'
    | 'primitiveUnits'
    | 'repeatCount'
    | 'repeatDur'
    | 'requiredFeatures'
    | 'specularConstant'
    | 'specularExponent'
    | 'spreadMethod'
    | 'startOffset'
    | 'stdDeviation'
    | 'stitchTiles'
    | 'surfaceScale'
    | 'systemLanguage'
    | 'tableValues'
    | 'textLength'
    | 'viewBox'
    | 'viewTarget'
    | 'xChannelSelector'
    | 'yChannelSelector'
    | 'zoomAndPan';

  export interface SVGProperties {
    accentHeight?: number | string;
    accumulate?: 'none' | 'sum';
    additive?: 'replace' | 'sum';
    alignmentBaseline?:
      | 'auto'
      | 'baseline'
      | 'before-edge'
      | 'text-before-edge'
      | 'middle'
      | 'central'
      | 'after-edge'
      | 'text-after-edge'
      | 'ideographic'
      | 'alphabetic'
      | 'hanging'
      | 'mathematical'
      | 'inherit';
    allowReorder?: 'no' | 'yes';
    alphabetic?: number | string;
    amplitude?: number | string;
    arabicForm?: 'initial' | 'medial' | 'terminal' | 'isolated';
    ascent?: number | string;
    attributeName?: string;
    attributeType?: string;
    autoReverse?: number | string;
    azimuth?: number | string;
    baseFrequency?: number | string;
    baselineShift?: number | string;
    baseProfile?: number | string;
    bbox?: number | string;
    begin?: number | string;
    bias?: number | string;
    by?: number | string;
    calcMode?: number | string;
    capHeight?: number | string;
    clip?: number | string;
    clipPath?: string;
    clipPathUnits?: number | string;
    clipRule?: number | string;
    colorInterpolation?: number | string;
    colorInterpolationFilters?: 'auto' | 'sRGB' | 'linearRGB' | 'inherit';
    colorProfile?: number | string;
    colorRendering?: number | string;
    contentScriptType?: number | string;
    contentStyleType?: number | string;
    cursor?: number | string;
    cx?: number | string;
    cy?: number | string;
    d?: string;
    decelerate?: number | string;
    descent?: number | string;
    diffuseConstant?: number | string;
    direction?: number | string;
    display?: number | string;
    divisor?: number | string;
    dominantBaseline?: number | string;
    dur?: number | string;
    dx?: number | string;
    dy?: number | string;
    edgeMode?: number | string;
    elevation?: number | string;
    enableBackground?: number | string;
    end?: number | string;
    exponent?: number | string;
    externalResourcesRequired?: number | string;
    fill?: string;
    fillOpacity?: number | string;
    fillRule?: 'nonzero' | 'evenodd' | 'inherit';
    filter?: string;
    filterRes?: number | string;
    filterUnits?: number | string;
    floodColor?: number | string;
    floodOpacity?: number | string;
    focusable?: number | string;
    fontFamily?: string;
    fontSize?: number | string;
    fontSizeAdjust?: number | string;
    fontStretch?: number | string;
    fontStyle?: number | string;
    fontVariant?: number | string;
    fontWeight?: number | string;
    format?: number | string;
    from?: number | string;
    fx?: number | string;
    fy?: number | string;
    g1?: number | string;
    g2?: number | string;
    glyphName?: number | string;
    glyphOrientationHorizontal?: number | string;
    glyphOrientationVertical?: number | string;
    glyphRef?: number | string;
    gradientTransform?: string;
    gradientUnits?: string;
    hanging?: number | string;
    horizAdvX?: number | string;
    horizOriginX?: number | string;
    ideographic?: number | string;
    imageRendering?: number | string;
    in2?: number | string;
    in?: string;
    intercept?: number | string;
    k1?: number | string;
    k2?: number | string;
    k3?: number | string;
    k4?: number | string;
    k?: number | string;
    kernelMatrix?: number | string;
    kernelUnitLength?: number | string;
    kerning?: number | string;
    keyPoints?: number | string;
    keySplines?: number | string;
    keyTimes?: number | string;
    lengthAdjust?: number | string;
    letterSpacing?: number | string;
    lightingColor?: number | string;
    limitingConeAngle?: number | string;
    local?: number | string;
    markerEnd?: string;
    markerHeight?: number | string;
    markerMid?: string;
    markerStart?: string;
    markerUnits?: number | string;
    markerWidth?: number | string;
    mask?: string;
    maskContentUnits?: number | string;
    maskUnits?: number | string;
    mathematical?: number | string;
    mode?: number | string;
    numOctaves?: number | string;
    offset?: number | string;
    opacity?: number | string;
    operator?: number | string;
    order?: number | string;
    orient?: number | string;
    orientation?: number | string;
    origin?: number | string;
    overflow?: number | string;
    overlinePosition?: number | string;
    overlineThickness?: number | string;
    paintOrder?: number | string;
    panose1?: number | string;
    pathLength?: number | string;
    patternContentUnits?: string;
    patternTransform?: number | string;
    patternUnits?: string;
    pointerEvents?: number | string;
    points?: string;
    pointsAtX?: number | string;
    pointsAtY?: number | string;
    pointsAtZ?: number | string;
    preserveAlpha?: number | string;
    preserveAspectRatio?: string;
    primitiveUnits?: number | string;
    r?: number | string;
    radius?: number | string;
    refX?: number | string;
    refY?: number | string;
    renderingIntent?: number | string;
    repeatCount?: number | string;
    repeatDur?: number | string;
    requiredExtensions?: number | string;
    requiredFeatures?: number | string;
    restart?: number | string;
    result?: string;
    rotate?: number | string;
    rx?: number | string;
    ry?: number | string;
    scale?: number | string;
    seed?: number | string;
    shapeRendering?: number | string;
    slope?: number | string;
    spacing?: number | string;
    specularConstant?: number | string;
    specularExponent?: number | string;
    speed?: number | string;
    spreadMethod?: string;
    startOffset?: number | string;
    stdDeviation?: number | string;
    stemh?: number | string;
    stemv?: number | string;
    stitchTiles?: number | string;
    stopColor?: string;
    stopOpacity?: number | string;
    strikethroughPosition?: number | string;
    strikethroughThickness?: number | string;
    string?: number | string;
    stroke?: string;
    strokeDasharray?: string | number;
    strokeDashoffset?: string | number;
    strokeLinecap?: 'butt' | 'round' | 'square' | 'inherit';
    strokeLinejoin?: 'miter' | 'round' | 'bevel' | 'inherit';
    strokeMiterlimit?: string | number;
    strokeOpacity?: number | string;
    strokeWidth?: number | string;
    surfaceScale?: number | string;
    systemLanguage?: number | string;
    tableValues?: number | string;
    targetX?: number | string;
    targetY?: number | string;
    textAnchor?: string;
    textDecoration?: number | string;
    textLength?: number | string;
    textRendering?: number | string;
    to?: number | string;
    transform?: string;
    transformOrigin?: string;
    u1?: number | string;
    u2?: number | string;
    underlinePosition?: number | string;
    underlineThickness?: number | string;
    unicode?: number | string;
    unicodeBidi?: number | string;
    unicodeRange?: number | string;
    unitsPerEm?: number | string;
    vAlphabetic?: number | string;
    values?: string;
    vectorEffect?: number | string;
    version?: string;
    vertAdvY?: number | string;
    vertOriginX?: number | string;
    vertOriginY?: number | string;
    vHanging?: number | string;
    vIdeographic?: number | string;
    viewBox?: string;
    viewTarget?: number | string;
    visibility?: number | string;
    vMathematical?: number | string;
    widths?: number | string;
    wordSpacing?: number | string;
    writingMode?: number | string;
    x1?: number | string;
    x2?: number | string;
    x?: number | string;
    xChannelSelector?: string;
    xHeight?: number | string;
    xlinkActuate?: string;
    xlinkArcrole?: string;
    xlinkHref?: string;
    xlinkRole?: string;
    xlinkShow?: string;
    xlinkTitle?: string;
    xlinkType?: string;
    xmlBase?: string;
    xmlLang?: string;
    xmlns?: string;
    xmlnsXlink?: string;
    xmlSpace?: string;
    y1?: number | string;
    y2?: number | string;
    y?: number | string;
    yChannelSelector?: string;
    z?: number | string;
    zoomAndPan?: string;
  }

  /**
   * -------------------------------------------------------------------------------------------
   * Intrinsics
   * -------------------------------------------------------------------------------------------
   */

  export interface IntrinsicElements {
    // HTML
    a: HTMLElementAttributes<HTMLAnchorElement>;
    abbr: HTMLElementAttributes<HTMLElement>;
    address: HTMLElementAttributes<HTMLElement>;
    area: HTMLElementAttributes<HTMLAreaElement>;
    article: HTMLElementAttributes<HTMLElement>;
    aside: HTMLElementAttributes<HTMLElement>;
    audio: HTMLElementAttributes<HTMLAudioElement>;
    b: HTMLElementAttributes<HTMLElement>;
    base: HTMLElementAttributes<HTMLBaseElement>;
    bdi: HTMLElementAttributes<HTMLElement>;
    bdo: HTMLElementAttributes<HTMLElement>;
    big: HTMLElementAttributes<HTMLElement>;
    blockquote: HTMLElementAttributes<HTMLQuoteElement>;
    body: HTMLElementAttributes<HTMLBodyElement>;
    br: HTMLElementAttributes<HTMLBRElement>;
    button: HTMLElementAttributes<HTMLButtonElement>;
    canvas: HTMLElementAttributes<HTMLCanvasElement>;
    caption: HTMLElementAttributes<HTMLTableCaptionElement>;
    cite: HTMLElementAttributes<HTMLElement>;
    code: HTMLElementAttributes<HTMLElement>;
    col: HTMLElementAttributes<HTMLTableColElement>;
    colgroup: HTMLElementAttributes<HTMLTableColElement>;
    data: HTMLElementAttributes<HTMLDataElement>;
    datalist: HTMLElementAttributes<HTMLDataListElement>;
    dd: HTMLElementAttributes<HTMLElement>;
    del: HTMLElementAttributes<HTMLModElement>;
    details: HTMLElementAttributes<HTMLDetailsElement>;
    dfn: HTMLElementAttributes<HTMLElement>;
    dialog: HTMLElementAttributes<HTMLDialogElement>;
    div: HTMLElementAttributes<HTMLDivElement>;
    dl: HTMLElementAttributes<HTMLDListElement>;
    dt: HTMLElementAttributes<HTMLElement>;
    em: HTMLElementAttributes<HTMLElement>;
    embed: HTMLElementAttributes<HTMLEmbedElement>;
    fieldset: HTMLElementAttributes<HTMLFieldSetElement>;
    figcaption: HTMLElementAttributes<HTMLElement>;
    figure: HTMLElementAttributes<HTMLElement>;
    footer: HTMLElementAttributes<HTMLElement>;
    form: HTMLElementAttributes<HTMLFormElement>;
    h1: HTMLElementAttributes<HTMLHeadingElement>;
    h2: HTMLElementAttributes<HTMLHeadingElement>;
    h3: HTMLElementAttributes<HTMLHeadingElement>;
    h4: HTMLElementAttributes<HTMLHeadingElement>;
    h5: HTMLElementAttributes<HTMLHeadingElement>;
    h6: HTMLElementAttributes<HTMLHeadingElement>;
    head: HTMLElementAttributes<HTMLHeadElement>;
    header: HTMLElementAttributes<HTMLElement>;
    hgroup: HTMLElementAttributes<HTMLElement>;
    hr: HTMLElementAttributes<HTMLHRElement>;
    html: HTMLElementAttributes<HTMLHtmlElement>;
    i: HTMLElementAttributes<HTMLElement>;
    iframe: HTMLElementAttributes<HTMLIFrameElement>;
    img: HTMLElementAttributes<HTMLImageElement>;
    input: HTMLElementAttributes<HTMLInputElement> & { defaultValue?: string };
    ins: HTMLElementAttributes<HTMLModElement>;
    kbd: HTMLElementAttributes<HTMLElement>;
    keygen: HTMLElementAttributes<HTMLUnknownElement>;
    label: HTMLElementAttributes<HTMLLabelElement>;
    legend: HTMLElementAttributes<HTMLLegendElement>;
    li: HTMLElementAttributes<HTMLLIElement>;
    link: HTMLElementAttributes<HTMLLinkElement>;
    main: HTMLElementAttributes<HTMLElement>;
    map: HTMLElementAttributes<HTMLMapElement>;
    mark: HTMLElementAttributes<HTMLElement>;
    marquee: HTMLElementAttributes<HTMLMarqueeElement> & HTMLMarqueeElementAttributes;
    menu: HTMLElementAttributes<HTMLMenuElement>;
    menuitem: HTMLElementAttributes<HTMLUnknownElement>;
    meta: HTMLElementAttributes<HTMLMetaElement>;
    meter: HTMLElementAttributes<HTMLMeterElement>;
    nav: HTMLElementAttributes<HTMLElement>;
    noscript: HTMLElementAttributes<HTMLElement>;
    object: HTMLElementAttributes<HTMLObjectElement>;
    ol: HTMLElementAttributes<HTMLOListElement>;
    optgroup: HTMLElementAttributes<HTMLOptGroupElement>;
    option: HTMLElementAttributes<HTMLOptionElement>;
    output: HTMLElementAttributes<HTMLOutputElement>;
    p: HTMLElementAttributes<HTMLParagraphElement>;
    param: HTMLElementAttributes<HTMLParamElement>;
    picture: HTMLElementAttributes<HTMLPictureElement>;
    pre: HTMLElementAttributes<HTMLPreElement>;
    progress: HTMLElementAttributes<HTMLProgressElement>;
    q: HTMLElementAttributes<HTMLQuoteElement>;
    rp: HTMLElementAttributes<HTMLElement>;
    rt: HTMLElementAttributes<HTMLElement>;
    ruby: HTMLElementAttributes<HTMLElement>;
    s: HTMLElementAttributes<HTMLElement>;
    samp: HTMLElementAttributes<HTMLElement>;
    script: HTMLElementAttributes<HTMLScriptElement>;
    section: HTMLElementAttributes<HTMLElement>;
    select: HTMLElementAttributes<HTMLSelectElement>;
    slot: HTMLElementAttributes<HTMLSlotElement>;
    small: HTMLElementAttributes<HTMLElement>;
    source: HTMLElementAttributes<HTMLSourceElement>;
    span: HTMLElementAttributes<HTMLSpanElement>;
    strong: HTMLElementAttributes<HTMLElement>;
    style: HTMLElementAttributes<HTMLStyleElement>;
    sub: HTMLElementAttributes<HTMLElement>;
    summary: HTMLElementAttributes<HTMLElement>;
    sup: HTMLElementAttributes<HTMLElement>;
    table: HTMLElementAttributes<HTMLTableElement>;
    tbody: HTMLElementAttributes<HTMLTableSectionElement>;
    td: HTMLElementAttributes<HTMLTableCellElement>;
    textarea: HTMLElementAttributes<HTMLTextAreaElement>;
    tfoot: HTMLElementAttributes<HTMLTableSectionElement>;
    th: HTMLElementAttributes<HTMLTableCellElement>;
    thead: HTMLElementAttributes<HTMLTableSectionElement>;
    time: HTMLElementAttributes<HTMLTimeElement>;
    title: HTMLElementAttributes<HTMLTitleElement>;
    tr: HTMLElementAttributes<HTMLTableRowElement>;
    track: HTMLElementAttributes<HTMLTrackElement>;
    u: HTMLElementAttributes<HTMLElement>;
    ul: HTMLElementAttributes<HTMLUListElement>;
    var: HTMLElementAttributes<HTMLElement>;
    video: HTMLElementAttributes<HTMLVideoElement>;
    wbr: HTMLElementAttributes<HTMLElement>;

    //SVG
    svg: SVGElementAttributes<SVGSVGElement>;
    animate: SVGElementAttributes<SVGAnimateElement>;
    circle: SVGElementAttributes<SVGCircleElement>;
    animateTransform: SVGElementAttributes<SVGAnimateElement>;
    clipPath: SVGElementAttributes<SVGClipPathElement>;
    defs: SVGElementAttributes<SVGDefsElement>;
    desc: SVGElementAttributes<SVGDescElement>;
    ellipse: SVGElementAttributes<SVGEllipseElement>;
    feBlend: SVGElementAttributes<SVGFEBlendElement>;
    feColorMatrix: SVGElementAttributes<SVGFEColorMatrixElement>;
    feComponentTransfer: SVGElementAttributes<SVGFEComponentTransferElement>;
    feComposite: SVGElementAttributes<SVGFECompositeElement>;
    feConvolveMatrix: SVGElementAttributes<SVGFEConvolveMatrixElement>;
    feDiffuseLighting: SVGElementAttributes<SVGFEDiffuseLightingElement>;
    feDisplacementMap: SVGElementAttributes<SVGFEDisplacementMapElement>;
    feDropShadow: SVGElementAttributes<SVGFEDropShadowElement>;
    feFlood: SVGElementAttributes<SVGFEFloodElement>;
    feFuncA: SVGElementAttributes<SVGFEFuncAElement>;
    feFuncB: SVGElementAttributes<SVGFEFuncBElement>;
    feFuncG: SVGElementAttributes<SVGFEFuncGElement>;
    feFuncR: SVGElementAttributes<SVGFEFuncRElement>;
    feGaussianBlur: SVGElementAttributes<SVGFEGaussianBlurElement>;
    feImage: SVGElementAttributes<SVGFEImageElement>;
    feMerge: SVGElementAttributes<SVGFEMergeElement>;
    feMergeNode: SVGElementAttributes<SVGFEMergeNodeElement>;
    feMorphology: SVGElementAttributes<SVGFEMorphologyElement>;
    feOffset: SVGElementAttributes<SVGFEOffsetElement>;
    feSpecularLighting: SVGElementAttributes<SVGFESpecularLightingElement>;
    feTile: SVGElementAttributes<SVGFETileElement>;
    feTurbulence: SVGElementAttributes<SVGFETurbulenceElement>;
    filter: SVGElementAttributes<SVGFilterElement>;
    foreignObject: SVGElementAttributes<SVGForeignObjectElement>;
    g: SVGElementAttributes<SVGGElement>;
    image: SVGElementAttributes<SVGImageElement>;
    line: SVGElementAttributes<SVGLineElement>;
    linearGradient: SVGElementAttributes<SVGLinearGradientElement>;
    marker: SVGElementAttributes<SVGMarkerElement>;
    mask: SVGElementAttributes<SVGMaskElement>;
    path: SVGElementAttributes<SVGPathElement>;
    pattern: SVGElementAttributes<SVGPatternElement>;
    polygon: SVGElementAttributes<SVGPolygonElement>;
    polyline: SVGElementAttributes<SVGPolylineElement>;
    radialGradient: SVGElementAttributes<SVGRadialGradientElement>;
    rect: SVGElementAttributes<SVGRectElement>;
    stop: SVGElementAttributes<SVGStopElement>;
    symbol: SVGElementAttributes<SVGSymbolElement>;
    text: SVGElementAttributes<SVGTextElement>;
    textPath: SVGElementAttributes<SVGTextPathElement>;
    tspan: SVGElementAttributes<SVGTSpanElement>;
    use: SVGElementAttributes<SVGUseElement>;
  }

  /**
   * -------------------------------------------------------------------------------------------
   * ARIA
   * -------------------------------------------------------------------------------------------
   */

  export interface ARIAAttributes {
    'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both';
    'aria-checked'?: 'true' | 'false' | 'mixed';
    'aria-disabled'?: 'true' | 'false';
    'aria-errormessage'?: string;
    'aria-expanded'?: 'true' | 'false';
    'aria-haspopup'?: 'true' | 'false' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
    'aria-hidden'?: 'true' | 'false';
    'aria-invalid'?: 'grammar' | 'false' | 'spelling' | 'true';
    'aria-label'?: string;
    'aria-level'?: number;
    'aria-modal'?: 'true' | 'false';
    'aria-multiline'?: 'true' | 'false';
    'aria-multiselectable'?: 'true' | 'false';
    'aria-orientation'?: 'horizontal' | 'vertical';
    'aria-placeholder'?: string;
    'aria-pressed'?: 'true' | 'false' | 'mixed';
    'aria-readonly'?: 'true' | 'false';
    'aria-required'?: 'true' | 'false';
    'aria-selected'?: 'true' | 'false';
    'aria-sort'?: 'ascending' | 'descending' | 'none' | 'other';
    'aria-valuemin'?: number;
    'aria-valuemax'?: number;
    'aria-valuenow'?: number;
    'aria-valuetext'?: string;
    'aria-busy'?: 'true' | 'false';
    'aria-live'?: 'assertive' | 'polite' | 'off';
    'aria-relevant'?: 'all' | 'additions' | 'removals' | 'text' | 'additions text';
    'aria-atomic'?: 'true' | 'false';
    'aria-dropeffect'?: 'copy' | 'execute' | 'link' | 'move' | 'none' | 'popup';
    'aria-grabbed'?: 'true' | 'false';
    'aria-activedescendant'?: string;
    'aria-colcount'?: number;
    'aria-colindex'?: number;
    'aria-colspan'?: number;
    'aria-controls'?: string;
    'aria-describedby'?: string;
    'aria-description'?: string;
    'aria-details'?: string;
    'aria-flowto'?: string;
    'aria-labelledby'?: string;
    'aria-owns'?: string;
    'aria-posinet'?: number;
    'aria-rowcount'?: number;
    'aria-rowindex'?: number;
    'aria-rowspan'?: number;
    'aria-setsize'?: number;
    'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false';
    'aria-keyshortcuts'?: string;
    'aria-roledescription'?: string;
  }
}
