import { observable, tick, type ParentComponent } from '@maverick-js/elements';
import { hydrate } from '@maverick-js/elements/dom';
import { element, startMarker, text } from './utils';

it('should hydrate', async () => {
  const root = element('root');

  const spanOne = element('span');
  const countTextTwo = text('1');
  spanOne.append(startMarker(), countTextTwo);

  const spanTwo = element('span');
  const countTextThree = text('1');
  spanTwo.append(startMarker(), countTextThree);

  const div = element('div');
  const countIsText = text('Count is');
  const countText = text('1');
  div.append(countIsText, startMarker(), countText, startMarker(), spanOne, spanTwo);
  root.append(startMarker(), div);

  const $count = observable(1);
  const clickHandler = vi.fn();

  const ChildComponent: ParentComponent = (props) => {
    return props.children;
  };

  function Component() {
    return (
      <div $on:click={clickHandler}>
        Count is {$count()}
        <ChildComponent>
          <span>{$count()}</span>
          <span>{$count()}</span>
        </ChildComponent>
      </div>
    );
  }

  hydrate(() => <Component />, { target: root });

  expect(root).toMatchSnapshot();

  const a = root.firstElementChild;
  expect(a).toBe(div);
  const b = a?.firstChild;
  expect(b).toBe(countIsText);
  const c = b?.nextSibling?.nextSibling;
  expect(c).toBe(countText);
  expect(c?.nextSibling).toBeInstanceOf(Comment);
  const d = c?.nextSibling?.nextSibling?.nextSibling;
  expect(d).toBe(spanOne);
  const e = d?.nextSibling;
  expect(e).toBe(spanTwo);
  expect(e?.nextSibling).toBe(null);
  const f = e?.firstChild?.nextSibling;
  expect(f).toBe(countTextThree);
  expect(f?.nextSibling).toBeInstanceOf(Comment);
  expect(f?.nextSibling?.nextSibling).toBe(null);

  const clickEvent = new MouseEvent('click');
  div.dispatchEvent(clickEvent);
  expect(clickHandler).toHaveBeenCalledWith(clickEvent);

  $count.set(2);
  await tick();

  expect(countText.textContent).toBe('2');
  expect(countTextTwo.textContent).toBe('2');
  expect(countTextThree.textContent).toBe('2');
  expect(root).toMatchSnapshot();
});
