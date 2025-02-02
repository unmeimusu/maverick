import { transform } from 'maverick.js/transformer';

const t = (code: string) => transform(code).code;

it('should compile expression ', () => {
  const result = t(`
function Component() {
  return id > 10 ? <div>{id}</div> : 20;
}
  `);
  expect(result).toMatchInlineSnapshot(`
    "import { $$_clone, $$_insert, $$_create_template, $$_peek } from \\"maverick.js/dom\\";

    const $$_templ = /* #__PURE__ */ $$_create_template(\`<div></div>\`);

    function Component() {
      return id > 10
      ? $$_peek(() =>
        (() => {
          const $$_root = $$_clone($$_templ);

          $$_insert($$_root, id);

          return $$_root;
        })()
      )
      : 20;
    }
      "
  `);
});

it('should compile jsx prop expression', () => {
  const result = t(`<Component foo={<div>Foo</div>} />`);
  expect(result).toMatchInlineSnapshot(`
    "import { $$_create_template, $$_clone, $$_create_component } from \\"maverick.js/dom\\";

    const $$_templ = /* #__PURE__ */ $$_create_template(\`<div>Foo</div>\`);
    $$_create_component(Component, { foo: $$_clone($$_templ) })"
  `);
});

it('should compile child jsx prop expression', () => {
  const result = t(`<Component foo={id > 10 ? <div>Foo</div> : null} />`);
  expect(result).toMatchInlineSnapshot(`
    "import { $$_create_template, $$_clone, $$_create_component } from \\"maverick.js/dom\\";

    const $$_templ = /* #__PURE__ */ $$_create_template(\`<div>Foo</div>\`);
    $$_create_component(Component, { foo: id > 10 ? $$_clone($$_templ) : null })"
  `);
});

it('should compile dynamic jsx prop expression', () => {
  const result = t(`<Component foo={<div id={id()}>Foo</div>} />`);
  expect(result).toMatchInlineSnapshot(`
    "import { $$_clone, $$_effect, $$_attr, $$_create_template, $$_create_component } from \\"maverick.js/dom\\";

    const $$_templ = /* #__PURE__ */ $$_create_template(\`<div>Foo</div>\`);
    $$_create_component(Component, {
      foo: (() => {
        const $$_root = $$_clone($$_templ);

        $$_effect(() => $$_attr($$_root, \\"id\\", id()));

        return $$_root;
      })(),
    })"
  `);
});

it('should compile multiple jsx prop expressions', () => {
  const result = t(`<Component foo={id > 10 ? <div id={id()}>Foo</div> : <div>Bar</div>} />`);
  expect(result).toMatchInlineSnapshot(`
    "import { $$_clone, $$_effect, $$_attr, $$_create_template, $$_create_component } from \\"maverick.js/dom\\";

    const $$_templ = /* #__PURE__ */ $$_create_template(\`<div>Foo</div>\`),
      $$_templ_2 = /* #__PURE__ */ $$_create_template(\`<div>Bar</div>\`);
    $$_create_component(Component, {
      foo: id > 10
        ? (() => {
          const $$_root = $$_clone($$_templ);

          $$_effect(() => $$_attr($$_root, \\"id\\", id()));

          return $$_root;
        })()
        : $$_clone($$_templ_2),
    })"
  `);
});

it('should forward single call expression', () => {
  const result = t(`<Component>{() => <div>{id()}</div>}</Component>`);
  expect(result).toMatchInlineSnapshot(`
    "import { $$_clone, $$_insert, $$_create_template, $$_children, $$_create_component } from \\"maverick.js/dom\\";

    const $$_templ = /* #__PURE__ */ $$_create_template(\`<div></div>\`);
    $$_create_component(Component, {
      $children: $$_children(() => {
        return () =>
          (() => {
            const $$_root = $$_clone($$_templ);

            $$_insert($$_root, id);

            return $$_root;
          })();
      }),
    })"
  `);
});

it('should forward multiple call expressions', () => {
  const result = t(`
<Component>
  {() => <div>{id()}</div>}
  {() => <div>{id()}</div>}
</Component>
`);
  expect(result).toMatchInlineSnapshot(`
    "import { $$_clone, $$_insert, $$_create_template, $$_children, $$_create_component } from \\"maverick.js/dom\\";

    const $$_templ = /* #__PURE__ */ $$_create_template(\`<div></div>\`),
      $$_templ_2 = /* #__PURE__ */ $$_templ;

    $$_create_component(Component, {
      $children: $$_children(() => {
        return [() =>
          (() => {
            const $$_root = $$_clone($$_templ);

            $$_insert($$_root, id);

            return $$_root;
          })(), () =>
          (() => {
            const $$_root = $$_clone($$_templ_2);

            $$_insert($$_root, id);

            return $$_root;
          })()];
      }),
    })
    "
  `);
});
