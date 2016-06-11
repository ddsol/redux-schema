import parseType from '../parse/parse-type';
import collection from './collection';

export default function collections(models) {
  function Collections(options) {
    let thisType = { options, isCollections: true }
      , type
      ;

    type = {
      get models() {
        let result = {};
        models.forEach(model => result[model.modelName] = this[model.collection].model);
        return result;
      }
    };

    models.forEach(model => type[model.collection] = collection(model)(options));

    Object.assign(thisType, parseType({ ...options, self: thisType }, type));
    thisType.name = `collections(${models.map(model => model.modelName).join(', ')})`;
    thisType.collections = models.map(model => type[model.collection]);
    return thisType;
  }

  Collections.isType = true;
  return Collections;
}
