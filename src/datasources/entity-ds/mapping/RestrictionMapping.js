import { forEach, map } from 'lodash';

import {ComparatorMapping} from './ComparatorMapping'
import {ClauseMapping} from './ClauseMapping'
import {ValueMapping} from './ValueMapping';
import {UI} from '../UI'
import {API} from 'opennms';

export class RestrictionMapping {

    constructor(uiSegmentSrv, entity) {
        this.uiSegmentSrv = uiSegmentSrv;
        this.entity = entity;
    }

    getUiRestriction(apiRestriction) {
        if (apiRestriction instanceof API.NestedRestriction) {
            return this.getUiQuery(apiRestriction);
        } else {
            return new UI.Restriction(
                this.uiSegmentSrv,
                new UI.RestrictionDTO(
                    this.entity.getAttributeMapping().getUiAttribute(apiRestriction.attribute),
                    new ComparatorMapping().getUiComparator(apiRestriction.comparator),
                    new ValueMapping().getUiValue(apiRestriction.attribute, apiRestriction.value)
                )
            );
        }
    }

    getUiQuery(apiNestedRestriction) {
        const self = this;
        const uiQuery = new UI.Query(this.uiSegmentSrv);
        const uiClauses = map(apiNestedRestriction.clauses, clause => {
            return new ClauseMapping(self.uiSegmentSrv, self.entity).getUiClause(clause);
        });
        forEach(uiClauses, uiClause => {
            uiQuery.addClause(uiClause);
        });
        return uiQuery;
    }

    getApiRestriction(uiRestriction) {
        if (uiRestriction instanceof UI.Query) {
            return this.getApiNestedRestriction(uiRestriction);
        } else {
            const restrictionDTO = uiRestriction.asRestrictionDTO();
            if (restrictionDTO !== null) {
                const attribute = this.entity.getAttributeMapping().getApiAttribute(restrictionDTO.attribute);
                const comparator = new ComparatorMapping().getApiComparator(restrictionDTO.comparator);
                const value = new ValueMapping().getApiValue(restrictionDTO.attribute, restrictionDTO.value);
                return new API.Restriction(attribute, comparator, value);
            }
            return null;
        }
    }

    getApiNestedRestriction(uiQuery) {
        const self = this;
        const nestedRestriction = new API.NestedRestriction();
        forEach(uiQuery.clauses, uiClause => {
            const apiClause = new ClauseMapping(self.uiSegmentSrv, self.entity).getApiClause(uiClause);
            if (apiClause !== null) {
                nestedRestriction.withClause(apiClause);
            }
        });
        return nestedRestriction;
    }
}
