import { namedFunction, dedent } from '../utils';
import parseType from '../parse/parse-type';

export default function collection(model) {
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
          create: namedFunction(`create${modelType.name}`, function() {
            return this.model.apply(null, arguments);
          }, dedent`
            function(){
              return new ${modelType.name}'(...arguments);
            }`, !options.namedFunctions),
          get all() {
            return this.keys.map(id => this.get(id));
          },
          get model() {
            let bound = modelType.bind(null, this);
            bound.prototype = modelType.prototype;
            return bound;
          },
          remove(id) {
            if (!this[id]) throw new Error(`Could not remove ${modelType.name}[${id}]: object not found`);
            this[id] = undefined;
          }
        }
      , thisType
      ;

    thisType = parseType({ ...options, self }, type);

    thisType.name = `collection(${modelType.name})`;
    thisType.collection = model.collection;
    thisType.model = modelType;
    return Object.assign(self, thisType);
  }

  Collection.isType = true;
  return Collection;
}

