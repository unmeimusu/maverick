import { decode } from 'html-entities';
import MagicString from 'magic-string';
import ts from 'typescript';

import {
  createFunctionCall,
  createStringLiteral,
  escapeDoubleQuotes,
  selfInvokingFunction,
  trimQuotes,
} from '../../utils/print';
import { isArray } from '../../utils/unit';
import {
  type AST,
  type AttributeNode,
  type ComponentChildren,
  createAST,
  isAST,
  isTextNode,
} from '../ast';
import type { ASTSerializer, TransformContext } from '../transform';
import { RESERVED_ATTR_NAMESPACE, RESERVED_NAMESPACE } from './constants';
import {
  isJSXElementNode,
  type JSXAttrNamespace,
  type JSXElementNode,
  type JSXEventNamespace,
  type JSXNamespace,
} from './parse-jsx';

export function isComponentTagName(tagName: string) {
  return (
    tagName !== 'CustomElement' &&
    tagName !== 'HostElement' &&
    ((tagName[0] && tagName[0].toLowerCase() !== tagName[0]) ||
      tagName.includes('.') ||
      /[^a-zA-Z]/.test(tagName[0]))
  );
}

export function getTagName(node: ts.JsxElement | ts.JsxSelfClosingElement) {
  return ts.isJsxElement(node)
    ? ((node.openingElement.tagName as ts.Identifier).escapedText as string)
    : ((node.tagName as ts.Identifier).escapedText as string);
}

export function isValidAttrNamespace(namespace: any): namespace is JSXAttrNamespace {
  return RESERVED_ATTR_NAMESPACE.has(namespace);
}

export function isValidNamespace(namespace: any): namespace is JSXNamespace {
  return RESERVED_NAMESPACE.has(namespace);
}

const eventNamespaceRE = /^\$on/;
export function isValidEventNamespace(namespace: string): namespace is JSXEventNamespace {
  return eventNamespaceRE.test(namespace);
}

export function toAttributeName(name: string) {
  return name.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`);
}

export function toPropertyName(name: string) {
  return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
}

export function isTrueBoolExpression(node: ts.Expression) {
  return node.kind === ts.SyntaxKind.TrueKeyword;
}

export function isFalseBoolExpression(node: ts.Expression) {
  return node.kind === ts.SyntaxKind.FalseKeyword;
}

export function isBoolExpression(node: ts.Expression) {
  return isTrueBoolExpression(node) || isFalseBoolExpression(node);
}

export function isStringExpression(node: ts.Expression) {
  return ts.isNoSubstitutionTemplateLiteral(node) || ts.isStringLiteral(node);
}

export function isStaticExpression(node: ts.Expression) {
  return (
    ts.isLiteralExpression(node) ||
    ts.isNumericLiteral(node) ||
    isStringExpression(node) ||
    isBoolExpression(node)
  );
}

export function overwrite(code: MagicString, node: ts.Node, content: string) {
  const start = node.getStart(node.getSourceFile()),
    end = node.getEnd();

  code.overwrite(start, end, content);
}

export function insertAfter(code: MagicString, node: ts.Node, content: string) {
  code.appendRight(node.getEnd(), content);
}

export function isEmptyNode(node: ts.Node) {
  const text = trimQuotes(node.getText().trim());
  return text.length === 0 || text === '() => {}';
}

export function isEmptyExpressionNode(node: ts.Node) {
  return ts.isJsxExpression(node) && isEmptyNode(node);
}

export function isEmptyTextNode(node: ts.Node) {
  return ts.isJsxText(node) && (isEmptyNode(node) || /^[\r\n]\s*$/.test(node.getText()));
}

export function filterEmptyJSXChildNodes(children: ts.JsxChild[]) {
  return children.filter((child) => !isEmptyExpressionNode(child) && !isEmptyTextNode(child));
}

export function filterDOMElements(children: ts.JsxChild[]) {
  return children.filter(
    (node) =>
      (ts.isJsxText(node) && !isEmptyNode(node)) ||
      (isJSXElementNode(node) && !isComponentTagName(getTagName(node))),
  ) as JSXElementNode[];
}

export function serializeComponentProp(
  serializer: ASTSerializer,
  node: AttributeNode,
  ctx: TransformContext,
) {
  if (!node.children) {
    return `${node.name}: ${node.value}`;
  } else {
    const serialized = serializeParentExpression(serializer, node, { ...ctx, scoped: true });
    return `${node.name}: ${serialized}`;
  }
}

export function serializeChildren(
  serializer: ASTSerializer,
  children: ComponentChildren[],
  ctx: TransformContext,
  component = false,
) {
  const serialized = children.map((child) => {
    if (isAST(child)) {
      return serializer.serialize(child, ctx);
    } else if (isTextNode(child)) {
      return createStringLiteral(escapeDoubleQuotes(decode(child.value)));
    } else {
      let ast =
        !component && (serializer.name === 'ssr' || ctx.hydratable)
          ? createAST(child.ref as any)
          : null;
      if (ast) ast.tree.push(child);

      const expression = child.children
        ? serializeParentExpression(serializer, child, ctx)
        : ast
        ? serializer.serialize(ast, ctx)
        : child.value;

      if (
        ctx.fragment &&
        child.observable &&
        ctx.hydratable &&
        serializer.name === 'dom' &&
        child.children?.length
      ) {
        ctx.runtime.add('$$_computed');
        return selfInvokingFunction(
          [
            `const $$_signal = ${createFunctionCall('$$_computed', [`() => ${expression}`])};`,
            '$$_signal();',
            'return $$_signal;',
          ].join(''),
        );
      }

      return expression;
    }
  });

  if (serialized.length === 1 && serialized[0].length === 0) return '';

  return serialized.length === 1 ? serialized[0] : `[${serialized.join(', ')}]`;
}

export function serializeComponentChildrenProp(
  serializer: ASTSerializer,
  children: ComponentChildren[],
  ctx: TransformContext,
) {
  return `$children() { return ${serializeChildren(serializer, children, ctx, true)} }`;
}

export function serializeParentExpression(
  serializer: ASTSerializer,
  node: {
    value: string;
    ref: ts.Node;
    children?: AST[];
  },
  ctx: TransformContext,
  hof: string | false = false,
) {
  let code = new MagicString(node.value),
    start = node.ref.getStart() + (ts.isJsxExpression(node.ref) ? 1 : 0);

  const returnStatement =
    !!node.children &&
    node.children.length === 1 &&
    ts.isJsxExpression(node.ref) &&
    !!node.ref.expression &&
    ts.isArrowFunction(node.ref.expression) &&
    ts.isBlock(node.ref.expression.body) &&
    (node.ref.expression.body.statements.find(ts.isReturnStatement) as ts.ReturnStatement);

  const isAlreadyScoped =
    returnStatement &&
    !!returnStatement.expression &&
    (returnStatement.expression === node.children![0].root ||
      (ts.isParenthesizedExpression(returnStatement.expression) &&
        returnStatement.expression.expression === node.children![0].root));

  for (const ast of node.children!) {
    const expression = serializer.serialize(ast, {
        ...ctx,
        scoped: returnStatement ? !isAlreadyScoped : ctx.scoped,
      }),
      nodeStart = isAlreadyScoped ? returnStatement.getStart() : ast.root.getStart(),
      nodeEnd = isAlreadyScoped ? returnStatement.getEnd() : ast.root.getEnd();

    code.overwrite(
      nodeStart - start,
      nodeEnd - start,
      hof && expression.startsWith('(') ? `${hof}(() => ${expression})` : expression,
    );
  }

  return code.toString();
}

export function serializeCreateComponent(
  createId: string,
  mergeId: string,
  tagName: string,
  props: string[],
  spreads: string[],
) {
  const hasProps = props.filter((prop) => prop !== '$$SPREAD').length > 0;
  const hasSpreads = spreads.length > 0;
  const shouldMergeProps = hasSpreads && (hasProps || spreads.length > 1);

  const mergedProps: (string | string[])[] = [];

  if (shouldMergeProps) {
    let i = 0;
    for (const prop of props) {
      if (prop === '$$SPREAD') {
        mergedProps.push(spreads.pop()!);
        i = mergedProps.length;
      } else {
        ((mergedProps[i] ??= []) as string[]).push(prop);
      }
    }
  }

  const mergedPropsArgs = mergedProps.map((prop) =>
    isArray(prop) ? `{ ${prop.join(', ')} }` : prop,
  );

  const createComponent = createFunctionCall(createId, [
    tagName,
    hasSpreads
      ? !hasProps && spreads.length === 1
        ? spreads[spreads.length - 1]
        : createFunctionCall(mergeId, mergedPropsArgs)
      : hasProps
      ? `{ ${props.join(', ')} }`
      : '',
  ]);

  return { createComponent, shouldMergeProps };
}
