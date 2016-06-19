import schemaStore, { type } from '../../src';
import { createStore } from 'redux';
import { expect, should } from 'chai';
import { baseTypeProperties, checkProperties } from './utils';

should();

describe('Array (defined)', () => {
  let schema
    , store
    , actions
    ;

  beforeEach(() => {
    store = schemaStore(type([{ v: Number }]), { debug: true }, createStore);
    schema = store.schema;
    actions = [];
    let origDispatch = store.dispatch;
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

    it('should fail an incorrect item assignment', () => {
      expect(()=>store.instance = [1]).to.throw(TypeError);
      expect(()=>store.instance = [{}]).to.throw(TypeError);
    });

    it('should allow single item array assignment', () => {
      store.instance = [{ v: 1 }];
      store.state.should.deep.equal([{ v: 1 }]);
    });

    it('should allow multiple item array assignment', () => {
      const test = [
        { v: 1 },
        { v: 2 }
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
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }];
        store.instance.concat(1, 2).map(v => v.toObject ? v.toObject() : v).should.deep.equal([{ v: 1 }, { v: 2 }, { v: 3 }, 1, 2]);
      });

      it('should concatenate all arguments when they are arrays', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }];
        store.instance.concat([1, 2], [3, 4]).map(v => v.toObject ? v.toObject() : v).should.deep.equal([
          { v: 1 },
          { v: 2 },
          { v: 3 },
          1,
          2,
          3,
          4
        ]);
      });
    });

    context('#copyWithin', () => {
      it('should return the same array instance', () => {
        let before = store.instance
          , result = store.instance.copyWithin(4, 5)
          ;
        before.should.equal(result);
        before.should.equal(store.instance);
        actions.should.deep.equal([{ type: 'COPY_WITHIN', args: [4, 5], path: ['copyWithin'] }]);
      });

      it('should copy internal items forward', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        store.instance.copyWithin(3, 0, 2);
        store.state.should.deep.equal([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 1 }, { v: 2 }, { v: 6 }, { v: 7 }]);
      });

      it('should not copy past the end', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        store.instance.copyWithin(5, 0, 3);
        store.state.should.deep.equal([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 1 }, { v: 2 }]);
      });

      it('should count negative indices from the end', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        store.instance.copyWithin(-4, -2, -1);
        store.state.should.deep.equal([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 6 }, { v: 5 }, { v: 6 }, { v: 7 }]);
      });
    });

    context('#every', () => {
      it('should not mutate the array', () => {
        let pre = store.state;
        store.instance.every(()=> {
          //
        });
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should break when the condition fails', () => {
        let count = 0;
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        store.instance.every((item) => {
          count++;
          return item.v < 4;
        });
        count.should.equal(4);
      });

      it('should return true when the condition is truthy for all items', () => {
        let count = 0;
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }];
        store.instance.every((item) => {
          count++;
          return item;
        }).should.equal(true);
        count.should.equal(5);
      });

      it('should invoke the callback with 3 arguments', () => {
        let count = 0;
        store.state = [{ v: 1 }];
        store.instance.every((first, second, third, ...rest) => {
          count++;
          first.toObject().should.deep.equal({ v: 1 });
          second.should.equal(0);
          third.should.equal(store.instance);
          rest.should.have.length(0);
        });
        count.should.equal(1);
      });

      it('should pass along the thisArg parameter', () => {
        let count   = 0
          , thisArg = {}
          ;
        store.state = [{ v: 1 }];
        store.instance.every(function() {
          count++;
          this.should.equal(thisArg);
        }, thisArg);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        let count = 0;
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }];
        store.instance.every(function() {
          if (count < 2) {
            store.instance.push({ v: 1 });
          }
          count++;
          return true;
        });
        count.should.equal(5);
        store.state.should.deep.equal([
          { v: 1 },
          { v: 2 },
          { v: 3 },
          { v: 4 },
          { v: 5 },
          { v: 1 },
          { v: 1 }
        ]);
        actions.should.have.length(3);
      });
    });

    context('#fill', () => {
      it('should return the same array instance', () => {
        let before = store.instance
          , result = store.instance.fill(4, 5, 6)
          ;
        before.should.equal(result);
        before.should.equal(store.instance);
        actions.should.deep.equal([{ type: 'FILL', args: [4, 5, 6], path: ['fill'] }]);
      });

      it('should fill an entire array when no indices passed', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }];
        store.instance.fill({ v: 7 });
        store.state.should.deep.equal([{ v: 7 }, { v: 7 }, { v: 7 }, { v: 7 }]);
        actions.should.have.length(2);
      });

      it('should fill from start when a start is passed', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }];
        store.instance.fill({ v: 7 }, 2);
        store.state.should.deep.equal([{ v: 1 }, { v: 2 }, { v: 7 }, { v: 7 }]);
        actions.should.have.length(2);
      });

      it('should fill from start to end when both are passed', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }];
        store.instance.fill({ v: 7 }, 2, 4);
        store.state.should.deep.equal([{ v: 1 }, { v: 2 }, { v: 7 }, { v: 7 }, { v: 5 }, { v: 6 }]);
        actions.should.have.length(2);
      });

      it('should count negative indices from the end', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }];
        store.instance.fill({ v: 7 }, -5, -3);
        store.state.should.deep.equal([{ v: 1 }, { v: 7 }, { v: 7 }, { v: 4 }, { v: 5 }, { v: 6 }]);
        actions.should.have.length(2);
      });
    });

    context('#filter', () => {
      it('should not mutate the array', () => {
        let pre = store.state;
        store.instance.filter(()=> {
          //
        });
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should not include items for which the condition fails', () => {
        let count = 0;
        store.state = [{ v: 0 }, { v: 2 }, { v: 1 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 7 }, { v: 9 }];
        store.instance.filter((item) => {
          count++;
          return item.v % 2;
        }).map(v=>v.toObject()).should.deep.equal([{ v: 1 }, { v: 3 }, { v: 5 }, { v: 7 }, { v: 9 }]);
        count.should.equal(8);
      });

      it('should invoke the callback with 3 arguments', () => {
        let count = 0;
        store.state = [{ v: 1 }];
        store.instance.filter((first, second, third, ...rest) => {
          count++;
          first.toObject().should.deep.equal({ v: 1 });
          second.should.equal(0);
          third.should.equal(store.instance);
          rest.should.have.length(0);
        });
        count.should.equal(1);
      });

      it('should pass along the thisArg parameter', () => {
        let count   = 0
          , thisArg = {}
          ;
        store.state = [{ v: 1 }];
        store.instance.filter(function() {
          count++;
          this.should.equal(thisArg);
        }, thisArg);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        let count = 0;
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }];
        store.instance.filter(function() {
          if (count < 2) {
            store.instance.push({ v: 7 });
          }
          count++;
          return true;
        }).map(v=>v.toObject()).should.deep.equal([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }]);
        count.should.equal(5);
        store.state.should.deep.equal([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 7 }, { v: 7 }]);
        actions.should.have.length(3);
      });
    });

    context('#find', () => {
      it('should not mutate the array', () => {
        let pre = store.state;
        store.instance.find(()=> {
          //
        });
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should find the item for which the condition holds', () => {
        let count = 0;

        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }];
        store.instance.find((item) => {
          count++;
          return item.get('v') === 3;
        }).should.equal(store.instance.get(2));
        count.should.equal(3);
      });

      it('should invoke the callback with 3 arguments', () => {
        let count = 0;
        store.state = [{ v: 1 }];
        store.instance.find((first, second, third, ...rest) => {
          count++;
          first.toObject().should.deep.equal({ v: 1 });
          second.should.equal(0);
          third.should.equal(store.instance);
          rest.should.have.length(0);
        });
        count.should.equal(1);
      });

      it('should pass along the thisArg parameter', () => {
        let count   = 0
          , thisArg = {}
          ;
        store.state = [{ v: 1 }];
        store.instance.find(function() {
          count++;
          this.should.equal(thisArg);
        }, thisArg);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        let count = 0;
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }];
        expect(store.instance.find(function(item) {
          if (count < 2) {
            store.instance.push({ v: 7 });
          }
          count++;
          return item.v === 7;
        })).to.be.undefined;
        count.should.equal(5);
        store.state.should.deep.equal([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 7 }, { v: 7 }]);
        actions.should.have.length(3);
      });
    });

    context('#findIndex', () => {
      it('should not mutate the array', () => {
        let pre = store.state;
        store.instance.findIndex(()=> {
          //
        });
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should find the item for which the condition holds', () => {
        let count = 0;

        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }];
        store.instance.findIndex((item) => {
          count++;
          return item.get('v') === 3;
        }).should.equal(2);
        count.should.equal(3);
      });

      it('should invoke the callback with 3 arguments', () => {
        let count = 0;
        store.state = [{ v: 1 }];
        store.instance.findIndex((first, second, third, ...rest) => {
          count++;
          first.toObject().should.deep.equal({ v: 1 });
          second.should.equal(0);
          third.should.equal(store.instance);
          rest.should.have.length(0);
        });
        count.should.equal(1);
      });

      it('should pass along the thisArg parameter', () => {
        let count   = 0
          , thisArg = {}
          ;
        store.state = [{ v: 1 }];
        store.instance.findIndex(function() {
          count++;
          this.should.equal(thisArg);
        }, thisArg);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        let count = 0;
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }];
        expect(store.instance.findIndex(function(item) {
          if (count < 2) {
            store.instance.push({ v: 7 });
          }
          count++;
          return item.v === 7;
        })).to.be.undefined;
        count.should.equal(5);
        store.state.should.deep.equal([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 7 }, { v: 7 }]);
        actions.should.have.length(3);
      });
    });

    context('#forEach', () => {
      it('should not mutate the array', () => {
        let pre = store.state;
        expect(store.instance.forEach(()=> {
          //
        })).to.be.undefined;
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should call for each item', () => {
        let count = 0
          , input = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }]
          ;
        store.state = input;
        store.instance.forEach((item) => {
          count++;
          item.toObject().should.deep.equal(input[count - 1]);
        });
        count.should.equal(5);
      });

      it('should invoke the callback with 3 arguments', () => {
        let count = 0;
        store.state = [{ v: 1 }];
        store.instance.forEach((first, second, third, ...rest) => {
          count++;
          first.toObject().should.deep.equal({ v: 1 });
          second.should.equal(0);
          third.should.equal(store.instance);
          rest.should.have.length(0);
        });
        count.should.equal(1);
      });

      it('should pass along the thisArg parameter', () => {
        let count   = 0
          , thisArg = {}
          ;
        store.state = [{ v: 1 }];
        store.instance.forEach(function() {
          count++;
          this.should.equal(thisArg);
        }, thisArg);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        let count = 0;
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }];
        store.instance.forEach(function() {
          if (count < 2) {
            store.instance.push({ v: 1 });
          }
          count++;
        });
        count.should.equal(5);
        store.state.should.deep.equal([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 1 }, { v: 1 }]);
        actions.should.have.length(3);
      });
    });

    context('#includes', () => {
      it('should not mutate the array', () => {
        let pre = store.state;
        store.instance.includes(12).should.be.false;
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should not find a missing simple item', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }];
        store.instance.includes({ v: 7 }).should.be.false;
      });

      it('should find an item', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        let toFind = store.instance.get(3);
        store.instance.includes(toFind).should.be.true;
      });

      it('should begin searching from start when start is positive', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        let toFind = store.instance.get(3);
        store.instance.includes(toFind, 4).should.be.false;
      });

      it('should  begin searching relative to end when start is negative', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        let toFind = store.instance.get(3);
        store.instance.includes(toFind, -2).should.be.false;
      });
    });

    context('#indexOf', () => {
      it('should not mutate the array', () => {
        let pre = store.state;
        store.instance.indexOf(12).should.equal(-1);
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should not find a missing simple item', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        store.instance.indexOf(7).should.equal(-1);
      });

      it('should find a complex type', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        let toFind = store.instance.get(3);
        store.instance.indexOf(toFind).should.equal(3);
      });

      it('should begin searching from start when start is positive', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        let toFind = store.instance.get(3);
        store.instance.indexOf(toFind, 4).should.equal(-1);
      });

      it('should  begin searching relative to end when start is negative', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        let toFind = store.instance.get(3);
        store.instance.indexOf(toFind, -2).should.equal(-1);
      });
    });

    context('#join', () => {
      it('should not mutate the array', () => {
        let pre = store.state;
        store.instance.join().should.equal('');
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should default to \',\' separator', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }];
        store.instance.join().should.equal('[object Object],[object Object],[object Object]');
      });

      it('should accept a separator', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }];
        store.instance.join(7).should.equal('[object Object]7[object Object]7[object Object]');
      });

      it('should allow an empty separator', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }];
        store.instance.join('').should.equal('[object Object][object Object][object Object]');
      });
    });

    context('#lastIndexOf', () => {
      it('should not mutate the array', () => {
        let pre = store.state;
        store.instance.lastIndexOf(12).should.equal(-1);
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should not find a missing simple item', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        store.instance.lastIndexOf(7).should.equal(-1);
      });

      it('should find a complex type', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        let toFind = store.instance.get(3);
        store.instance.lastIndexOf(toFind).should.equal(3);
      });

      it('should begin searching from start when start is positive', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        let toFind = store.instance.get(3);
        store.instance.lastIndexOf(toFind, 2).should.equal(-1);
      });

      it('should  begin searching relative to end when start is negative', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        let toFind = store.instance.get(3);
        store.instance.lastIndexOf(toFind, -5).should.equal(-1);
      });
    });

    context('#map', () => {
      it('should not mutate the array', () => {
        let pre = store.state;
        expect(store.instance.map(()=> {
          //
        })).to.deep.equal([]);
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should map each item', () => {
        let input  = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }]
          , mapper = (item) => {
              if (typeof item.toObject === 'function') {
                item = item.toObject();
              }
              return { e: item };
            }
          , mapped = input.map(mapper)
          ;
        store.state = input;
        store.instance.map(mapper).should.deep.equal(mapped);
      });

      it('should invoke the callback with 3 arguments', () => {
        let count = 0;
        store.state = [{ v: 1 }];
        store.instance.map((first, second, third, ...rest) => {
          count++;
          first.toObject().should.deep.equal({ v: 1 });
          second.should.equal(0);
          third.should.equal(store.instance);
          rest.should.have.length(0);
        });
        count.should.equal(1);
      });

      it('should pass along the thisArg parameter', () => {
        let count   = 0
          , thisArg = {}
          ;
        store.state = [{ v: 1 }];
        store.instance.map(function() {
          count++;
          this.should.equal(thisArg);
        }, thisArg);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        let count = 0;
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }];
        store.instance.map(function() {
          if (count < 2) {
            store.instance.push({ v: 1 });
          }
          count++;
        });
        count.should.equal(5);
        store.state.should.deep.equal([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 1 }, { v: 1 }]);
        actions.should.have.length(3);
      });
    });

    context('#pop', () => {
      it('should mutate the array', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }];
        let pre = store.state;
        store.instance.pop().should.deep.equal({ v: 3 });
        actions.should.have.length(2);
        store.state.should.not.equal(pre);
      });

      it('should return the last element and modify the original array', () => {
        store.state = [{ v: 17 }, { v: 18 }, { v: 4 }, { v: 7 }];
        store.instance.pop().should.deep.equal({ v: 7 });
        store.instance.should.have.length(3);
        store.instance.pop().should.deep.equal({ v: 4 });
        store.instance.should.have.length(2);
        store.state.should.deep.equal([{ v: 17 }, { v: 18 }]);
      });

      it('should return undefined when there are no elements', () => {
        store.state = [];
        expect(store.instance.pop()).to.be.undefined;
        store.state.should.deep.equal([]);
      });
    });

    context('#push', () => {
      it('should mutate the array', () => {
        let pre = store.state;
        store.instance.push({ v: 1 }).should.equal(1);
        actions.should.have.length(1);
        store.state.should.not.equal(pre);
      });

      it('should add all passed elements to the array', () => {
        store.state = [{ v: -1 }, { v: -2 }];
        store.instance.push({ v: 3 }, { v: 4 }, { v: 5 }, { v: 6 });
        store.state.should.deep.equal([{ v: -1 }, { v: -2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }]);
      });

      it('should return the new length of the array', () => {
        store.state = [{ v: 1 }, { v: 2 }];
        store.instance.push({ v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }).should.equal(6);
      });

      it('should fail to push an item of the wrong type to the array', () => {
        store.state = [{ v: 1 }, { v: 2 }];
        expect(()=>store.instance.push({ v: 'bar' }).should.equal(6)).to.throw(TypeError);
      });
    });

    context('#reduce', () => {
      it('should not mutate the array', () => {
        let pre = store.state;
        expect(store.instance.reduce(()=> {
          //
        }, 0)).to.equal(0);
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should reduce each item without initial value', () => {
        store.state = [{ v: 2 }, { v: 5 }, { v: 3 }, { v: 6 }, { v: 9 }];
        store.instance.reduce((prev, cur) => (prev.v ? prev.v : prev) * 10 + cur.v).should.equal(25369);
      });

      it('should reduce each item with initial value', () => {
        store.state = [{ v: 2 }, { v: 5 }, { v: 3 }, { v: 6 }, { v: 9 }];
        store.instance.reduce((prev, cur) => prev * 10 + cur.v, 77).should.equal(7725369);
      });

      it('should invoke the callback with 4 arguments', () => {
        let count = 0;
        store.state = [{ v: 1 }];
        store.instance.reduce((first, second, third, fourth, ...rest) => {
          count++;
          first.should.equal(7);
          second.toObject().should.deep.equal({ v: 1 });
          third.should.equal(0);
          fourth.should.equal(store.instance);
          rest.should.have.length(0);
        }, 7);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        let count = 0;
        store.state = [{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }];
        store.instance.reduce(function(prev, cur) {
          if (count < 2) {
            store.instance.push({ v: 1 });
          }
          count++;
          return prev + cur.v;
        }, 0).should.equal(0);
        count.should.equal(5);
        store.state.should.deep.equal([{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 1 }, { v: 1 }]);
        actions.should.have.length(3);
      });
    });

    context('#reduceRight', () => {
      it('should not mutate the array', () => {
        let pre = store.state;
        expect(store.instance.reduceRight(()=> {
          //
        }, 0)).to.equal(0);
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should reduce each item without initial value', () => {
        store.state = [{ v: 2 }, { v: 5 }, { v: 3 }, { v: 6 }, { v: 9 }];
        store.instance.reduceRight((prev, cur) => (prev.v ? prev.v : prev) * 10 + cur.v).should.equal(96352);
      });

      it('should reduce each item with initial value', () => {
        store.state = [{ v: 2 }, { v: 5 }, { v: 3 }, { v: 6 }, { v: 9 }];
        store.instance.reduceRight((prev, cur) => prev * 10 + cur.v, 77).should.equal(7796352);
      });

      it('should invoke the callback with 4 arguments', () => {
        let count = 0;
        store.state = [{ v: 1 }];
        store.instance.reduceRight((first, second, third, fourth, ...rest) => {
          count++;
          first.should.equal(7);
          second.toObject().should.deep.equal({ v: 1 });
          third.should.equal(0);
          fourth.should.equal(store.instance);
          rest.should.have.length(0);
        }, 7);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        let count = 0;
        store.state = [{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }];
        store.instance.reduceRight(function(prev, cur) {
          if (count < 2) {
            store.instance.push({ v: 1 });
          }
          count++;
          return prev + cur.v;
        }, 0).should.equal(0);
        count.should.equal(5);
        store.state.should.deep.equal([{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 1 }, { v: 1 }]);
        actions.should.have.length(3);
      });
    });

    context('#reverse', () => {
      it('should not mutate the array if it has no items, but should dispatch', () => {
        let pre = store.state;
        store.instance.reverse();
        actions.should.have.length(1);
        store.state.should.equal(pre);
      });

      it('should mutate the array if it has items', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }];
        let pre = store.state;
        store.instance.reverse();
        actions.should.have.length(2);
        store.state.should.not.equal(pre);
      });

      it('should reverse the array in place and return the array', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 8 }, { v: 7 }];
        store.instance.reverse().should.equal(store.instance);
        store.state.should.deep.equal([{ v: 7 }, { v: 8 }, { v: 3 }, { v: 2 }, { v: 1 }]);
      });
    });

    context('#shift', () => {
      it('should mutate the array', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }];
        let pre = store.state;
        store.instance.shift().should.deep.equal({ v: 1 });
        actions.should.have.length(2);
        store.state.should.not.equal(pre);
      });

      it('should return the last element and modify the original array', () => {
        store.state = [{ v: 17 }, { v: 18 }, { v: 3 }, { v: 4 }];
        store.instance.shift().should.deep.equal({ v: 17 });
        store.instance.should.have.length(3);
        store.instance.shift().should.deep.equal({ v: 18 });
        store.instance.should.have.length(2);
        store.state.should.deep.equal([{ v: 3 }, { v: 4 }]);
      });

      it('should return undefined when there are no elements', () => {
        store.state = [];
        expect(store.instance.shift()).to.be.undefined;
        store.state.should.deep.equal([]);
      });
    });

    context('#slice', () => {
      it('should not mutate the array', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }];
        let pre = store.state;
        store.instance.slice();
        actions.should.have.length(1);
        store.state.should.equal(pre);
      });

      it('should return a shallow copy of the array with no params', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }];
        store.instance.slice().map(v=>v.toObject()).should.deep.equal([{ v: 1 }, { v: 2 }, { v: 3 }]);
      });

      it('should return a slice from start to the end of the array when 1 param passed', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }];
        store.instance.slice(2).map(v=>v.toObject()).should.deep.equal([{ v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }]);
      });

      it('should return a slice from start to end with 2 params', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }];
        store.instance.slice(2, 5).map(v=>v.toObject()).should.deep.equal([{ v: 3 }, { v: 4 }, { v: 5 }]);
      });

      it('should accept negative parameters to mean from the end', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }];
        store.instance.slice(-4, -2).map(v=>v.toObject()).should.deep.equal([{ v: 3 }, { v: 4 }]);
      });

      it('should return references to objects', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }];
        store.instance.slice(1, 4)[1].should.equal(store.instance.get(2));
      });
    });

    context('#some', () => {
      it('should not mutate the array', () => {
        let pre = store.state;
        store.instance.some(()=> {
          //
        });
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should break when the condition fails', () => {
        let count = 0;
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        store.instance.some((item) => {
          count++;
          return item.v > 3;
        });
        count.should.equal(4);
      });

      it('should return false when the condition is falsy for all items', () => {
        let count = 0;
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }];
        store.instance.some(() => {
          count++;
          return false;
        }).should.equal(false);
        count.should.equal(5);
      });

      it('should invoke the callback with 3 arguments', () => {
        let count = 0;
        store.state = [{ v: 1 }];
        store.instance.some((first, second, third, ...rest) => {
          count++;
          first.toObject().should.deep.equal({ v: 1 });
          second.should.equal(0);
          third.should.equal(store.instance);
          rest.should.have.length(0);
        });
        count.should.equal(1);
      });

      it('should pass along the thisArg parameter', () => {
        let count   = 0
          , thisArg = {}
          ;
        store.state = [{ v: 1 }];
        store.instance.some(function() {
          count++;
          this.should.equal(thisArg);
        }, thisArg);
        count.should.equal(1);
      });

      it('should not enumerate items in the array added during processing', () => {
        let count = 0;
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }];
        store.instance.some(function() {
          if (count < 2) {
            store.instance.push({ v: 1 });
          }
          count++;
          return false;
        });
        count.should.equal(5);
        store.state.should.deep.equal([
          { v: 1 },
          { v: 2 },
          { v: 3 },
          { v: 4 },
          { v: 5 },
          { v: 1 },
          { v: 1 }
        ]);
        actions.should.have.length(3);
      });
    });

    context('#sort', () => {
      it('should mutate the array', () => {
        store.state = [{ v: 7 }, { v: 2 }, { v: 4 }];
        let pre = store.state;
        store.instance.sort();
        actions.should.have.length(2);
        store.state.should.not.equal(pre);
      });

      it('should sort using a custom compare function', () => {
        store.state = [{ v: 7 }, { v: 2 }, { v: 4 }, { v: 9 }, { v: 5 }];
        store.instance.sort((a, b) => {
          return a.v - b.v;
        });
        store.state.should.deep.equal([{ v: 2 }, { v: 4 }, { v: 5 }, { v: 7 }, { v: 9 }]);
      });
    });

    context('#splice', () => {
      it('should mutate the array', () => {
        store.state = [{ v: 7 }, { v: 2 }, { v: 4 }];
        let pre = store.state;
        store.instance.splice(1, 1, { v: 8 });
        actions.should.have.length(2);
        store.state.should.not.equal(pre);
      });

      it('should delete items using a positive start', () => {
        store.state = [{ v: 7 }, { v: 2 }, { v: 4 }, { v: 1 }, { v: 5 }, { v: 3 }];
        store.instance.splice(1, 2);
        store.state.should.deep.equal([{ v: 7 }, { v: 1 }, { v: 5 }, { v: 3 }]);
      });

      it('should delete items offset from the end using a negative start', () => {
        store.state = [{ v: 7 }, { v: 2 }, { v: 4 }, { v: 1 }, { v: 5 }, { v: 3 }];
        store.instance.splice(-4, 2);
        store.state.should.deep.equal([{ v: 7 }, { v: 2 }, { v: 5 }, { v: 3 }]);
      });

      it('should insert items using a positive start', () => {
        store.state = [{ v: 7 }, { v: 2 }, { v: 4 }, { v: 1 }, { v: 5 }, { v: 3 }];
        store.instance.splice(3, 0, { v: 8 }, { v: 9 }, { v: 10 });
        store.state.should.deep.equal([
          { v: 7 },
          { v: 2 },
          { v: 4 },
          { v: 8 },
          { v: 9 },
          { v: 10 },
          { v: 1 },
          { v: 5 },
          { v: 3 }
        ]);
      });

      it('should insert items offset from the end using a negative start', () => {
        store.state = [{ v: 7 }, { v: 2 }, { v: 4 }, { v: 1 }, { v: 5 }, { v: 3 }];
        store.instance.splice(-2, 0, { v: 8 }, { v: 9 }, { v: 10 });
        store.state.should.deep.equal([
          { v: 7 },
          { v: 2 },
          { v: 4 },
          { v: 1 },
          { v: 8 },
          { v: 9 },
          { v: 10 },
          { v: 5 },
          { v: 3 }
        ]);
      });

      it('should delete and add items in the same call', () => {
        store.state = [{ v: 7 }, { v: 2 }, { v: 4 }, { v: 1 }, { v: 5 }, { v: 3 }];
        store.instance.splice(3, 2, { v: 8 }, { v: 9 }, { v: 10 });
        store.state.should.deep.equal([{ v: 7 }, { v: 2 }, { v: 4 }, { v: 8 }, { v: 9 }, { v: 10 }, { v: 3 }]);
      });

      it('should not insert items of thew wrong type', () => {
        store.state = [{ v: 7 }, { v: 2 }, { v: 4 }, { v: 1 }, { v: 5 }, { v: 3 }];
        expect(()=>store.instance.splice(3, 0, 8, 9, 10)).to.throw(TypeError);
      });

      it('should not save items directly to the state', () => {
        let obj = { v: 1 };
        store.state = [{ v: 7 }, { v: 2 }, { v: 4 }, { v: 1 }, { v: 5 }, { v: 3 }];
        store.instance.splice(3, 0, obj);
        store.state.should.deep.equal([{ v: 7 }, { v: 2 }, { v: 4 }, obj, { v: 1 }, { v: 5 }, { v: 3 }]);
        store.state[3].should.deep.equal(obj);
        store.state[3].should.not.equal(obj);
      });
    });

    context('#toLocaleString', () => {
      it('should not mutate the array', () => {
        let pre = store.state;
        store.instance.toLocaleString();
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should return the locale string version of the array', () => {
        let input = [{ v: 1 }, { v: 1 }];
        store.state = input;
        store.instance.toLocaleString().should.equal(input.toLocaleString());
      });
    });

    context('#toString', () => {
      it('should not mutate the array', () => {
        let pre = store.state;
        store.instance.toString();
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should return the stringified version of the array', () => {
        let input = [{ v: 1 }, { v: 2 }];
        store.state = input;
        store.instance.toString().should.equal(input.toString());
      });
    });

    context('#unshift', () => {
      it('should mutate the array', () => {
        let pre = store.state;
        store.instance.unshift({ v: 1 }).should.equal(1);
        actions.should.have.length(1);
        store.state.should.not.equal(pre);
      });

      it('should add all passed elements to the array', () => {
        store.state = [{ v: -1 }, { v: -2 }];
        store.instance.unshift({ v: 3 }, { v: 4 }, { v: 5 }, { v: 6 });
        store.state.should.deep.equal([{ v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: -1 }, { v: -2 }]);
      });

      it('should return the new length of the array', () => {
        store.state = [{ v: 1 }, { v: 2 }];
        store.instance.unshift({ v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }).should.equal(6);
      });

      it('should fail to push an item of the wrong type to the array', () => {
        store.state = [{ v: 1 }, { v: 2 }];
        expect(()=>store.instance.unshift({ v: 'bar' }).should.equal(6)).to.throw(TypeError);
      });
    });

    context('#valueOf', () => {
      it('should not mutate the array', () => {
        let pre = store.state;
        store.instance.valueOf();
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should return the stringified version of the array', () => {
        let input = [{ v: 1 }, { v: 2 }];
        store.state = input;
        store.instance.valueOf().should.deep.equal(input.valueOf());
      });
    });
  });

  context('properties', () => {

    context('.length', () => {
      it('should retrieve the length of the array', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }];
        store.instance.should.have.length(3);
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        store.instance.should.have.length(7);
      });

      it('should get length through get function', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }];
        store.instance.get('length').should.equal(3);
      });

      it('should mutate the array when set', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }];
        let pre = store.state;
        store.instance.length = 3;
        store.state.should.not.equal(pre);
        actions.should.have.length(2);
      });

      it('should set length through set function', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }];
        store.instance.set('length', 2);
        store.state.should.deep.equal([{ v: 1 }, { v: 2 }]);
      });

      it('should trim the array when set to a lower value', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }];
        store.instance.length = 2;
        store.state.should.deep.equal([{ v: 1 }, { v: 2 }]);
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        store.instance.length = 5;
        store.state.should.deep.equal([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }]);
      });

      it('should extend the array when set to a higher value', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }];
        store.instance.length = 5;
        store.state.should.deep.equal([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 0 }, { v: 0 }]);
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        store.instance.length = 11;
        store.state.should.deep.equal([
          { v: 1 },
          { v: 2 },
          { v: 3 },
          { v: 4 },
          { v: 5 },
          { v: 6 },
          { v: 7 },
          { v: 0 },
          { v: 0 },
          { v: 0 },
          { v: 0 }
        ]);
      });
    });

    context('#get', () => {
      it('should not mutate the array', () => {
        let pre = store.state;
        store.instance.get(0);
        actions.should.have.length(0);
        store.state.should.equal(pre);
      });

      it('should get elements from the array', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }];
        store.instance.get(2).toObject().should.deep.equal({ v: 3 });
      });

      it('should return undefined for items that don\'t exist', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }];
        expect(store.instance.get(7)).to.be.undefined;
        expect(store.instance.get(-10)).to.be.undefined;
        expect(store.instance.get()).to.be.undefined;
        expect(store.instance.get('missing')).to.be.undefined;
      });
    });

    context('#set', () => {
      it('should mutate the array', () => {
        let pre = store.state;
        store.instance.set(0, { v: 3 });
        actions.should.have.length(1);
        store.state.should.not.equal(pre);
      });

      it('should set elements in the array', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }];
        store.instance.set(2, { v: 8 });
        store.state.should.deep.equal([{ v: 1 }, { v: 2 }, { v: 8 }, { v: 4 }]);
      });

      it('should extend the array when setting at high index', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }];
        store.instance.set(7, { v: 8 });
        store.state.should.deep.equal([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 8 }]);
      });

      it('should fail to set elements of the wrong type', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }];
        expect(()=>store.instance.set(2, 8)).to.throw(TypeError);
      });

      it('should fail for non-natural number properties', () => {
        store.state = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }];
        expect(()=>store.instance.set(-10, { v: 1 })).to.throw(TypeError);
        expect(()=>store.instance.set(undefined, { v: 1 })).to.throw(TypeError);
        expect(()=>store.instance.set('missing', { v: 1 })).to.throw(TypeError);
      });
    });
  });
});
