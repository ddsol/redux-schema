import { type, Store } from '../../src'; //, model, optional, Nil, bare, reference, collections
import { createStore } from 'redux';
import { expect, should } from 'chai';
import { baseTypeProperties, checkProperties } from './utils';

should();

describe('Array (plain)', () => {
  var schema
    , store
    , actions
    ;

  beforeEach(() => {
    store = new Store({ schema: type([]), debug: true });
    store.store = createStore(store.reducer);
    schema = store.schema;
    actions = [];
    var origDispatch = store.dispatch;
    store.dispatch = function(action) {
      actions.push(action);
      return origDispatch(action);
    };
  });

  context('type', () => {
    checkProperties(() => schema, Object.assign({}, baseTypeProperties, {
      name: 'array',
      kind: 'array',
      storageKinds: ['array']
    }));

    it('should treat [] and Array as equivalent', () => {
      var type1 = new Store({ schema: type([]) }).schema
        , type2 = new Store({ schema: type(Array) }).schema
        , prop1
        , prop2
        ;

      for (var prop in baseTypeProperties) {
        if (prop === 'options') return;
        prop1 = type1[prop];
        prop2 = type2[prop];
        if (typeof prop1 === 'function') prop1 = String(prop1);
        if (typeof prop2 === 'function') prop2 = String(prop2);
        expect(prop1).to.deep.equal(prop2);
      }
    });
  });

  context('instance', () => {
    it('should allow empty array assignment', () => {
      store.instance = [];
      store.state.should.deep.equal([]);
    });

    it('should allow correct state assignment', () => {
      store.state = (store.state);
    });

    it('should disallow incorrect state assignment', () => {
      expect(() => store.state = 0).to.throw(TypeError);
    });

    it('should allow single item array assignment', () => {
      store.instance = [1];
      store.state.should.deep.equal([1]);
    });

    it('should allow multiple complex item array assignment', () => {
      const test = [
        {
          prop: {
            prop: 1
          }
        },
        {
          prop1: 1,
          prop2: [1, 2, 3]
        }
      ];
      store.instance = test;
      store.state.should.deep.equal(test);
      store.state.should.not.equal(test);
    });
  });

  context('methods', () => {
    context('#concat', () => {
      it('should return a new array', () => {
        store.instance.should.not.equal(store.instance.concat());
        actions.should.have.length(0);
      });

      it('should add all arguments when they are not arrays', () => {
        store.state = [1, 2, 3];
        store.instance.concat(4, 5).should.deep.equal([1, 2, 3, 4, 5]);
      });

      it('should concatenate all arguments when they are arrays', () => {
        store.state = [1, 2, 3];
        store.instance.concat([4, 5], [6, 7]).should.deep.equal([1, 2, 3, 4, 5, 6, 7]);
      });
    });

    context('#copyWithin', () => {
      it('should return the same array instance', () => {
        var before = store.instance
          , result = store.instance.copyWithin(4, 5)
          ;
        before.should.equal(result);
        before.should.equal(store.instance);
        actions.should.deep.equal([{ type: 'COPY_WITHIN', args: [4, 5], path: ['copyWithin'] }]);
      });

      it('should copy internal items forward', () => {
        store.state = [1, 2, 3, 4, 5, 6, 7];
        store.instance.copyWithin(3, 0, 2);
        store.state.should.deep.equal([1, 2, 3, 1, 2, 6, 7]);
      });

      it('should not copy past the end', () => {
        store.state = [1, 2, 3, 4, 5, 6, 7];
        store.instance.copyWithin(5, 0, 3);
        store.state.should.deep.equal([1, 2, 3, 4, 5, 1, 2]);
      });

      it('should count negative indices from the end', () => {
        store.state = [1, 2, 3, 4, 5, 6, 7];
        store.instance.copyWithin(-4, -2, -1);
        store.state.should.deep.equal([1, 2, 3, 6, 5, 6, 7]);
      });
    });

    context('#every', () => {
      it('should not mutate the array', () => {
        var pre = store.state;
        store.instance.every(()=> {
          //
        });
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should break when the condition fails', () => {
        var count = 0;
        store.state = [true, true, false, false];
        store.instance.every((item) => {
          count++;
          return item;
        });
        count.should.equal(3);
      });

      it('should return true when the condition is truthy for all items', () => {
        var count = 0;
        store.state = [true, 1, 'yes', {}, []];
        store.instance.every((item) => {
          count++;
          return item;
        }).should.equal(true);
        count.should.equal(5);
      });

      it('should invoke the callback with 3 arguments', () => {
        var count = 0;
        store.state = [1];
        store.instance.every((first, second, third, ...rest) => {
          count++;
          first.should.equal(1);
          second.should.equal(0);
          third.should.equal(store.instance);
          rest.should.have.length(0);
        });
        count.should.equal(1);
      });

      it('should pass along the thisArg parameter', () => {
        var count   = 0
          , thisArg = {}
          ;
        store.state = [1];
        store.instance.every(function() {
          count++;
          this.should.equal(thisArg);
        }, thisArg);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        var count = 0;
        store.state = [1, 2, 3, 4, 5];
        store.instance.every(function() {
          if (count < 2) {
            store.instance.push(1);
          }
          count++;
          return true;
        });
        count.should.equal(5);
        store.state.should.deep.equal([1, 2, 3, 4, 5, 1, 1]);
        actions.should.have.length(3);
      });
    });

    context('#fill', () => {
      it('should return the same array instance', () => {
        var before = store.instance
          , result = store.instance.fill(4, 5, 6)
          ;
        before.should.equal(result);
        before.should.equal(store.instance);
        actions.should.deep.equal([{ type: 'FILL', args: [4, 5, 6], path: ['fill'] }]);
      });

      it('should fill an entire array when no indices passed', () => {
        store.state = [1, 2, 3, 4];
        store.instance.fill(7);
        store.state.should.deep.equal([7, 7, 7, 7]);
        actions.should.have.length(2);
      });

      it('should fill from start when a start is passed', () => {
        store.state = [1, 2, 3, 4];
        store.instance.fill(7, 2);
        store.state.should.deep.equal([1, 2, 7, 7]);
        actions.should.have.length(2);
      });

      it('should fill from start to end when both are passed', () => {
        store.state = [1, 2, 3, 4, 5, 6];
        store.instance.fill(7, 2, 4);
        store.state.should.deep.equal([1, 2, 7, 7, 5, 6]);
        actions.should.have.length(2);
      });

      it('should count negative indices from the end', () => {
        store.state = [1, 2, 3, 4, 5, 6];
        store.instance.fill(7, -5, -3);
        store.state.should.deep.equal([1, 7, 7, 4, 5, 6]);
        actions.should.have.length(2);
      });
    });

    context('#filter', () => {
      it('should not mutate the array', () => {
        var pre = store.state;
        store.instance.filter(()=> {
          //
        });
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should not include items for which the condition fails', () => {
        var count = 0;
        store.state = [0, 2, 1, 3, 4, 5, 7, 9];
        store.instance.filter((item) => {
          count++;
          return item % 2;
        }).should.deep.equal([1, 3, 5, 7, 9]);
        count.should.equal(8);
      });

      it('should invoke the callback with 3 arguments', () => {
        var count = 0;
        store.state = [1];
        store.instance.filter((first, second, third, ...rest) => {
          count++;
          first.should.equal(1);
          second.should.equal(0);
          third.should.equal(store.instance);
          rest.should.have.length(0);
        });
        count.should.equal(1);
      });

      it('should pass along the thisArg parameter', () => {
        var count   = 0
          , thisArg = {}
          ;
        store.state = [1];
        store.instance.filter(function() {
          count++;
          this.should.equal(thisArg);
        }, thisArg);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        var count = 0;
        store.state = [1, 2, 3, 4, 5];
        store.instance.filter(function() {
          if (count < 2) {
            store.instance.push(7);
          }
          count++;
          return true;
        }).should.deep.equal([1, 2, 3, 4, 5]);
        count.should.equal(5);
        store.state.should.deep.equal([1, 2, 3, 4, 5, 7, 7]);
        actions.should.have.length(3);
      });
    });

    context('#find', () => {
      it('should not mutate the array', () => {
        var pre = store.state;
        store.instance.find(()=> {
          //
        });
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should find the item for which the condition holds', () => {
        var count = 0;

        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }];
        store.instance.find((item) => {
          count++;
          return item.get('v') === 3;
        }).should.equal(store.instance.get(2));
        count.should.equal(3);
      });

      it('should invoke the callback with 3 arguments', () => {
        var count = 0;
        store.state = [1];
        store.instance.find((first, second, third, ...rest) => {
          count++;
          first.should.equal(1);
          second.should.equal(0);
          third.should.equal(store.instance);
          rest.should.have.length(0);
        });
        count.should.equal(1);
      });

      it('should pass along the thisArg parameter', () => {
        var count   = 0
          , thisArg = {}
          ;
        store.state = [1];
        store.instance.find(function() {
          count++;
          this.should.equal(thisArg);
        }, thisArg);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        var count = 0;
        store.state = [1, 2, 3, 4, 5];
        expect(store.instance.find(function(item) {
          if (count < 2) {
            store.instance.push(7);
          }
          count++;
          return item === 7;
        })).to.be.undefined;
        count.should.equal(5);
        store.state.should.deep.equal([1, 2, 3, 4, 5, 7, 7]);
        actions.should.have.length(3);
      });
    });

    context('#findIndex', () => {
      it('should not mutate the array', () => {
        var pre = store.state;
        store.instance.findIndex(()=> {
          //
        });
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should find the item for which the condition holds', () => {
        var count = 0;

        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }];
        store.instance.findIndex((item) => {
          count++;
          return item.get('v') === 3;
        }).should.equal(2);
        count.should.equal(3);
      });

      it('should invoke the callback with 3 arguments', () => {
        var count = 0;
        store.state = [1];
        store.instance.findIndex((first, second, third, ...rest) => {
          count++;
          first.should.equal(1);
          second.should.equal(0);
          third.should.equal(store.instance);
          rest.should.have.length(0);
        });
        count.should.equal(1);
      });

      it('should pass along the thisArg parameter', () => {
        var count   = 0
          , thisArg = {}
          ;
        store.state = [1];
        store.instance.findIndex(function() {
          count++;
          this.should.equal(thisArg);
        }, thisArg);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        var count = 0;
        store.state = [1, 2, 3, 4, 5];
        expect(store.instance.findIndex(function(item) {
          if (count < 2) {
            store.instance.push(7);
          }
          count++;
          return item === 7;
        })).to.be.undefined;
        count.should.equal(5);
        store.state.should.deep.equal([1, 2, 3, 4, 5, 7, 7]);
        actions.should.have.length(3);
      });
    });

    context('#forEach', () => {
      it('should not mutate the array', () => {
        var pre = store.state;
        expect(store.instance.forEach(()=> {
          //
        })).to.be.undefined;
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should call for each item', () => {
        var count = 0
          , input = [true, 1, 'yes', false, 0, '']
          ;
        store.state = input;
        store.instance.forEach((item) => {
          count++;
          item.should.equal(input[count - 1]);
        });
        count.should.equal(6);
      });

      it('should invoke the callback with 3 arguments', () => {
        var count = 0;
        store.state = [1];
        store.instance.forEach((first, second, third, ...rest) => {
          count++;
          first.should.equal(1);
          second.should.equal(0);
          third.should.equal(store.instance);
          rest.should.have.length(0);
        });
        count.should.equal(1);
      });

      it('should pass along the thisArg parameter', () => {
        var count   = 0
          , thisArg = {}
          ;
        store.state = [1];
        store.instance.forEach(function() {
          count++;
          this.should.equal(thisArg);
        }, thisArg);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        var count = 0;
        store.state = [1, 2, 3, 4, 5];
        store.instance.forEach(function() {
          if (count < 2) {
            store.instance.push(1);
          }
          count++;
        });
        count.should.equal(5);
        store.state.should.deep.equal([1, 2, 3, 4, 5, 1, 1]);
        actions.should.have.length(3);
      });
    });

    context('#includes', () => {
      it('should not mutate the array', () => {
        var pre = store.state;
        store.instance.includes(12).should.be.false;
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should not find a missing simple item', () => {
        store.state = [1, 2, 3, 4, 5];
        store.instance.includes(7).should.be.false;
      });

      it('should not find a an undefined when only a null present', () => {
        store.state = [1, 2, null, 4, 5];
        store.instance.includes(undefined).should.be.false;
      });

      it('should not find a a null when only an undefined present', () => {
        store.state = [1, 2, undefined, 4, 5];
        store.instance.includes(null).should.be.false;
      });

      it('should find a simple item when present', () => {
        store.state = [1, 2, 3, 4, 5];
        store.instance.includes(4).should.be.true;
      });

      it('should find an undefined when present', () => {
        store.state = [1, 2, undefined, 4, 5];
        store.instance.includes(undefined).should.be.true;
      });

      it('should find a null when present', () => {
        store.state = [1, 2, 3, 4, null];
        store.instance.includes(null).should.be.true;
      });

      it('should find a NaN', () => {
        store.state = [1, 2, 3, NaN, 5];
        store.instance.includes(NaN).should.be.true;
      });

      it('should find a complex type', () => {
        store.state = [{}, {}, {}, {}, {}];
        var toFind = store.instance.get(3);
        store.instance.includes(toFind).should.be.true;
      });

      it('should begin searching from start when start is positive', () => {
        store.state = [1, 2, 3];
        store.instance.includes(2, 2).should.be.false;
      });

      it('should  begin searching relative to end when start is negative', () => {
        store.state = [1, 2, 3];
        store.instance.includes(2, -1).should.be.false;
      });
    });

    context('#indexOf', () => {
      it('should not mutate the array', () => {
        var pre = store.state;
        store.instance.indexOf(12).should.equal(-1);
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should not find a missing simple item', () => {
        store.state = [1, 2, 3, 4, 5];
        store.instance.indexOf(7).should.equal(-1);
      });

      it('should not find a an undefined when only a null present', () => {
        store.state = [1, 2, null, 4, 5];
        store.instance.indexOf(undefined).should.equal(-1);
      });

      it('should not find a a null when only an undefined present', () => {
        store.state = [1, 2, undefined, 4, 5];
        store.instance.indexOf(null).should.equal(-1);
      });

      it('should not find any NaN', () => {
        store.state = [1, 2, 3, NaN, 5];
        store.instance.indexOf(NaN).should.equal(-1);
      });

      it('should find a simple item when present', () => {
        store.state = [1, 2, 3, 4, 5];
        store.instance.indexOf(4).should.equal(3);
      });

      it('should find an undefined when present', () => {
        store.state = [1, 2, undefined, 4, 5];
        store.instance.indexOf(undefined).should.equal(2);
      });

      it('should find a null when present', () => {
        store.state = [1, 2, 3, 4, null];
        store.instance.indexOf(null).should.equal(4);
      });

      it('should find a complex type', () => {
        store.state = [{}, {}, {}, {}, {}];
        var toFind = store.instance.get(3);
        store.instance.indexOf(toFind).should.equal(3);
      });

      it('should begin searching from start when start is positive', () => {
        store.state = [1, 2, 3, 1, 2, 3];
        store.instance.indexOf(2, 2).should.equal(4);
      });

      it('should  begin searching relative to end when start is negative', () => {
        store.state = [1, 2, 3, 1, 2, 3];
        store.instance.indexOf(2, -4).should.equal(4);
      });
    });

    context('#join', () => {
      it('should not mutate the array', () => {
        var pre = store.state;
        store.instance.join().should.equal('');
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should default to \',\' separator', () => {
        store.state = [1, 2, 3];
        store.instance.join().should.equal('1,2,3');
      });

      it('should accept a separator', () => {
        store.state = [1, 2, 3];
        store.instance.join(7).should.equal('17273');
      });

      it('should turn null and undefined into the empty string', () => {
        store.state = [1, null, 2, undefined, 3];
        store.instance.join().should.equal('1,,2,,3');
      });

      it('should allow an empty separator', () => {
        store.state = [1, 2, 3];
        store.instance.join('').should.equal('123');
      });
    });

    context('#lastIndexOf', () => {
      it('should not mutate the array', () => {
        var pre = store.state;
        store.instance.lastIndexOf(12).should.equal(-1);
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should not find a missing simple item', () => {
        store.state = [1, 2, 3, 4, 5];
        store.instance.lastIndexOf(7).should.equal(-1);
      });

      it('should not find a an undefined when only a null present', () => {
        store.state = [1, 2, null, 4, 5];
        store.instance.lastIndexOf(undefined).should.equal(-1);
      });

      it('should not find a a null when only an undefined present', () => {
        store.state = [1, 2, undefined, 4, 5];
        store.instance.lastIndexOf(null).should.equal(-1);
      });

      it('should not find any NaN', () => {
        store.state = [1, 2, 3, NaN, 5];
        store.instance.lastIndexOf(NaN).should.equal(-1);
      });

      it('should find a simple item when present', () => {
        store.state = [1, 2, 3, 4, 5];
        store.instance.lastIndexOf(4).should.equal(3);
      });

      it('should find an undefined when present', () => {
        store.state = [1, 2, undefined, 4, 5];
        store.instance.lastIndexOf(undefined).should.equal(2);
      });

      it('should find a null when present', () => {
        store.state = [1, 2, 3, 4, null];
        store.instance.lastIndexOf(null).should.equal(4);
      });

      it('should find a complex type', () => {
        store.state = [{}, {}, {}, {}, {}];
        var toFind = store.instance.get(3);
        store.instance.lastIndexOf(toFind).should.equal(3);
      });

      it('should begin searching from start when start is positive', () => {
        store.state = [1, 2, 3, 1, 2, 3];
        store.instance.lastIndexOf(2, 3).should.equal(1);
      });

      it('should  begin searching relative to end when start is negative', () => {
        store.state = [1, 2, 3, 1, 2, 3];
        store.instance.lastIndexOf(2, -4).should.equal(1);
      });
    });

    context('#map', () => {
      it('should not mutate the array', () => {
        var pre = store.state;
        expect(store.instance.map(()=> {
          //
        })).to.deep.equal([]);
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should map each item', () => {
        var input  = [true, 1, 'yes', false, 0, '']
          , mapper = (item, ix) => {
              item.should.equal(input[ix]);
              return { v: item };
            }
          , mapped = input.map(mapper)
          ;
        store.state = input;
        store.instance.map(mapper).should.deep.equal(mapped);
      });

      it('should invoke the callback with 3 arguments', () => {
        var count = 0;
        store.state = [1];
        store.instance.map((first, second, third, ...rest) => {
          count++;
          first.should.equal(1);
          second.should.equal(0);
          third.should.equal(store.instance);
          rest.should.have.length(0);
        });
        count.should.equal(1);
      });

      it('should pass along the thisArg parameter', () => {
        var count   = 0
          , thisArg = {}
          ;
        store.state = [1];
        store.instance.map(function() {
          count++;
          this.should.equal(thisArg);
        }, thisArg);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        var count = 0;
        store.state = [1, 2, 3, 4, 5];
        store.instance.map(function() {
          if (count < 2) {
            store.instance.push(1);
          }
          count++;
        });
        count.should.equal(5);
        store.state.should.deep.equal([1, 2, 3, 4, 5, 1, 1]);
        actions.should.have.length(3);
      });
    });

    context('#pop', () => {
      it('should mutate the array', () => {
        store.state = [1, 2, 3];
        var pre = store.state;
        store.instance.pop().should.equal(3);
        actions.should.have.length(2);
        store.state.should.not.equal(pre);
      });

      it('should return the last element and modify the original array', () => {
        store.state = [17, 18, 4, 7];
        store.instance.pop().should.equal(7);
        store.instance.should.have.length(3);
        store.instance.pop().should.equal(4);
        store.instance.should.have.length(2);
        store.state.should.deep.equal([17, 18]);
      });

      it('should return undefined when there are no elements', () => {
        store.state = [];
        expect(store.instance.pop()).to.be.undefined;
        store.state.should.deep.equal([]);
      });
    });

    context('#push', () => {
      it('should mutate the array', () => {
        var pre = store.state;
        store.instance.push(1).should.equal(1);
        actions.should.have.length(1);
        store.state.should.not.equal(pre);
      });

      it('should add all passed elements to the array', () => {
        store.state = ['a', 'b'];
        store.instance.push(3, 4, 5, 6);
        store.state.should.deep.equal(['a', 'b', 3, 4, 5, 6]);
      });

      it('should not flatten passed arrays', () => {
        store.state = ['a', 'b'];
        store.instance.push([3, 4], [5, 6]);
        store.state.should.deep.equal(['a', 'b', [3, 4], [5, 6]]);
      });

      it('should return the new length of the array', () => {
        store.state = ['a', 'b'];
        store.instance.push(3, 4, 5, 6).should.equal(6);
      });
    });

    context('#reduce', () => {
      it('should not mutate the array', () => {
        var pre = store.state;
        expect(store.instance.reduce(()=> {
          //
        }, 0)).to.equal(0);
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should reduce each item without initial value', () => {
        store.state = [2, 5, 3, 6, 9];
        store.instance.reduce((prev, cur) => prev * 10 + cur).should.equal(25369);
      });

      it('should reduce each item with initial value', () => {
        store.state = [2, 5, 3, 6, 9];
        store.instance.reduce((prev, cur) => prev * 10 + cur, 77).should.equal(7725369);
      });

      it('should invoke the callback with 4 arguments', () => {
        var count = 0;
        store.state = [1];
        store.instance.reduce((first, second, third, fourth, ...rest) => {
          count++;
          first.should.equal(7);
          second.should.equal(1);
          third.should.equal(0);
          fourth.should.equal(store.instance);
          rest.should.have.length(0);
        }, 7);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        var count = 0;
        store.state = [0, 0, 0, 0, 0];
        store.instance.reduce(function(prev, cur) {
          if (count < 2) {
            store.instance.push(1);
          }
          count++;
          return prev + cur;
        }).should.equal(0);
        count.should.equal(4);
        store.state.should.deep.equal([0, 0, 0, 0, 0, 1, 1]);
        actions.should.have.length(3);
      });
    });

    context('#reduceRight', () => {
      it('should not mutate the array', () => {
        var pre = store.state;
        expect(store.instance.reduceRight(()=> {
          //
        }, 0)).to.equal(0);
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should reduce each item without initial value', () => {
        store.state = [2, 5, 3, 6, 9];
        store.instance.reduceRight((prev, cur) => prev * 10 + cur).should.equal(96352);
      });

      it('should reduce each item with initial value', () => {
        store.state = [2, 5, 3, 6, 9];
        store.instance.reduceRight((prev, cur) => prev * 10 + cur, 77).should.equal(7796352);
      });

      it('should invoke the callback with 4 arguments', () => {
        var count = 0;
        store.state = [1];
        store.instance.reduceRight((first, second, third, fourth, ...rest) => {
          count++;
          first.should.equal(7);
          second.should.equal(1);
          third.should.equal(0);
          fourth.should.equal(store.instance);
          rest.should.have.length(0);
        }, 7);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        var count = 0;
        store.state = [0, 0, 0, 0, 0];
        store.instance.reduceRight(function(prev, cur) {
          if (count < 2) {
            store.instance.push(1);
          }
          count++;
          return prev + cur;
        }).should.equal(0);
        count.should.equal(4);
        store.state.should.deep.equal([0, 0, 0, 0, 0, 1, 1]);
        actions.should.have.length(3);
      });
    });

    context('#reverse', () => {
      it('should not mutate the array if it has no items, but should dispatch', () => {
        var pre = store.state;
        store.instance.reverse();
        actions.should.have.length(1);
        store.state.should.equal(pre);
      });

      it('should mutate the array if it has items', () => {
        store.state = [1, 2, 3];
        var pre = store.state;
        store.instance.reverse();
        actions.should.have.length(2);
        store.state.should.not.equal(pre);
      });

      it('should reverse the array in place and return the array', () => {
        store.state = [1, 2, 3, 8, 7];
        store.instance.reverse().should.equal(store.instance);
        store.state.should.deep.equal([7, 8, 3, 2, 1]);
      });
    });

    context('#shift', () => {
      it('should mutate the array', () => {
        store.state = [1, 2, 3];
        var pre = store.state;
        store.instance.shift().should.equal(1);
        actions.should.have.length(2);
        store.state.should.not.equal(pre);
      });

      it('should return the last element and modify the original array', () => {
        store.state = [17, 18, 4, 7];
        store.instance.shift().should.equal(17);
        store.instance.should.have.length(3);
        store.instance.shift().should.equal(18);
        store.instance.should.have.length(2);
        store.state.should.deep.equal([4, 7]);
      });

      it('should return undefined when there are no elements', () => {
        store.state = [];
        expect(store.instance.shift()).to.be.undefined;
        store.state.should.deep.equal([]);
      });
    });

    context('#slice', () => {
      it('should not mutate the array', () => {
        store.state = [1, 2, 3];
        var pre = store.state;
        store.instance.slice();
        actions.should.have.length(1);
        store.state.should.equal(pre);
      });

      it('should return a shallow copy of the array with no params', () => {
        store.state = [1, 2, 3];
        store.instance.slice().should.deep.equal([1, 2, 3]);
      });

      it('should return a slice from start to the end of the array when 1 param passed', () => {
        store.state = [1, 2, 3, 4, 5, 6];
        store.instance.slice(2).should.deep.equal([3, 4, 5, 6]);
      });

      it('should return a slice from start to end with 2 params', () => {
        store.state = [1, 2, 3, 4, 5, 6];
        store.instance.slice(2, 5).should.deep.equal([3, 4, 5]);
      });

      it('should accept negative parameters to mean from the end', () => {
        store.state = [1, 2, 3, 4, 5, 6];
        store.instance.slice(-4, -2).should.deep.equal([3, 4]);
      });

      it('should return references to objects', () => {
        store.state = [{}, {}, {}, {}, {}, {}];
        store.instance.slice(1, 4)[1].should.equal(store.instance.get(2));
      });
    });

    context('#some', () => {
      it('should not mutate the array', () => {
        var pre = store.state;
        store.instance.some(()=> {
          //
        });
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should break when the condition passes', () => {
        var count = 0;
        store.state = [false, true, false, false];
        store.instance.some((item) => {
          count++;
          return item;
        });
        count.should.equal(2);
      });

      it('should return false when the condition is falsy for all items', () => {
        var count = 0;
        store.state = [false, 0, '', null, undefined];
        store.instance.some((item) => {
          count++;
          return item;
        }).should.equal(false);
        count.should.equal(5);
      });

      it('should invoke the callback with 3 arguments', () => {
        var count = 0;
        store.state = [1];
        store.instance.some((first, second, third, ...rest) => {
          count++;
          first.should.equal(1);
          second.should.equal(0);
          third.should.equal(store.instance);
          rest.should.have.length(0);
        });
        count.should.equal(1);
      });

      it('should pass along the thisArg parameter', () => {
        var count   = 0
          , thisArg = {}
          ;
        store.state = [1];
        store.instance.some(function() {
          count++;
          this.should.equal(thisArg);
        }, thisArg);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        var count = 0;
        store.state = [1, 2, 3, 4, 5];
        store.instance.some(function() {
          if (count < 2) {
            store.instance.push(1);
          }
          count++;
          return false;
        });
        count.should.equal(5);
        store.state.should.deep.equal([1, 2, 3, 4, 5, 1, 1]);
        actions.should.have.length(3);
      });
    });

    context('#sort', () => {
      it('should mutate the array', () => {
        store.state = [7, 2, 4];
        var pre = store.state;
        store.instance.sort();
        actions.should.have.length(2);
        store.state.should.not.equal(pre);
      });

      it('should by default put undefined at the end', () => {
        store.state = [7, 2, undefined, 'z', 4];
        store.instance.sort();
        store.state.should.deep.equal([2, 4, 7, 'z', undefined]);
      });

      it('should by default sort in string order', () => {
        store.state = [7, null, 'm', 2, undefined, 'z', 4];
        store.instance.sort();
        store.state.should.deep.equal([2, 4, 7, 'm', null, 'z', undefined]);
      });

      it('should sort using a custom compare function', () => {
        store.state = [7, null, 'm', 2, undefined, 'z', 4];
        store.instance.sort((a, b) => {
          a = String(a).split('').reverse().join('');
          b = String(b).split('').reverse().join('');
          if (a < b) return 1;
          if (a > b) return -1;
          return 0;
        });
        store.state.should.deep.equal(['z', 'm', null, 7, 4, 2, undefined]);
      });
    });

    context('#splice', () => {
      it('should mutate the array', () => {
        store.state = [7, 2, 4];
        var pre = store.state;
        store.instance.splice(1, 1, 8);
        actions.should.have.length(2);
        store.state.should.not.equal(pre);
      });

      it('should delete items using a positive start', () => {
        store.state = [7, 2, 4, 1, 5, 3];
        store.instance.splice(1, 2);
        store.state.should.deep.equal([7, 1, 5, 3]);
      });

      it('should delete items offset from the end using a negative start', () => {
        store.state = [7, 2, 4, 1, 5, 3];
        store.instance.splice(-4, 2);
        store.state.should.deep.equal([7, 2, 5, 3]);
      });

      it('should insert items using a positive start', () => {
        store.state = [7, 2, 4, 1, 5, 3];
        store.instance.splice(3, 0, 8, 9, 10);
        store.state.should.deep.equal([7, 2, 4, 8, 9, 10, 1, 5, 3]);
      });

      it('should insert items offset from the end using a negative start', () => {
        store.state = [7, 2, 4, 1, 5, 3];
        store.instance.splice(-2, 0, 8, 9, 10);
        store.state.should.deep.equal([7, 2, 4, 1, 8, 9, 10, 5, 3]);
      });

      it('should not flatten arrays when inserting', () => {
        store.state = [7, 2, 4, 1, 5, 3];
        store.instance.splice(3, 0, [8, 9], [10]);
        store.state.should.deep.equal([7, 2, 4, [8, 9], [10], 1, 5, 3]);
      });

      it('should delete and add items in the same call', () => {
        store.state = [7, 2, 4, 1, 5, 3];
        store.instance.splice(3, 2, 8, 9, 10);
        store.state.should.deep.equal([7, 2, 4, 8, 9, 10, 3]);
      });

      it('should not save items directly to the state', () => {
        var obj = { v: 1 };
        store.state = [7, 2, 4, 1, 5, 3];
        store.instance.splice(3, 0, obj);
        store.state.should.deep.equal([7, 2, 4, obj, 1, 5, 3]);
        store.state[3].should.deep.equal(obj);
        store.state[3].should.not.equal(obj);
      });
    });

    context('#toLocaleString', () => {
      it('should not mutate the array', () => {
        var pre = store.state;
        store.instance.toLocaleString();
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should return the locale string version of the array', () => {
        var input = [1337.1337, {}, [], 'Hello world', true];
        store.state = input;
        store.instance.toLocaleString().should.equal(input.toLocaleString());
      });
    });

    context('#toString', () => {
      it('should not mutate the array', () => {
        var pre = store.state;
        store.instance.toString();
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should return the stringified version of the array', () => {
        var input = [1337.1337, {}, [], 'Hello world', true];
        store.state = input;
        store.instance.toString().should.equal(input.toString());
      });
    });

    context('#unshift', () => {
      it('should mutate the array', () => {
        var pre = store.state;
        store.instance.unshift(1).should.equal(1);
        actions.should.have.length(1);
        store.state.should.not.equal(pre);
      });

      it('should add all passed elements to the array', () => {
        store.state = ['a', 'b'];
        store.instance.unshift(3, 4, 5, 6);
        store.state.should.deep.equal([3, 4, 5, 6, 'a', 'b']);
      });

      it('should not flatten passed arrays', () => {
        store.state = ['a', 'b'];
        store.instance.unshift([3, 4], [5, 6]);
        store.state.should.deep.equal([[3, 4], [5, 6], 'a', 'b']);
      });

      it('should return the new length of the array', () => {
        store.state = ['a', 'b'];
        store.instance.unshift(3, 4, 5, 6).should.equal(6);
      });
    });

    context('#valueOf', () => {
      it('should not mutate the array', () => {
        var pre = store.state;
        store.instance.valueOf();
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should return the stringified version of the array', () => {
        var input = [1337.1337, {}, [], 'Hello world', true];
        store.state = input;
        store.instance.valueOf().should.deep.equal(input.valueOf());
      });
    });
  });

  context('properties', () => {
    context('.length', () => {
      it('should retrieve the length of the array', () => {
        store.state = [1, 2, 3];
        store.instance.should.have.length(3);
        store.state = [1, 2, 3, 4, 5, 6, 7];
        store.instance.should.have.length(7);
      });

      it('should get length through get function', () => {
        store.state = [1, 2, 3];
        store.instance.get('length').should.equal(3);
      });

      it('should mutate the array when set', () => {
        store.state = [1, 2, 3];
        var pre = store.state;
        store.instance.length = 3;
        store.state.should.not.equal(pre);
        actions.should.have.length(2);
      });

      it('should set length through set function', () => {
        store.state = [1, 2, 3];
        store.instance.set('length', 2);
        store.state.should.deep.equal([1, 2]);
      });

      it('should trim the array when set to a lower value', () => {
        store.state = [1, 2, 3];
        store.instance.length = 2;
        store.state.should.deep.equal([1, 2]);
        store.state = [1, 2, 3, 4, 5, 6, 7];
        store.instance.length = 5;
        store.state.should.deep.equal([1, 2, 3, 4, 5]);
      });

      it('should extend the array when set to a higher value', () => {
        store.state = [1, 2, 3];
        store.instance.length = 5;
        store.state.should.deep.equal([1, 2, 3, undefined, undefined]);
        store.state = [1, 2, 3, 4, 5, 6, 7];
        store.instance.length = 11;
        store.state.should.deep.equal([1, 2, 3, 4, 5, 6, 7, undefined, undefined, undefined, undefined]);
      });
    });

    context('#get', () => {
      it('should not mutate the array', () => {
        var pre = store.state;
        store.instance.get(0);
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should get elements from the array', () => {
        store.state = [1, 2, 3, 4];
        store.instance.get(2).should.equal(3);
      });

      it('should return undefined for items that don\'t exist', () => {
        store.state = [1, 2, 3, 4];
        expect(store.instance.get(7)).to.be.undefined;
        expect(store.instance.get(-10)).to.be.undefined;
        expect(store.instance.get()).to.be.undefined;
        expect(store.instance.get('missing')).to.be.undefined;
      });
    });

    context('#set', () => {
      it('should mutate the array', () => {
        var pre = store.state;
        store.instance.set(0, 3);
        actions.should.have.length(1);
        store.state.should.not.equal(pre);
      });

      it('should set elements in the array', () => {
        store.state = [1, 2, 3, 4];
        store.instance.set(2, 8);
        store.state.should.deep.equal([1, 2, 8, 4]);
      });

      it('should extend the array when setting at high index', () => {
        store.state = [1, 2, 3, 4];
        store.instance.set(7, 8);
        store.state.should.deep.equal([1, 2, 3, 4, undefined, undefined, undefined, 8]);
      });

      it('should fail for non-natural number properties', () => {
        store.state = [1, 2, 3, 4];
        expect(()=>store.instance.set(-10, 5)).to.throw(TypeError);
        expect(()=>store.instance.set(undefined, 5)).to.throw(TypeError);
        expect(()=>store.instance.set('missing', 5)).to.throw(TypeError);
      });
    });
  });
});
