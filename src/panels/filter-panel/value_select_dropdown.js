import angular from 'angular';
import { filter, find, forEach, indexOf, map } from 'lodash';
import coreModule from 'app/core/core_module';

export class OnmsValueSelectDropdownCtrl {
  /*
  dropdownVisible: any;
  highlightIndex: any;
  linkText: any;
  oldVariableText: any;
  options: any;
  search: any;
  selectedTags: any;
  selectedValues: any;
  tags: any;
  variable: any;

  hide: any;
  onUpdated: any;
  */

  /** @ngInject */
  constructor($q) {
    this.$q = $q;
  }

  show() {
    this.oldVariableText = this.variable.current.text;
    this.highlightIndex = -1;

    this.options = this.variable.options;
    this.selectedValues = filter(this.options, { selected: true });

    this.tags = map(this.variable.tags, value => {
      let tag = { text: value, selected: false };
      forEach(this.variable.current.tags, tagObj => {
        if (tagObj.text === value) {
          tag = tagObj;
        }
      });
      return tag;
    });

    this.search = {
      query: '',
      options: this.options.slice(0, Math.min(this.options.length, 1000)),
    };

    this.dropdownVisible = true;
  }

  updateLinkText() {
    const current = this.variable.current;

    if (current.tags && current.tags.length) {
      // filer out values that are in selected tags
      const selectedAndNotInTag = filter(this.variable.options, option => {
        if (!option.selected) {
          return false;
        }
        for (let i = 0; i < current.tags.length; i++) {
          const tag = current.tags[i];
          if (indexOf(tag.values, option.value) !== -1) {
            return false;
          }
        }
        return true;
      });

      // convert values to text
      const currentTexts = map(selectedAndNotInTag, 'text');

      // join texts
      this.linkText = currentTexts.join(' + ');
      if (this.linkText.length > 0) {
        this.linkText += ' + ';
      }
    } else {
      this.linkText = this.variable.current.text;
    }
  }

  clearSelections() {
    this.selectedValues = filter(this.options, { selected: true });

    if (this.selectedValues.length > 1) {
      forEach(this.options, option => {
        option.selected = false;
      });
    } else {
      forEach(this.search.options, option => {
        option.selected = true;
      });
    }
    this.selectionsChanged(false);
  }

  selectTag(tag) {
    tag.selected = !tag.selected;
    let tagValuesPromise;
    if (!tag.values) {
      tagValuesPromise = this.variable.getValuesForTag(tag.text);
    } else {
      tagValuesPromise = this.$q.when(tag.values);
    }

    return tagValuesPromise.then(values => {
      tag.values = values;
      tag.valuesText = values.join(' + ');
      forEach(this.options, option => {
        if (indexOf(tag.values, option.value) !== -1) {
          option.selected = tag.selected;
        }
      });

      this.selectionsChanged(false);
    });
  }

  keyDown(evt) {
    if (evt.keyCode === 27) {
      this.hide();
    }
    if (evt.keyCode === 40) {
      this.moveHighlight(1);
    }
    if (evt.keyCode === 38) {
      this.moveHighlight(-1);
    }
    if (evt.keyCode === 13) {
      if (this.search.options.length === 0) {
        this.commitChanges();
      } else {
        this.selectValue(this.search.options[this.highlightIndex], {}, true, false);
      }
    }
    if (evt.keyCode === 32) {
      this.selectValue(this.search.options[this.highlightIndex], {}, false, false);
    }
  }

  moveHighlight(direction) {
    this.highlightIndex = (this.highlightIndex + direction) % this.search.options.length;
  }

  selectValue(option, event, commitChange, excludeOthers) {
    if (!option) {
      return;
    }

    option.selected = this.variable.multi ? !option.selected : true;

    commitChange = commitChange || false;
    excludeOthers = excludeOthers || false;

    const setAllExceptCurrentTo = (newValue) => {
      forEach(this.options, other => {
        if (option !== other) {
          other.selected = newValue;
        }
      });
    };

    // commit action (enter key), should not deselect it
    if (commitChange) {
      option.selected = true;
    }

    if (option.text === 'All' || excludeOthers) {
      setAllExceptCurrentTo(false);
      commitChange = true;
    } else if (!this.variable.multi) {
      setAllExceptCurrentTo(false);
      commitChange = true;
    } else if (event.ctrlKey || event.metaKey || event.shiftKey) {
      commitChange = true;
      setAllExceptCurrentTo(false);
    }

    this.selectionsChanged(commitChange);
  }

  selectionsChanged(commitChange) {
    this.selectedValues = filter(this.options, { selected: true });

    if (this.selectedValues.length > 1) {
      if (this.selectedValues[0].text === 'All') {
        this.selectedValues[0].selected = false;
        this.selectedValues = this.selectedValues.slice(1, this.selectedValues.length);
      }
    }

    // validate selected tags
    forEach(this.tags, tag => {
      if (tag.selected) {
        forEach(tag.values, value => {
          if (!find(this.selectedValues, { value: value })) {
            tag.selected = false;
          }
        });
      }
    });

    this.selectedTags = filter(this.tags, { selected: true });
    this.variable.current.value = map(this.selectedValues, 'value');
    this.variable.current.text = map(this.selectedValues, 'text').join(' + ');
    this.variable.current.tags = this.selectedTags;

    if (!this.variable.multi) {
      this.variable.current.value = this.selectedValues[0].value;
    }

    if (commitChange) {
      this.commitChanges();
    }
  }

  commitChanges() {
    // if we have a search query and no options use that
    if (this.search.options.length === 0 && this.search.query.length > 0) {
      this.variable.current = { text: this.search.query, value: this.search.query };
    } else if (this.selectedValues.length === 0 && this.options) {
      // make sure one option is selected
      this.options[0].selected = true;
      this.selectionsChanged(false);
    }

    this.dropdownVisible = false;
    this.updateLinkText();

    if (this.variable.current.text !== this.oldVariableText) {
      this.callOnUpdated();
    }
  }

  callOnUpdated() {
    this.onUpdated();
  }

  queryChanged() {
    this.highlightIndex = -1;
    this.search.options = filter(this.options, option => {
      return option.text.toLowerCase().indexOf(this.search.query.toLowerCase()) !== -1;
    });

    this.search.options = this.search.options.slice(0, Math.min(this.search.options.length, 1000));
  }

  init() {
    this.selectedTags = this.variable.current.tags || [];
    this.updateLinkText();
  }
}

/** @ngInject */
export function onmsValueSelectDropdown($compile, $window, $timeout, $rootScope) { // eslint-disable-line no-unused-vars
  return {
    scope: { dashboard: '=', variable: '=', onUpdated: '&' },
    templateUrl: 'public/plugins/opennms-helm-app/panels/filter-panel/valueSelectDropdown.html',
    controller: 'OnmsValueSelectDropdownCtrl',
    controllerAs: 'vm',
    bindToController: true,
    link: (scope, elem) => {
      const bodyEl = angular.element($window.document.body);
      const linkEl = elem.find('.variable-value-link');
      const inputEl = elem.find('input');

      function openDropdown() {
        inputEl.css('width', Math.max(linkEl.width(), 80) + 'px');

        inputEl.show();
        linkEl.hide();

        inputEl.focus();
        $timeout(
          () => {
            bodyEl.on('click', bodyOnClick);
          },
          0,
          false
        );
      }

      function switchToLink() {
        inputEl.hide();
        linkEl.show();
        bodyEl.off('click', bodyOnClick);
      }

      function bodyOnClick(e) {
        if (elem.has(e.target).length === 0) {
          scope.$apply(() => {
            scope.vm.commitChanges();
          });
        }
      }

      scope.$watch('vm.dropdownVisible', (newValue) => {
        if (newValue) {
          openDropdown();
        } else {
          switchToLink();
        }
      });

      scope.vm.dashboard.on(
        'template-variable-value-updated',
        () => {
          scope.vm.updateLinkText();
        },
        scope
      );

      scope.vm.init();
    },
  };
}

coreModule.controller('OnmsValueSelectDropdownCtrl', OnmsValueSelectDropdownCtrl);
coreModule.directive('onmsValueSelectDropdown', onmsValueSelectDropdown);
