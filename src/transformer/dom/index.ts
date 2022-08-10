import MagicString from 'magic-string';
import {
  type AttributeNode,
  type ElementNode,
  type ExpressionNode,
  isAST,
  isAttributeNode,
  isAttributesEnd,
  isDirectiveNode,
  isElementEnd,
  isElementNode,
  isEventNode,
  isExpressionNode,
  isRefNode,
  isSpreadNode,
  isStructuralNode,
  isTextNode,
  isChildrenStart,
  isChildrenEnd,
  isFragmentNode,
} from '../ast';
import { type ASTSerializer, type TransformContext } from '../transform';
import {
  createFunctionCall,
  createStringLiteral,
  Declarations,
  escapeDoubleQuotes,
  trimQuotes,
  trimTrailingSemicolon,
} from '../../utils/print';
import { escape } from '../../utils/html';
import { decode, encode } from 'html-entities';

const ID = {
  template: '$$_templ',
  root: '$$_root',
  walker: '$$_walker',
  element: '$$_el',
  component: '$$_comp',
  expression: '$$_expr',
};

const RUNTIME = {
  createTemplate: '$$_create_template',
  createFragment: '$$_create_fragment',
  createMarkersWalker: '$$_create_markers_walker',
  nextElement: '$$_next_element',
  createComponent: '$$_create_component',
  insert: '$$_insert',
  insertAtMarker: '$$_insert_at_marker',
  listen: '$$_listen',
  listenDelegate: '$$_listen_delegate',
  clone: '$$_clone',
  directive: '$$_directive',
  ref: '$$_ref',
  attr: '$$_attr',
  class: '$$_class',
  prop: '$$_prop',
  style: '$$_style',
  cssvar: '$$_cssvar',
  spread: '$$_spread',
  mergeProps: '$$_merge_props',
  innerHTML: '$$_inner_html',
};

const MARKERS = {
  component: '<!$>',
  element: '<!$>',
  expression: '<!$>',
};

let scoped = true;
export const dom: ASTSerializer = {
  serialize(ast, ctx) {
    let rootId!: string,
      currentId!: string,
      walkerId!: string,
      component!: ElementNode | undefined,
      templateId: string | undefined,
      hierarchy: number[] = [],
      props: string[] = [],
      styles: string[] = [],
      spreads: string[] = [],
      expressions: string[] = [],
      template: string[] = [],
      elements: ElementNode[] = [],
      locals = new Declarations(),
      elementChildIndex = -1,
      elementIds: Record<string, string> = {},
      getRootId = () => {
        if (!rootId) {
          if (!templateId) templateId = ctx.globals.create(ID.template);
          rootId = locals.create(ID.root, createFunctionCall(RUNTIME.clone, [templateId]));
          currentId = rootId;
          ctx.runtime.add(RUNTIME.clone);
          elementIds[0] = ID.root;
          hierarchy.push(0);
        }

        return rootId;
      },
      getParentElementId = () => {
        if (!rootId) getRootId();
        return getElementId(hierarchy, elementIds, locals);
      },
      getCurrentElementId = () => {
        if (!rootId) getRootId();
        return getElementId(
          elementChildIndex >= 0 ? [...hierarchy, elementChildIndex] : hierarchy,
          elementIds,
          locals,
        );
      },
      getNextElementId = () => {
        const element = elements.at(-1);
        const nextSibling = elementChildIndex + 1;
        return element && element.childCount > 1
          ? nextSibling >= element.childElementCount
            ? 'null'
            : getElementId([...hierarchy, nextSibling], elementIds, locals)
          : null;
      },
      getWalkerId = () => {
        if (!walkerId) {
          walkerId = locals.create(
            ID.walker,
            createFunctionCall(RUNTIME.createMarkersWalker, [getRootId()]),
          );
          ctx.runtime.add(RUNTIME.clone);
          ctx.runtime.add(RUNTIME.createMarkersWalker);
        }

        return walkerId;
      },
      newMarkerId = () => `${getWalkerId()}.nextNode()`,
      addAttrExpression = (node: AttributeNode, runtimeId: string) => {
        expressions.push(
          createFunctionCall(runtimeId, [
            currentId,
            createStringLiteral(node.name),
            node.callId ?? (node.observable ? `() => ${node.value}` : node.value),
          ]),
        );
        ctx.runtime.add(runtimeId);
      };

    const firstNode = ast.tree[0],
      isFirstNodeElement = isElementNode(firstNode),
      isFirstNodeComponent = isFirstNodeElement && firstNode.isComponent;
    if (isFragmentNode(firstNode)) elements.push(firstNode as ElementNode);

    for (let i = 0; i < ast.tree.length; i++) {
      const node = ast.tree[i];

      if (component) {
        if (isAttributeNode(node) && !node.namespace) {
          if (!node.observable || node.callId) {
            props.push(`${node.name}: ${node.callId ?? node.value}`);
          } else {
            props.push(`get ${node.name}() { return ${node.value}; }`);
          }
        } else if (isSpreadNode(node)) {
          spreads.push(node.value);
        } else if (isStructuralNode(node) && isElementEnd(node)) {
          const children = component.children;
          if (children) {
            const prevScoped = scoped;
            if (children.length === 1 && isAST(children[0])) scoped = false;

            const serialized = children.map((child) => {
              if (isAST(child)) {
                return dom.serialize(child, ctx);
              } else if (isTextNode(child)) {
                return createStringLiteral(escapeDoubleQuotes(decode(child.value)));
              } else {
                return child.children ? transformParentExpression(child, ctx) : child.value;
              }
            });

            const hasReturn = scoped || serialized[0].startsWith(RUNTIME.clone);
            props.push(
              `get children() { ${hasReturn ? 'return ' : ''}${
                serialized.length === 1 ? serialized[0] : `[${serialized.join(', ')}]`
              } }`,
            );

            scoped = prevScoped;
          }

          const hasProps = props.length > 0;
          const hasSpreads = spreads.length > 0;
          const propsExpr = hasProps ? `{ ${props.join(', ')} }` : '';
          const createComponent = createFunctionCall(RUNTIME.createComponent, [
            component.tagName,
            hasSpreads
              ? !hasProps && spreads.length === 1
                ? spreads[0]
                : createFunctionCall(RUNTIME.mergeProps, [...spreads, propsExpr])
              : propsExpr,
          ]);

          if (isFirstNodeComponent) {
            expressions.push(createComponent);
          } else {
            const insertId = ctx.hydratable ? RUNTIME.insertAtMarker : RUNTIME.insert;
            const beforeId = ctx.hydratable ? null : getNextElementId();

            expressions.push(
              createFunctionCall(insertId, [
                ctx.hydratable
                  ? currentId
                  : beforeId || elementChildIndex === -1
                  ? getParentElementId()
                  : (currentId ??= getCurrentElementId()),
                createComponent,
                beforeId,
              ]),
            );

            ctx.runtime.add(insertId);
          }

          props = [];
          spreads = [];
          component = undefined;
          ctx.runtime.add(RUNTIME.createComponent);
          if (hasSpreads) ctx.runtime.add(RUNTIME.mergeProps);
        }
      } else if (isStructuralNode(node)) {
        if (isAttributesEnd(node)) {
          if (styles.length > 0) {
            template.push(` style="${styles.join(';')}"`);
            styles = [];
          }

          const element = elements.at(-1);
          if (element && !element.isVoid) template.push('>');
        } else if (isChildrenStart(node)) {
          hierarchy.push(elementChildIndex);
          elementChildIndex = -1;
        } else if (isChildrenEnd(node)) {
          elementChildIndex = hierarchy.pop()!;
        } else if (isElementEnd(node)) {
          const element = elements.pop();
          if (element) template.push(element.isVoid ? ` />` : `</${element.tagName}>`);
        }
      } else if (isElementNode(node)) {
        if (!node.isComponent) elementChildIndex++;

        if (isFirstNodeComponent && node == firstNode) {
          component = node;
          continue;
        }

        const dynamic = node.dynamic();
        if (ctx.hydratable && dynamic) {
          if (node.isComponent) {
            currentId = locals.create(ID.component, newMarkerId());
          } else {
            currentId = locals.create(
              ID.element,
              createFunctionCall(RUNTIME.nextElement, [getWalkerId()]),
            );
            ctx.runtime.add(RUNTIME.nextElement);
          }
        }

        if (!ctx.hydratable && dynamic) {
          currentId = getCurrentElementId();
        }

        if (node.isComponent) {
          if (ctx.hydratable) template.push(MARKERS.component);
          component = node;
        } else {
          if (ctx.hydratable && dynamic) template.push(MARKERS.element);
          template.push(`<${node.tagName}`);
          elements.push(node);
        }
      } else if (isAttributeNode(node)) {
        if (node.namespace) {
          if (node.namespace === '$prop') {
            if (node.name === 'innerHTML') {
              expressions.push(createFunctionCall(RUNTIME.innerHTML, [currentId, node.value]));
              ctx.runtime.add(RUNTIME.innerHTML);
            } else {
              addAttrExpression(node, RUNTIME.prop);
            }
          } else if (node.namespace === '$class') {
            addAttrExpression(node, RUNTIME.class);
          } else if (node.namespace === '$style') {
            if (!node.dynamic) {
              styles.push(`${node.name}: ${trimQuotes(node.value)}`);
            } else {
              addAttrExpression(node, RUNTIME.style);
            }
          } else if (node.namespace === '$cssvar') {
            if (!node.dynamic) {
              styles.push(`--${node.name}: ${trimQuotes(node.value)}`);
            } else {
              addAttrExpression(node, RUNTIME.cssvar);
            }
          }
        } else if (!node.dynamic) {
          if (node.name === 'style') {
            styles.push(trimTrailingSemicolon(trimQuotes(node.value)));
          } else {
            template.push(` ${node.name}="${escape(trimQuotes(node.value), true)}"`);
          }
        } else {
          addAttrExpression(node, RUNTIME.attr);
        }
      } else if (isRefNode(node)) {
        expressions.push(createFunctionCall(RUNTIME.ref, [currentId, node.value]));
        ctx.runtime.add(RUNTIME.ref);
      } else if (isEventNode(node)) {
        const args = [currentId, createStringLiteral(node.type), node.value];
        if (node.namespace === '$oncapture') args.push(`1 /* CAPTURE */`);
        expressions.push(createFunctionCall(RUNTIME.listen, args));
        ctx.runtime.add(RUNTIME.listen);
      } else if (isDirectiveNode(node)) {
        expressions.push(createFunctionCall(RUNTIME.directive, [currentId, node.name, node.value]));
        ctx.runtime.add(RUNTIME.directive);
      } else if (isTextNode(node)) {
        template.push(node.value);
      } else if (isExpressionNode(node)) {
        if (!node.dynamic) {
          template.push(encode(trimQuotes(node.value)));
        } else {
          if (ctx.hydratable) template.push(MARKERS.expression);
          const beforeId = ctx.hydratable ? null : getNextElementId();
          const id = ctx.hydratable
            ? locals.create(ID.expression, newMarkerId())
            : beforeId || elementChildIndex === -1
            ? getParentElementId()
            : (currentId ??= getCurrentElementId());
          const insertId = ctx.hydratable ? RUNTIME.insertAtMarker : RUNTIME.insert;
          const code = !node.children ? node.value : transformParentExpression(node, ctx);
          expressions.push(
            createFunctionCall(insertId, [
              id,
              node.callId ?? (node.observable ? `() => ${code}` : code),
              beforeId,
            ]),
          );
          ctx.runtime.add(insertId);
        }
      } else if (isSpreadNode(node)) {
        expressions.push(createFunctionCall(RUNTIME.spread, [currentId, node.value]));
        ctx.runtime.add(RUNTIME.spread);
      }
    }

    if (template.length) {
      const expression = createFunctionCall(RUNTIME.createTemplate, [`\`${template.join('')}\``]);

      if (templateId) {
        ctx.globals.update(templateId, expression);
      } else {
        templateId = ctx.globals.create(ID.template, expression);
      }

      ctx.runtime.add(RUNTIME.createTemplate);
    } else if (templateId) {
      ctx.globals.update(templateId, createFunctionCall(RUNTIME.createFragment));
      ctx.runtime.add(RUNTIME.createFragment);
    }

    if (locals.size > 1 || expressions.length) {
      return isFirstNodeComponent
        ? expressions.join(';')
        : [
            scoped && `(() => { `,
            locals.serialize(),
            '\n',
            ...expressions.join(';'),
            ';',
            '\n',
            '\n',
            `return ${
              isFirstNodeElement
                ? !ctx.hydratable
                  ? ID.element
                  : !firstNode.dynamic()
                  ? `${rootId}.firstChild`
                  : rootId
                : rootId
            }; `,
            scoped && '})()',
          ]
            .filter(Boolean)
            .join('');
    } else if (templateId) {
      ctx.runtime.add(RUNTIME.clone);
      return createFunctionCall(
        RUNTIME.clone,
        isFirstNodeElement && !isFirstNodeComponent
          ? [templateId, '1 /* ELEMENT */']
          : [templateId],
      );
    }

    return '';
  },
};

function transformParentExpression(node: ExpressionNode, ctx: TransformContext) {
  let code = new MagicString(node.value),
    start = node.ref.getStart() + 1;

  for (const ast of node.children!) {
    code.overwrite(ast.root.getStart() - start, ast.root.getEnd() - start, dom.serialize(ast, ctx));
  }

  return code.toString();
}

function getElementId(
  positions: number[],
  cache: Record<string, string>,
  declarations: Declarations,
) {
  const key = positions.join('');
  if (cache[key]) return cache[key];

  let id = ID.root,
    hierarchy = '';

  for (let i = 0; i < positions.length; i++) {
    const childIndex = positions[i];
    const current = hierarchy + childIndex;

    if (cache[current]) {
      id = cache[current];
    } else if (childIndex === 0) {
      id = cache[current] = declarations.create(ID.element, `${id}.firstChild`);
    } else {
      id = cache[hierarchy + 0];
      for (let j = 1; j <= childIndex; j++) {
        const sibling = hierarchy + j;
        id =
          cache[sibling] ?? (cache[sibling] = declarations.create(ID.element, `${id}.nextSibling`));
      }
    }

    hierarchy = current;
  }

  return id;
}
