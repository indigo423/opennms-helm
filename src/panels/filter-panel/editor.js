import _ from 'lodash';

export class FilterPanelEditorCtrl {
  /** @ngInject */
  constructor($scope, $q, uiSegmentSrv) {
    this.$q = $q;
    this.$scope = $scope;
    this.uiSegmentSrv = uiSegmentSrv;
    $scope.editor = this;
    this.panelCtrl = $scope.ctrl;
    this.panel = this.panelCtrl.panel;

    this.srcIndex = undefined;
    this.destIndex = undefined;

    this.addColumnSegment = uiSegmentSrv.newPlusButton();
    let editor = document.querySelectorAll('.editor-row')[0];
    for (const e of [ 'dragstart', 'dragover', 'dragleave', 'drop']) {
      //console.log('adding listener: ' + e);
      editor.addEventListener(e, (evt) => { this.handleEvent(e, evt); }, false);
    }
  }

  removeClasses(...classes) {
    for (const c of classes) {
      const cols = document.querySelectorAll('.' + c);
      [].forEach.call(cols, (col) => {
        col.classList.remove(c);
      });
    }
  }

  getTarget(evt) {
    if (evt.srcElement && evt.srcElement.offsetParent) {
      let target = evt.srcElement.offsetParent;
      if (target && target.id && target.classList && target.classList.contains('column-reorder')) {
        return target;
      }
    }
    // dragleave is only fired for the label and not the parent container
    if (evt.target && evt.target.parent && evt.target.parent.classList && evt.target.parent.classList.contains('column-reorder')) {
      return evt.target.parent;
    }
  }

  handleEvent(type, evt) {
    const target = this.getTarget(evt);
    const id = evt.srcElement.id;

    switch(type) {
      case 'dragstart':
        evt.srcElement.classList.add('picked-up');
        evt.dataTransfer.effectAllowed = 'move';
        // Internet Explorer doesn't support "text/html":
        // https://stackoverflow.com/a/28740710
        try {
          evt.dataTransfer.setData('text/html', evt.srcElement.innerHTML);
        } catch (error) {
          evt.dataTransfer.setData('text', evt.srcElement.innerHTML);
        }
        if (id) {
          this.srcIndex = parseInt(id.replace(/^column-/, ''), 10);
          console.log('picking up "' + this.panel.columns[this.srcIndex].text + '"');
        }
        break;
      case 'dragover':
        if (evt.preventDefault) {
          evt.preventDefault();
        }
        evt.dataTransfer.dropEffect = 'move';
        if (target && target.id && target.classList && target.classList.contains('column-reorder')) {
          const columnIndex = parseInt(target.id.replace(/^column-/, ''), 10);
          if (!target.classList.contains('over')) {
            //console.log('entering ' + this.panel.columns[columnIndex].text);
            this.removeClasses('over');
            target.classList.add('over');
            this.destIndex = columnIndex;
          }
        }
        break;
      case 'dragleave':
        if (target && evt.screenX !== 0 && evt.screenY !== 0) {
          //const columnIndex = parseInt(target.id.replace(/^column-/, ''), 10);
          //console.log('leaving ' + this.panel.columns[columnIndex].text);
          this.destIndex = undefined;
          this.removeClasses('over');
        }
        break;
      case 'drop':
        if (eval.stopPropagation) {
          evt.stopPropagation();
        }
        if (this.srcIndex !== undefined && this.destIndex !== undefined) {
          this.$scope.$apply(() => {
            this.panel.columns.splice(this.destIndex, 0, this.panel.columns.splice(this.srcIndex, 1)[0]);
            this.panelCtrl.render();
          });
          console.log('dropped "' + this.panel.columns[this.srcIndex].text + '" onto "' + this.panel.columns[this.destIndex].text + '"');
        } else {
          const targetIndex = (this.srcIndex == undefined) ? 'source' : 'destination';
          console.log(`WARNING: drop event received but ${targetIndex} was unset.`);
        }
        this.removeClasses('over', 'picked-up');
        return false;
      default:
        console.log('WARNING: unhandled event type: ' + type);
    }
  }

  getColumnOptions() {
    if (!this.panelCtrl.columnData || !this.panelCtrl.columnData.columns) {
      return this.$q.when([]);
    }
    let columns = this.panelCtrl.columnData.columns;
    // Filter out columns that have already been selected
    let self = this;
    columns = columns.filter(function(a){return self.panel.columns.indexOf(a) < 0});
    let segments = _.map(columns, (c) => this.uiSegmentSrv.newSegment({value: c.text}));
    return this.$q.when(segments);
  }

  addColumn() {
    if (!this.panelCtrl.columnData || !this.panelCtrl.columnData.columns) {
      return;
    }

    let columns = this.panelCtrl.columnData.columns;
    let column = _.find(columns, {text: this.addColumnSegment.value});

    if (column) {
      this.panel.columns.push(column);
      this.render();
    }

    let plusButton = this.uiSegmentSrv.newPlusButton();
    this.addColumnSegment.html = plusButton.html;
    this.addColumnSegment.value = plusButton.value;
  }

  transformChanged() {
    this.panel.columns = [];
    if (this.panel.transform === 'timeseries_aggregations') {
      this.panel.columns.push({text: 'Avg', value: 'avg'});
    }

    this.render();
  }

  render() {
    this.panelCtrl.render();
  }

  removeColumn(column) {
    this.panel.columns = _.without(this.panel.columns, column);
    this.panelCtrl.render();
  }
}

/** @ngInject */
export function filterPanelEditor($q, uiSegmentSrv) { // eslint-disable-line no-unused-vars
  'use strict';
  return {
    restrict: 'E',
    scope: true,
    templateUrl: '/public/plugins/opennms-helm-app/panels/filter-panel/editor.html',
    controller: FilterPanelEditorCtrl,
  };
}
