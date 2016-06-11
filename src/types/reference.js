import finalizeType from '../parse/finalize-type';
import { pathToStr } from '../utils';

export default function reference(target) {
  function Reference(options) {
    return finalizeType({
      isType: true,
      name: pathToStr(options.typeMoniker),
      kind: 'reference',
      storageKinds: ['string'],
      options,
      validateData: function(value, instancePath) {
        instancePath = instancePath || options.typeMoniker;
        if (typeof value !== 'string') {
          return `Reference data for "${pathToStr(instancePath)}" must be a string`;
        }
        if (!value) return 'Reference cannot be empty';
      },
      validateAssign: function(value, instancePath) {
        instancePath = instancePath || options.typeMoniker;
        if (typeof value !== 'object' || !value._meta || !value._meta.idKey) {
          return `Reference for "${pathToStr(instancePath)}" must be an object of type "${target}"`;
        }
      },
      pack: function(value) {
        return value[value._meta.idKey];
      },
      unpack: function(store, storePath, instancePath, currentInstance, owner) {
        const findCollection = () => {
          let ancestor = owner
            , found
            , type
            , collection
            ;

          while (true) {
            if (!ancestor || !ancestor._meta) break;
            type = ancestor._meta.type;
            if (!type) break;
            if (type.isCollections && type.properties[target] && type.properties[target].isCollection) {
              collection = ancestor[target];
              if (collection && collection._meta && (type = collection._meta.type) && type.model) {
                found = collection;
                break;
              }
            }
            ancestor = ancestor._meta.owner;
          }
          return found;
        };

        let id = store.get(storePath);
        if (!id || id === '<unknown>') throw new ReferenceError(`Cannot dereference: No "${target}" id present`);

        let collection = findCollection();

        if (!collection) throw new TypeError(`Cannot find collection of type "${target}"`);

        let result = collection.get(id);
        if (!result) throw new ReferenceError(`Cannot dereference: No "${target}" with id "${id}" exists`);
        return result;
      },
      defaultValue: function() {
        return '<unknown>';
      }
    });
  }

  Reference.isType = true;
  return Reference;
}

