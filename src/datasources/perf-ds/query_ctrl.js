import './modal_ctrl';
import {QueryType} from './constants';
import {QueryCtrl} from 'app/plugins/sdk';
import appEvents from 'app/core/app_events';
import { filter, forEach, isNull, isUndefined, sortBy, take } from 'lodash';

const RESOURCE_ID_NO_NODE = /node(Source)?\[.*?]\.(.*)$/;

export class OpenNMSQueryCtrl extends QueryCtrl {
  /** @ngInject */
  constructor($rootScope, $scope, $injector, $q, $modal) {
    super($scope, $injector);

    this.types = QueryType;

    this.error = this.validateTarget();
    this.$rootScope = $rootScope;
    this.$q = $q;
    this.$modal = $modal;
  }

  openNodeSelectionModal() {
    const self = this;
    this.showSelectionModal("nodes", {
      '#': 'id',
      'Label': 'label',
      'Foreign ID': 'foreignId',
      'sysName': 'sysName'
    }, function (query) {
      return self.datasource
        .searchForNodes(query)
        .then(function (results) {
          return {
            'count': results.data.count,
            'totalCount': results.data.totalCount,
            'rows': results.data.node
          };
        });
    }, function (node) {
      if (!isUndefined(node.foreignId) && !isNull(node.foreignId) &&
        !isUndefined(node.foreignSource) && !isNull(node.foreignSource)) {
        // Prefer fs:fid
        self.target.nodeId = node.foreignSource + ":" + node.foreignId;
      } else {
        // Fallback to node id
        self.target.nodeId = node.id;
      }
      self.targetBlur('nodeId');
    });
  }

  openResourceSelectionModal() {
    const self = this;

    function filterResources(resources, query) {
      let filteredResources = resources;
      if (query.length >= 1) {
        query = query.toLowerCase();
        filteredResources = filter(resources, function (resource) {
          return resource.key.indexOf(query) >= 0;
        });
      }

      // Limit the results - it takes along time to render if there are too many
      const totalCount = filteredResources.length;
      filteredResources = take(filteredResources, self.datasource.searchLimit);

      return {
        'count': filteredResources.length,
        'totalCount': totalCount,
        'rows': filteredResources
      };
    }

    self.nodeResources = undefined;
    this.showSelectionModal("resources", {
      'Label': 'label',
      'Name': 'name'
    }, function (query) {
      if (self.nodeResources !== undefined) {
        const deferred = self.$q.defer();
        deferred.resolve(filterResources(self.nodeResources, query));
        return deferred.promise;
      }

      return self.datasource.getResourcesWithAttributesForNode(self.target.nodeId)
        .then(function (resources) {
          // Compute a key for more efficient searching
          forEach(resources, function (resource) {
            resource.key = resource.label.toLowerCase() + resource.name.toLowerCase();
          });
          // Sort the list once
          self.nodeResources = sortBy(resources, function (resource) {
            return resource.label;
          });
          // Filter
          return filterResources(self.nodeResources, query);
        });
    }, function (resource) {
      // Exclude the node portion of the resource id
      const match = RESOURCE_ID_NO_NODE.exec(resource.id);
      self.target.resourceId = match[2];
      self.targetBlur('resourceId');
    });
  }

  openAttributeSelectionModal(prop) {
    const self = this;

    if (!prop) {
      prop = 'attribute';
    }

    this.showSelectionModal("attributes", {
      'Name': 'name'
    }, function (query) {
      return self.datasource
        .suggestAttributes(self.target.nodeId, self.target.resourceId, query)
        .then(function (attributes) {
          const namedAttributes = [];
          forEach(attributes, function (attribute) {
            namedAttributes.push({'name': attribute});
          });

          return {
            'count': namedAttributes.length,
            'totalCount': namedAttributes.length,
            'rows': namedAttributes
          };
        });
    }, function (attribute) {
      self.target[prop] = attribute.name;
      self.targetBlur(prop);
    });
  }

  openFilterSelectionModal() {
    const self = this;
    this.showSelectionModal("filters", {
      'Name': 'name',
      'Description': 'description',
      'Backend': 'backend'
    }, function () {
      return self.datasource
        .getAvailableFilters()
        .then(function (results) {
          return {
            'count': results.data.length,
            'totalCount': results.data.length,
            'rows': results.data
          };
        });
    }, function (filter) {
      self.target.filter = filter;
      self.targetBlur('filter');
    });
  }

  showSelectionModal(label, columns, search, callback) {
    const scope = this.$rootScope.$new();

    scope.label = label;
    scope.columns = columns;
    scope.search = search;

    scope.result = this.$q.defer();
    scope.result.promise.then(callback);

    const modal = this.$modal({
      template: 'public/plugins/opennms-helm-app/datasources/perf-ds/partials/modal.selection.html',
      persist: false,
      show: false,
      scope: scope,
      keyboard: false
    });
    this.$q.when(modal).then(function (modalEl) { modalEl.modal('show'); });
  }

  targetBlur(targetId, required) {
    if (required === undefined) {
      required = true;
    }
    const errorMessage = this.validateTarget(targetId, required);
    if (errorMessage) {
      appEvents.emit('alert-error', ['Error', errorMessage]);
      this.error = errorMessage;
    } else {
      // Only send valid requests to the API
      this.refresh();
    }
  }

  validateTarget(targetId, required) {
    if (this.target.type === QueryType.Attribute || this.target.type === QueryType.Expression) {
      const messages = {
        'nodeId': "You must supply a node id.",
        'resourceId': "You must supply a resource id.",
        'attribute': "You must supply an attribute.",
        'expression': "You must supply an expression.",
        'label': "You must supply a label."
      };
      if (required && targetId in messages && !this.target[targetId]) {
        return messages[targetId];
      } else if (required && !this.target[targetId]) {
        // Fallback error message if the targetId doesn't have a specific message defined
        return targetId + ' is a required field.';
      }
    } else if (this.target.type === QueryType.Filter) {
      if (targetId == 'filterName' && (!this.target.filter || !this.target.filter.name)) {
        return "You must select a filter.";
      } else if (required && (!this.target.filterParameters || !(targetId in this.target.filterParameters) || !this.target.filterParameters[targetId])) {
        return targetId + ' is a required field.';
      }
    }
    return null;
  }

  getCollapsedText() {
    if (this.target.type === QueryType.Attribute) {
      return "Attribute: " + this.target.attribute;
    } else if (this.target.type === QueryType.Expression) {
      return "Expression: " + this.target.label;
    } else if (this.target.type === QueryType.Filter) {
      return "Filter: " + this.target.filter.name;
    } else {
      return "<Incomplete>";
    }
  }
}

OpenNMSQueryCtrl.templateUrl = 'datasources/perf-ds/partials/query.editor.html';
