#Redux-Schema

[![build status](https://img.shields.io/travis/ddsol/redux-schema.svg?style=flat-square)](https://travis-ci.org/ddsol/redux-schema)

###Introduction

Redux Schema is a system to use [Redux](https://github.com/reactjs/redux) without needing to write any action creators or reducers. If you don't know what Redux is all about, you should spend some time looking at it. There's a whole community for you to connect with.

Redux is based on 3 principles:
- Single source of truth
- State is read-only
- Changes are made with pure functions

Also, the state is best kept serializable so it can be packed up and shipped easily.

The above principles create applications that are easy to manage as they grow from tiny tests into large complex applications.

###Why Schema?

Redux is a very small library. It's designed to help without getting in the way. It only covers a very small area, namely managing the state. Even there it doesn't touch the state. It leaves this to the reducers, which copy-and-modify the state.

The code to copy-and-modify the state is fairly simple in each case, and using rest spread and such, it's even fairly clean. The matching action creators are also tiny and quick to write.
 
The trouble comes when you require many actions with matching reducers. The reducers usually live in a separate file. Nonetheless, most often each action creator is paired with a single reducer case. Moreover, the action creators are extremely similar from one to the next and writing them quickly feels like boilerplate coding. The reducers, due to their pure-functional nature, aren't always easily readable. The intent of simply setting a property is easily lost in code like `return { ...state, myProp: action.value }`. Also, this code is embedded in a case statement that can grow to unwieldly proportions.
 
And when you have these reducers and action creators, you have to make sure they are being tested. Each has to be matched with a test or 2 to make sure it does its job.
 
Less obvious when you start coding this way is that you lose out on something we're very much used to when we write JavaScript, and that is Object Oriented Programming. By turning every mutation into an action and sending this to a central processing plant (the reducer), the code to act on our data is no longer attached to the data. `user.friend(otherUser)` becomes `dispatch(friendUser(requester, invitee))` and the actual code that does the work is found elsewhere and can't reference `this`.
 
Redux-Schema is designed to overcome these issues. It allows you to use Redux without needing to write any reducers, actionTypes, actionCreators or dispatch calls.
 
###What does it look like?

A picture is worth 1000 words. Unfortunately, I'm no artist. So here's some code:

```
import { model, optional, Nil, bare, reference, collections, Store } from 'redux-schema';
import { createStore } from 'redux';


var userModel = schema('User', {
  first: schema.optional(String),
  last: schema.optional(String),

  address: schema.union(schema.Nil, {
    street: String,
    town: String
  }, {
    POBox: String,
    town: String
  }),

  constructor(foo, bar) {
    if (foo === bar) {
      console.log('The foo is the bar!')
    } else {
      console.log('The foo and the bar are not the same.')
    }
  },

  get full() {
    return this.first + ' ' + this.last;
  },

  set full(full) {
    let split = full.split(' ');
    this.first = split.shift();
    this.last = split.join(' ');
  },

  getGreeting() {
    if (this.full === 'Foo Bar') {
      return 'Baz Quux!';
    } else {
      return 'Hello ' + this.first + ' from ' + this.address.town;
    }
  },

  friend: schema.optional(schema.reference('user')),

  makeFoo() {
    this.full = 'Foo Bar';
  }
});

var root = collections([userModel]);

var store = new Store({ schema: root, debug: true });

store.store = redux.createStore(store.reducer);

var { User } = store.models;

var user = new User('foo', 'bar');
/* 
  generates:
  
  dispatch({
    type: 'USER_CONSTRUCTOR',
    path: [ 'user', 'fc6e4b60004c11e6963a4dd9', 'constructor' ],
    args: [ 'foo', 'bar' ] 
  });
  
  new state:
  { 
    user: { 
      '9b66b7d0005111e68f23a7ab': { 
        first: undefined,
        last: undefined,
        address: { type: '1:union', value: null },
        friend: undefined,
        id: '9b66b7d0005111e68f23a7ab' 
      }
    }
  }
*/

console.log(user.full); //"undefined undefined"
/* This doesn't generate any action */

user.full = 'First Last';
/* 
  generates:
  
  dispatch({ 
    type: 'USER_SET_FULL',
    path: [ 'user', 'fc6e4b60004c11e6963a4dd9', 'full' ],
    value: 'First Last' 
  });
  
  new state:
  { 
    user: { 
      '9b66b7d0005111e68f23a7ab': { 
        address: { type: '1:union', value: null },
        id: '9b66b7d0005111e68f23a7ab',
        friend: undefined,
        first: 'First',
        last: 'Last' 
      } 
    } 
  }
*/

console.log(user.full); //First Last

user.makeFoo();
/*
  generates:
  dispatch({ 
    type: 'USER_MAKE_FOO',
    path: [ 'user', '9b66b7d0005111e68f23a7ab', 'makeFoo' ],
    args: [] 
  });
  
  new state:
  {
    user: {
      '9b66b7d0005111e68f23a7ab': {
        address: { type: '1:union', value: null },
        id: '9b66b7d0005111e68f23a7ab',
        friend: undefined,
        first: 'Foo',
        last: 'Bar' 
      } 
    }
  }
*/

console.log(user.getGreeting());
/*
  Because it's wrapped in schema.bare, it doesn't generate any action.
  If it did set any properties, it would result in the same actions as if
  when those properties were set from outside a method.
*/

user.address = { street: '123 west somewhere', town: 'Wiggletown' };
/*

  generates:
  dispatch({ 
    type: 'SET_USER_ADDRESS',
    prop: true,
    path: [ 'user', '9b66b7d0005111e68f23a7ab', 'address' ],
    value: {
      type: '1:object', 
      value: { street: '123 west somewhere', town: 'Wiggletown' }
    }
  });

  new state:
  { 
    user: { 
      '9b66b7d0005111e68f23a7ab': { 
        address: { 
          type: '1:object',
          value: { street: '123 west somewhere', town: 'Wiggletown' }
        },
        id: '9b66b7d0005111e68f23a7ab',
        friend: undefined,
        first: 'Foo',
        last: 'Bar' 
      }
    }
  }
  
  Note that the storage of the union of 2 different objects results in the
  store having extra information about the data type. This doesn't interfere
  with the usage of this data. The store is simply the backend representation.
*/

var ref1 = user.address;
user.address = { POBox : '101', town: '12' };
/*

  generates:
  { 
    type: 'SET_USER_ADDRESS',
    prop: true,
    path: [ 'user', '9b66b7d0005111e68f23a7ab', 'address' ],
    value: {
      type: '2:object', value: { POBox: '101', town: '12' } 
    } 
  }

  new state:
  { 
    user: { 
      '9b66b7d0005111e68f23a7ab': { 
        address: {
          type: '2:object', 
          value: { POBox: '101', town: '12' } 
        },
        id: '9b66b7d0005111e68f23a7ab',
        friend: undefined,
        first: 'Foo',
        last: 'Bar' 
      } 
    } 
  }

  The type of the object is automatically inferred.
*/

user.address = { street: '123 west somewhere', town: 'Wiggletown' };
/*

  generates:
  dispatch({ 
    type: 'SET_USER_ADDRESS',
    prop: true,
    path: [ 'user', '9b66b7d0005111e68f23a7ab', 'address' ],
    value: {
      type: '1:object', 
      value: { street: '123 west somewhere', town: 'Wiggletown' }
    }
  });

  new state:
  { 
    user: { 
      '9b66b7d0005111e68f23a7ab': { 
        address: { 
          type: '1:object',
          value: { street: '123 west somewhere', town: 'Wiggletown' }
        },
        id: '9b66b7d0005111e68f23a7ab',
        friend: undefined,
        first: 'Foo',
        last: 'Bar' 
      }
    }
  }
*/
var ref2 = user.address;

console.log(ref1 === ref2, ref1.street, ref2.street)); //true, '123 west somewhere', '123 west somewhere';

/*

  A cache ensures that references to the same object of the same type are
  actually the same instance. Even if they wouldn't be the same instance,
  however, the property values would be sourced from the same store. Thus,
  the only way to know they are different is to compare the instances with
  strict equal.

*/

user.friend = user;

/*

  generates:
  dispatch({ 
    type: 'SET_USER_FRIEND',    
    prop: true,
    path: [ 'user', '9b66b7d0005111e68f23a7ab', 'friend' ],
    value: '9b66b7d0005111e68f23a7ab' 
  });

  new state:
  { 
    user: { 
      '9b66b7d0005111e68f23a7ab': { 
        address: { 
          type: '1:object',
          value: { street: '123 west somewhere', town: 'Wiggletown' }
        },
        id: '9b66b7d0005111e68f23a7ab',
        first: 'Foo',
        last: 'Bar',
        friend: '9b66b7d0005111e68f23a7ab' 
      } 
    } 
  }
*/

console.log(store.rootInstance.user.keys); //[ '9b66b7d0005111e68f23a7ab' ]

new User();
new User();
/*

  new state:
  { 
    user: { 
      '9b66b7d0005111e68f23a7ab': { 
        address: { 
          type: '1:object',
          value: { street: '123 west somewhere', town: 'Wiggletown' } 
        },
        id: '6a879770005511e68e3269d9',
        first: 'Foo',
        last: 'Bar',
        friend: '6a879770005511e68e3269d9' 
      },
      '6a8b6800005511e68e3269d9': {
        first: undefined,
        last: undefined,
        address: { type: '1:union', value: null },
        friend: undefined,
        id: '6a8b6800005511e68e3269d9'
      },
      '6a8b8f10005511e68e3269d9': {
        first: undefined,
        last: undefined,
        address: { type: '1:union', value: null },
        friend: undefined,
        id: '6a8b8f10005511e68e3269d9'
      } 
    } 
  }

*/
console.log(store.rootInstance.user.keys);
//[ '9b66b7d0005111e68f23a7ab', '6a8b6800005511e68e3269d9', '6a8b8f10005511e68e3269d9' ]

```

###Work in progress

There's still a lot of work to be done:
 - Tests
 - Better documentation
 - Allow to set defaults
 - Code cleanup
 - Add method parameter type descriptions and automatic serialization and deserialization of arguments
