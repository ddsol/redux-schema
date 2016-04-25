import { expect, should } from 'chai';

should();

export const baseTypeProperties = {
  isType: true,
  name: String,
  kind: String,
  storageKinds: Array,
  options: Object,
  validateData: Function,
  validateAssign: Function,
  pack: Function,
  unpack: Function,
  defaultValue: Function
};

export function checkProperties(objGetter, properties) {
  var locus = new Error();
  Object.keys(properties).forEach(name => it('should have the correct property ' + name, () => {
    try {
      var obj              = objGetter()
        , propValue        = obj[name]
        , propExpectedType = properties[name]
        ;
      if (typeof propExpectedType === 'function') {
        expect(propValue).to.not.be.undefined;
        expect(propValue.constructor).to.not.be.undefined;
        propValue.constructor.should.equal(propExpectedType);
      } else {
        expect(propValue).to.deep.equal(propExpectedType);
      }
    } catch (err) {
      err.stack = locus.stack;
      throw err;
    }
  }));
}
