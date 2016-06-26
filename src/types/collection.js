import { namedFunction, dedent } from '../utils';
import parseType from '../parse/parse-type';
import { makeOwner } from './model';
import bare from '../modifiers/bare';

export default function collection(model, extraProperties) {
  if (!model.isModel) {
    throw new TypeError('Collection items must be Models');
  }
  function Collection(options) {
    let self          = { options, isCollection: true }
      , typeMoniker   = options.typeMoniker
      , parentMoniker = typeMoniker.slice(0, -1)
      , modelType     = model({
          ...options,
          typeMoniker: parentMoniker.concat(model.modelName),
          parent: options.self || self,
          self: null
        })
      , type          = {
          '*': modelType,
          create: bare(namedFunction(`create${modelType.name}`, function() {
            return this.model.apply(null, arguments);
          }), dedent`
            function(){
              return new ${modelType.name}'(...arguments);
            }`, !options.namedFunctions),
          get all() {
            return this.keys.map(id => this.get(id));
          },
          get model() {
            let self = this
              , BoundModel = namedFunction(modelType.name, function Model(...args) {
                   return modelType.call(this, makeOwner(self), ...args);
                }, modelType, !options.debug);
            BoundModel.prototype = modelType.prototype;
            Object.assign(BoundModel, modelType);
            return BoundModel;
          },
          remove(id) {
            if (id && id._meta && id._meta.idKey && id[id._meta.idKey]) {
              id = id[id._meta.idKey];
            }
            var val = this.get(id);
            if (!val) throw new Error(`Could not remove ${modelType.name}[${id}]: object not found`);
            this.set(id, undefined);
          }
        }
      , thisType
      ;

    if (extraProperties) {
      type = {...extraProperties, ...type};
    }

    thisType = parseType({ ...options, self }, type);

    thisType.name = `collection(${modelType.name})`;
    thisType.collection = model.collection;
    thisType.model = modelType;
    return Object.assign(self, thisType);
  }

  Collection.isType = true;
  return Collection;
}

