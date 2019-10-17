import { findKey } from 'lodash';

export class AttributeMapping {
    constructor(mapping) {
        this.attributeMapping = mapping;
    }

    getUiAttribute(externalAttribute) {
        const internalAttribute = findKey(this.attributeMapping, function(value) {
            return value === externalAttribute;
        });
        return internalAttribute || externalAttribute;
    }

    getApiAttribute(internalAttribute) {
        return this.attributeMapping[internalAttribute] || internalAttribute;
    }
}