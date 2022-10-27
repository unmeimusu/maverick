import { decode } from 'html-entities';
import MagicString from 'magic-string';
import t from 'typescript';
import { createStringLiteral, escapeDoubleQuotes, trimQuotes } from '../../utils/print';
import {
  type AttributeNode,
  type ComponentChildren,
  type ExpressionNode,
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
    ((tagName[0] && tagName[0].toLowerCase() !== tagName[0]) ||
      tagName.includes('.') ||
      /[^a-zA-Z]/.test(tagName[0]))
  );
}

export function getTagName(node: t.JsxElement | t.JsxSelfClosingElement) {
  return t.isJsxElement(node)
    ? ((node.openingElement.tagName as t.Identifier).escapedText as string)
    : ((node.tagName as t.Identifier).escapedText as string);
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

export function isTrueBoolExpression(node: t.Expression) {
  return node.kind === t.SyntaxKind.TrueKeyword;
}

export function isFalseBoolExpression(node: t.Expression) {
  return node.kind === t.SyntaxKind.FalseKeyword;
}

export function isBoolExpression(node: t.Expression) {
  return isTrueBoolExpression(node) || isFalseBoolExpression(node);
}

export function isStringExpression(node: t.Expression) {
  return t.isNoSubstitutionTemplateLiteral(node) || t.isStringLiteral(node);
}

export function isStaticExpression(node: t.Expression) {
  return (
    t.isLiteralExpression(node) ||
    t.isNumericLiteral(node) ||
    isStringExpression(node) ||
    isBoolExpression(node)
  );
}

export function overwrite(code: MagicString, node: t.Node, content: string) {
  const start = node.getStart(node.getSourceFile()),
    end = node.getEnd();

  code.overwrite(start, end, content);
}

export function insertAfter(code: MagicString, node: t.Node, content: string) {
  code.appendRight(node.getEnd(), content);
}

export function isEmptyNode(node: t.Node) {
  const text = trimQuotes(node.getText().trim());
  return text.length === 0 || text === '() => {}';
}

export function isEmptyExpressionNode(node: t.Node) {
  return t.isJsxExpression(node) && isEmptyNode(node);
}

export function isEmptyTextNode(node: t.Node) {
  return t.isJsxText(node) && (isEmptyNode(node) || /^[\r\n]\s*$/.test(node.getText()));
}

export function filterEmptyJSXChildNodes(children: t.JsxChild[]) {
  return children.filter((child) => !isEmptyExpressionNode(child) && !isEmptyTextNode(child));
}

export function filterNonJSXElements(children: t.JsxChild[]) {
  return children.filter(
    (node) => isJSXElementNode(node) && !isComponentTagName(getTagName(node)),
  ) as JSXElementNode[];
}

export function serializeComponentProp(node: AttributeNode) {
  return !node.observable || node.callId
    ? `${node.name}: ${node.callId ?? node.value}`
    : `get ${node.name}() { return ${node.value}; }`;
}

export function serializeChildren(
  serializer: ASTSerializer,
  children: ComponentChildren[],
  ctx: TransformContext,
) {
  const serialized = children.map((child) => {
    if (isAST(child)) {
      return serializer.serialize(child, ctx);
    } else if (isTextNode(child)) {
      return createStringLiteral(escapeDoubleQuotes(decode(child.value)));
    } else {
      return child.children ? serializeParentExpression(serializer, child, ctx) : child.value;
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
  return `get children() { return ${serializeChildren(serializer, children, ctx)} }`;
}

export function serializeParentExpression(
  serializer: ASTSerializer,
  node: ExpressionNode,
  ctx: TransformContext,
) {
  let code = new MagicString(node.value),
    start = node.ref.getStart() + 1;

  for (const ast of node.children!) {
    code.overwrite(
      ast.root.getStart() - start,
      ast.root.getEnd() - start,
      serializer.serialize(ast, ctx),
    );
  }

  return code.toString();
}
