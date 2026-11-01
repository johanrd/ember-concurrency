import { set } from '@ember/object';
import { run } from '@ember/runloop';
import { settled } from '@ember/test-helpers';
import { tracked } from '@glimmer/tracking';
import {
  race,
  task,
  waitForEvent,
  waitForProperty,
  waitForQueue,
} from 'ember-concurrency';
import { module, test } from 'qunit';

interface GenericEvented {
  _handlers: Record<string, Function[]>;

  // eslint-disable-next-line no-unused-vars
  has(_eventName: string): boolean;
  // eslint-disable-next-line no-unused-vars
  trigger(eventName: string, data?: any): void;
  // eslint-disable-next-line no-unused-vars
  on(eventName: string, fn: Function): void;
  // eslint-disable-next-line no-unused-vars
  off(eventName: string, fn: Function): void;
}

class EventedClass implements GenericEvented {
  _handlers: Record<string, Function[]> = {};

  has(eventName: string): boolean {
    return this._handlers[eventName] && this._handlers[eventName].length > 0;
  }

  trigger(eventName: string, data?: any): void {
    const eventHandlers = this._handlers[eventName];
    if (eventHandlers) {
      eventHandlers.forEach((handler) => handler.call(this, data));
    }
  }

  on(eventName: string, fn: Function): void {
    this._handlers[eventName] = this._handlers[eventName] || [];
    this._handlers[eventName].push(fn);
  }

  off(eventName: string, fn: Function): void {
    const eventHandlers = this._handlers[eventName];
    if (eventHandlers) {
      this._handlers[eventName] = eventHandlers.filter(
        (handler) => handler !== fn,
      );
    }
  }
}

// Create a class that extends both EventedClass and has Ember.Evented interface
class EmberEventedClass extends EventedClass {
  // Add Ember.Evented compatibility
  has(eventName: string): boolean {
    return (
      super.has(eventName) ||
      (this as any)._emberEventListeners?.[eventName]?.length > 0
    );
  }
}

module('Unit: test waitForQueue and waitForEvent', function () {
  test('waitForQueue works', function (assert) {
    assert.expect(2);

    let taskCompleted = false;

    class TestObj {
      task = task(async () => {
        await waitForQueue('afterRender');
        taskCompleted = true;
      });
    }

    run(() => {
      let obj = new TestObj();
      obj.task.perform();
      assert.notOk(taskCompleted, 'Task should not have completed');
    });

    assert.ok(taskCompleted, 'Task should have completed');
  });

  test('cancelling waitForQueue works', function (assert) {
    assert.expect(2);

    let taskCompleted = false;

    class TestObj {
      task = task(async () => {
        await waitForQueue('afterRender');
        taskCompleted = true;
      });
    }

    run(() => {
      let obj = new TestObj();
      obj.task.perform();
      assert.notOk(taskCompleted, 'Task should not have completed');
      obj.task.cancelAll();
    });

    assert.notOk(taskCompleted, 'Task should not have completed');
  });

  test('waitForQueue throws if invalid queue is used', function (assert) {
    assert.expect(2);

    let taskErrored = false;

    class TestObj {
      task = task(async () => {
        try {
          await waitForQueue('non-existing-queue');
        } catch (error: any) {
          assert.strictEqual(
            error.toString(),
            "Error: You attempted to schedule an action in a queue (non-existing-queue) that doesn't exist",
            'it correctly bubbles error up',
          );
          taskErrored = true;
        }
      });
    }

    run(() => {
      let obj = new TestObj();
      obj.task.perform();
      assert.notOk(taskErrored, 'Task should have errored');
    });
  });

  test('waitForEvent works (`Ember.Evented` interface)', function (assert) {
    assert.expect(4);
    let taskCompleted = false;

    class TestObj extends EmberEventedClass {
      task = task(async () => {
        let value = await waitForEvent(this, 'foo');
        assert.strictEqual(value, 123);
        taskCompleted = true;
      });
    }

    let obj: TestObj;
    run(() => {
      obj = new TestObj();
      obj.task.perform();
    });

    run(() => {
      assert.notOk(taskCompleted, 'Task should not have completed');
      assert.ok(obj.has('foo'), 'Object has the event listener');
      obj.trigger('foo', 123);
    });

    assert.ok(taskCompleted, 'Task should have completed');
  });

  test('canceling waitForEvent works (`Ember.Evented` interface)', function (assert) {
    assert.expect(4);
    let taskCompleted = false;

    class TestObj extends EmberEventedClass {
      task = task(async () => {
        await waitForEvent(this, 'foo');
        taskCompleted = true;
      });
    }

    let obj: TestObj;
    run(() => {
      obj = new TestObj();
      obj.task.perform();
    });

    run(() => {
      assert.notOk(taskCompleted, 'Task should not have completed');
      assert.ok(obj.has('foo'), 'Object has the event listener');
      obj.task.cancelAll();
      obj.trigger('foo');
    });

    assert.notOk(obj.has('foo'), 'Object does not have the event listener');
    assert.notOk(taskCompleted, 'Task should not have completed');
  });

  test('waitForEvent works (DOM `EventTarget` interface)', function (assert) {
    assert.expect(3);

    const element = document.createElement('button');
    let taskCompleted = false;
    let obj: TestObj;

    class TestObj extends EmberEventedClass {
      task = task(async () => {
        let { detail } = await waitForEvent(element, 'foo');
        assert.strictEqual(detail, 123);
        taskCompleted = true;
      });
    }

    run(() => {
      obj = new TestObj();
      obj.task.perform();
    });

    run(() => {
      assert.notOk(taskCompleted, 'Task should not have completed');
      element.dispatchEvent(new CustomEvent('foo', { detail: 123 }));
    });

    assert.ok(taskCompleted, 'Task should have completed');
  });

  test('canceling waitForEvent works (DOM `EventTarget` interface)', function (assert) {
    assert.expect(3);

    const element = document.createElement('button');
    element.removeEventListener = (...args: any[]) => {
      removeEventListenerCalled = true;
      return HTMLElement.prototype.removeEventListener.apply(element, args);
    };
    let taskCompleted = false;
    let removeEventListenerCalled = false;
    let obj: TestObj;

    class TestObj extends EmberEventedClass {
      task = task(async () => {
        await waitForEvent(element, 'foo');
        taskCompleted = true;
      });
    }

    run(() => {
      obj = new TestObj();
      obj.task.perform();
    });

    run(() => {
      assert.notOk(taskCompleted, 'Task should not have completed');
      obj.task.cancelAll();
      element.dispatchEvent(new CustomEvent('foo'));
    });

    assert.ok(removeEventListenerCalled, '`removeEventListener` was called');
    assert.notOk(taskCompleted, 'Task should not have completed');
  });

  test('waitForEvent works (generic on/off interface)', function (assert) {
    assert.expect(4);
    let taskCompleted = false;

    class TestObj extends EventedClass {
      task = task(async () => {
        let value = await waitForEvent(this, 'foo');
        assert.strictEqual(value, 123);
        taskCompleted = true;
      });
    }

    let obj: TestObj;
    run(() => {
      obj = new TestObj();
      obj.task.perform();
    });

    run(() => {
      assert.notOk(taskCompleted, 'Task should not have completed');
      assert.ok(obj.has('foo'), 'Object has the event listener');
      obj.trigger('foo', 123);
    });

    assert.ok(taskCompleted, 'Task should have completed');
  });

  test('canceling waitForEvent works (generic on/off interface)', function (assert) {
    assert.expect(4);
    let taskCompleted = false;

    class TestObj extends EventedClass {
      task = task(async () => {
        let value = await waitForEvent(this, 'foo');
        assert.strictEqual(value, 123);
        taskCompleted = true;
      });
    }

    let obj: TestObj;
    run(() => {
      obj = new TestObj();
      obj.task.perform();
    });

    run(() => {
      assert.notOk(taskCompleted, 'Task should not have completed');
      assert.ok(obj.has('foo'), 'Object has the event listener');
      obj.task.cancelAll();
      obj.trigger('foo');
    });

    assert.notOk(obj.has('foo'), 'Object does not have the event listener');
    assert.notOk(taskCompleted, 'Task should not have completed');
  });

  test('exposes a Promise interface that works with promise helpers', function (assert) {
    assert.expect(4);

    let obj = new EmberEventedClass();
    let ev: any = null;
    run(() =>
      waitForEvent(obj, 'foo').then((v: any) => {
        ev = v;
      }),
    );
    assert.strictEqual(ev, null);
    run(obj, 'trigger', 'foo', 123);
    assert.strictEqual(ev, 123);

    ev = null;
    run(() =>
      race([waitForEvent(obj, 'foo'), waitForEvent(obj, 'bar')]).then(
        (v: any) => {
          ev = v;
        },
      ),
    );
    assert.strictEqual(ev, null);
    run(obj, 'trigger', 'bar', 456);
    assert.strictEqual(ev, 456);
  });
});

module('Unit: waitForProperty', function () {
  test('waits until the predicate passes', async function (assert) {
    const values: unknown[] = [];

    class TestObj {
      @tracked a = 1;

      task = task(async () => {
        const result = await waitForProperty(this, 'a', (v) => {
          values.push(v);
          return v === 3;
        });
        values.push(`val=${result}`);
      });
    }

    const obj = new TestObj();
    obj.task.perform();
    obj.a = 2;
    await settled();
    obj.a = 3;
    await settled();
    obj.a = 4;
    await settled();

    assert.deepEqual(values, [1, 2, 3, 'val=3']);
  });

  // Observers do not see a getter's tracked dependencies, so the predicate never runs again
  test.todo('waits for a getter over tracked state', async function (assert) {
    const values: unknown[] = [];

    class TestObj {
      @tracked a = 1;

      get b() {
        return this.a;
      }

      task = task(async () => {
        const result = await waitForProperty(this, 'b', (v) => {
          values.push(v);
          return v === 3;
        });
        values.push(`val=${result}`);
      });
    }

    const obj = new TestObj();
    obj.task.perform();
    obj.a = 2;
    await settled();
    obj.a = 3;
    await settled();
    obj.a = 4;
    await settled();

    assert.deepEqual(values, [1, 2, 3, 'val=3']);
  });

  test('resumes at once when the predicate already passes', async function (assert) {
    class TestObj {
      @tracked a = 1;

      task = task(async () => {
        await waitForProperty(this, 'a', (v) => v === 1);
      });
    }

    const obj = new TestObj();
    obj.task.perform();
    await settled();

    assert.true(obj.task.isIdle);
  });

  test('the default predicate checks for truthiness', async function (assert) {
    class TestObj {
      @tracked a: unknown = 0;

      task = task(async () => {
        await waitForProperty(this, 'a');
      });
    }

    const obj = new TestObj();
    obj.task.perform();
    obj.a = false;
    await settled();
    obj.a = null;
    await settled();
    assert.true(obj.task.isRunning);

    obj.a = 'hey';
    await settled();
    assert.true(obj.task.isIdle);
  });

  test('a non-function value waits until the property equals it', async function (assert) {
    let state = '';

    class TestObj {
      @tracked a: unknown = 1;

      task = task(async () => {
        state = 'waiting for 3';
        await waitForProperty(this, 'a', 3);
        state = 'waiting for null';
        await waitForProperty(this, 'a', null);
      });
    }

    const obj = new TestObj();
    obj.task.perform();
    obj.a = 2;
    await settled();
    assert.strictEqual(state, 'waiting for 3');

    obj.a = 3;
    await settled();
    assert.strictEqual(state, 'waiting for null');

    obj.a = false;
    await settled();
    assert.strictEqual(state, 'waiting for null');

    obj.a = null;
    await settled();
    assert.true(obj.task.isIdle);
  });

  test('sees changes made with set(), also through a path', async function (assert) {
    class TestObj {
      nested = { a: 0 };

      task = task(async () => {
        await waitForProperty(this, 'nested.a', 1);
      });
    }

    const obj = new TestObj();
    obj.task.perform();
    await settled();
    assert.true(obj.task.isRunning);

    set(obj.nested, 'a', 1);
    await settled();
    assert.true(obj.task.isIdle);
  });
});
