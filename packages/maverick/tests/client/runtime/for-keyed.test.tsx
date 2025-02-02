import { ForKeyed, signal, tick } from 'maverick.js';

import { render } from 'maverick.js/dom';

it('should render keyed loop', () => {
  const source = signal([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);

  function Component() {
    return (
      <ForKeyed each={source}>
        {(item, i) => (
          <span>
            {item.id} - {i()}
          </span>
        )}
      </ForKeyed>
    );
  }

  const root = document.createElement('root');
  render(() => <Component />, { target: root });

  expect(root).toMatchInlineSnapshot(`
    <root>
      <span>
        a
        <!--$-->
        - 
        0
        <!--$-->
      </span>
      <span>
        b
        <!--$-->
        - 
        1
        <!--$-->
      </span>
      <span>
        c
        <!--$-->
        - 
        2
        <!--$-->
      </span>
    </root>
  `);

  // Change
  source.set((p) => {
    const tmp = p[1];
    p[1] = p[0];
    p[0] = tmp;
    return [...p];
  });

  tick();

  expect(root).toMatchInlineSnapshot(`
    <root>
      <span>
        b
        <!--$-->
        - 
        0
        <!--$-->
      </span>
      <span>
        a
        <!--$-->
        - 
        1
        <!--$-->
      </span>
      <span>
        c
        <!--$-->
        - 
        2
        <!--$-->
      </span>
    </root>
  `);

  // Delete Last
  source.set(source().slice(0, -1));
  tick();

  expect(root).toMatchInlineSnapshot(`
    <root>
      <span>
        b
        <!--$-->
        - 
        0
        <!--$-->
      </span>
      <span>
        a
        <!--$-->
        - 
        1
        <!--$-->
      </span>
    </root>
  `);

  // Add
  source.set([...source(), { id: 'd' }, { id: 'e' }]);
  tick();

  expect(root).toMatchInlineSnapshot(`
    <root>
      <span>
        b
        <!--$-->
        - 
        0
        <!--$-->
      </span>
      <span>
        a
        <!--$-->
        - 
        1
        <!--$-->
      </span>
      <span>
        d
        <!--$-->
        - 
        2
        <!--$-->
      </span>
      <span>
        e
        <!--$-->
        - 
        3
        <!--$-->
      </span>
    </root>
  `);

  // Delete First
  source.set(source().slice(1));
  tick();

  expect(root).toMatchInlineSnapshot(`
    <root>
      <span>
        a
        <!--$-->
        - 
        0
        <!--$-->
      </span>
      <span>
        d
        <!--$-->
        - 
        1
        <!--$-->
      </span>
      <span>
        e
        <!--$-->
        - 
        2
        <!--$-->
      </span>
    </root>
  `);

  // Empty
  source.set([]);
  tick();

  expect(root).toMatchInlineSnapshot('<root />');
});
