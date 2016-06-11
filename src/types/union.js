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

    handlers = types.map(type => parseType({ ...options, parent: options.self || self, self: null }, type));

    //Flatten all unions: union(union(null, undefined), union(Number, String)) => union(null, undefined, Number, String)
    handlers = Array.prototype.concat.apply([], handlers.map(handler => handler.kind === 'union' ? handler.handlers : handler));

    handlers.map((handler) => {
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
      handlersById[`${kinds[handler.kind]}:${handler.kind}`] = handler;
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
      validateData: function(value, instancePath) {
        instancePath = instancePath || typeMoniker;
        if (!simple) {
          if (typeof value.type !== 'string') {
            return `Required type field not found for union "${pathToStr(instancePath)}"`;
          }
          if (!handlersById[value.type]) {
            return `Unexpected type "${value.type}" for union "${pathToStr(instancePath)}"`;
          }
          return handlersById[value.type].validateData(value.value, instancePath);
        }
        return (
          handlers.every(handler => handler.validateData(value, instancePath))
          && `No matching data type for union "${pathToStr(instancePath)}"`
        );
      },
      validateAssign: function(value, instancePath) {
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
      pack: function(value) {
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
          type: idOfHandler(handler),
          value: packed
        };
      },
      unpack: function(store, path, instancePath, currentInstance, owner) {
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
          if (!handlersById[value.type]) {
            return `Unexpected type "${value.type}" for union "${pathToStr(instancePath)}"`;
          }
          return store.unpack(handlersById[value.type], path.concat('value'), instancePath, null, owner);
        }
      },
      defaultValue: function() {
        return (
          simple
            ? handlers[0].defaultValue()
            : {
            type: idOfHandler(handlers[0]),
            value: handlers[0].defaultValue()
          }
        );
      },
      handlers
    };

    return Object.assign(self, finalizeType(thisType));
  }

  Union.isType = true;
  return Union;
}

