import finalizeType from '../parse/finalize-type';
import parseType from '../parse/parse-type';
import { pathToStr } from '../utils';

export default function union(...types) {
  if (!types.length) throw new TypeError('Union requires subtypes.');

  function Union(options) {
    let typeMoniker  = options.typeMoniker
      , simple       = true
      , storageKinds = {}
      , kinds        = {}
      , handlersById = {}
      , self         = { options }
      , handlerIds
      , handlers
      ;

    function parse(type, name) {
      var moniker = [...options.typeMoniker];
      if (name) {
        moniker.push(name);
      }
      return parseType({
        ...options,
        typeMoniker: moniker,
        parent: options.self || self,
        self: null
      }, type);
    }

    //Flatten all unions: union(union(null, undefined), union(Number, String)) => union(null, undefined, Number, String)
    types = Array.prototype.concat.apply([], types.map(type => {
      let handler = parse(type);
      if (handler.kind !== 'union') {
        return type;
      }
      return handler.types;
    }));

    handlers = types.map(type => parse(type)).map((handler, ix) => {
      handler.storageKinds.forEach((kind) => {
        if (storageKinds[kind]) {
          simple = false;
        } else {
          storageKinds[kind] = true;
        }
      });
      if (!kinds[handler.kind]) {
        kinds[handler.kind] = 0;
      }
      kinds[handler.kind]++;
      let id = handler.kind + kinds[handler.kind];
      handler = parse(types[ix], id);
      handlersById[id] = handler;
      return handler;
    });

    handlerIds = Object.keys(handlersById);

    function idOfHandler(handler) {
      for (let i = 0; i < handlerIds.length; i++) {
        if (handlersById[handlerIds[i]] === handler) return handlerIds[i];
      }
    }

    let thisType = {
      isType: true,
      name: `union(${handlers.map(handler => handler.kind).join(', ')})`,
      kind: 'union',
      storageKinds: Object.keys(storageKinds),
      options,
      validateData(value, instancePath) {
        instancePath = instancePath || typeMoniker;
        if (!simple) {
          let keys = Object.keys(value||{})
            , type = keys[0]
            ;
          if (!value || keys.length !== 1) {
            return `Missing union type for union "${pathToStr(instancePath)}"`;
          }
          if (!handlersById[type]) {
            return `Unexpected type "${type}" for union "${pathToStr(instancePath)}"`;
          }
          return handlersById[type].validateData(value[type], instancePath);
        }
        return (
          handlers.every(handler => handler.validateData(value, instancePath))
          && `No matching data type for union "${pathToStr(instancePath)}"`
        );
      },
      coerceData(value, instancePath) {
        if (!thisType.validateData(value, instancePath)) return value;
        return thisType.defaultValue();
      },
      validateAssign(value, instancePath) {
        instancePath = instancePath || typeMoniker;
        let messages = []
          , handler
          , message
          ;

        for (let i = 0; i < handlers.length; i++) {
          message = handlers[i].validateAssign(value);
          if (!message) {
            handler = handlers[i];
            break;
          }
          messages.push(message);
        }
        if (!handler) {
          return `Incompatible value ${value} for ${pathToStr(instancePath)}. ${messages.join(' -or- ')}.`;
        }
      },
      pack(value) {
        let messages = []
          , handler
          , packed
          , message
          ;
        for (let i = 0; i < handlers.length; i++) {
          message = handlers[i].validateAssign(value);
          if (!message) {
            handler = handlers[i];
            break;
          }
          messages.push(message);
        }
        if (!handler) {
          throw new TypeError(`Incompatible value ${value} for ${thisType.name}. ${messages.join(' -or- ')}.`);
        }
        packed = handler.pack(value);
        if (simple) {
          return packed;
        }
        return {
          [idOfHandler(handler)]: packed
        };
      },
      unpack(store, path, instancePath, currentInstance, owner) {
        if (currentInstance) throw new Error('Union types cannot modify a data instance');
        let value = store.get(path);
        if (simple) {
          for (let i = 0; i < handlers.length; i++) {
            if (!handlers[i].validateData(value, instancePath)) {
              return store.unpack(handlers[i], path, instancePath, null, owner);
            }
          }
          throw new TypeError(`No matching data type for union "${pathToStr(instancePath)}"`);
        } else {
          let type = Object.keys(value||{})[0];
          if (!handlersById[type]) {
            if (type) {
              throw new Error(`Unexpected type "${type}" for union "${pathToStr(instancePath)}"`);
            } else {
              throw new Error(`Missing union type for union "${pathToStr(instancePath)}"`);
            }
          }
          return store.unpack(handlersById[type], path.concat(type), instancePath, null, owner);
        }
      },
      getTypeFromPath(path) {
        if (!path.length) {
          return options.typeMoniker;
        }
        let first = path[0];
        if (!handlersById[first]) throw new Error(`Can't find union subtype ${first}, ${path}, ${handlers[0].options.typeMoniker}`);
        return handlersById[first].getTypeFromPath(path.slice(1));
      },
      defaultValue() {
        return (
          simple
            ? handlers[0].defaultValue()
            : {
            [idOfHandler(handlers[0])]: handlers[0].defaultValue()
          }
        );
      },
      handlers,
      types
    };

    return Object.assign(self, finalizeType(thisType));
  }

  Union.isType = true;
  return Union;
}

