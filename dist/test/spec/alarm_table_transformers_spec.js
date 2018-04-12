'use strict';

var _transformers = require('../panels/alarm-table/transformers');

var _table_model = require('../panels/alarm-table/table_model');

describe('Table transformer', function () {
  var transformer = void 0;

  beforeEach(function () {
    transformer = _transformers.transformers['table'];
  });

  describe('Listing the columns', function () {
    it('should return an empty list of columns when no data is present', function () {
      expect(transformer.getColumns([])).to.have.length(0);
    });

    it('should return an empty list of columns when the given table has no columns', function () {
      var table = new _table_model.TableModel();
      expect(transformer.getColumns([table])).to.have.length(0);
    });

    it('should return the list of columns when a table has columns', function () {
      var table = new _table_model.TableModel();
      table.columns = ['col1', 'col2', 'col3'];
      expect(transformer.getColumns([table])).to.eql(['col1', 'col2', 'col3']);
    });

    it('should return the intersection of all columns names when given multiple tables', function () {
      var t1 = new _table_model.TableModel();
      t1.columns = ['col1', 'col2', 'col3'];
      var t2 = new _table_model.TableModel();
      t2.columns = ['col1', 'col2', 'colx'];
      expect(transformer.getColumns([t1, t2])).to.eql(['col1', 'col2']);
    });
  });

  describe('Transforming the data', function () {
    it('should return all columns if none are specified in the panel definition', function () {
      var table = new _table_model.TableModel();
      table.columns.push("A");

      var row = [1];
      table.rows.push(row);

      var panel = {};
      var model = new _table_model.TableModel();

      transformer.transform([table], panel, model);
      expect(model.columns).to.eql(table.columns);
      expect(model.rows).to.eql(table.rows);
    });

    it('should filter the columns if one or more are specified in the panel definition', function () {
      var table = new _table_model.TableModel();
      table.columns.push('A', 'B', 'C');

      var actualRow = [1, 2, 3];
      var metadata = {
        'alarm': 'abc'
      };
      actualRow.meta = metadata;
      table.rows.push(actualRow);

      var panel = { columns: [{
          'text': 'B'
        }] };
      var model = new _table_model.TableModel();

      transformer.transform([table], panel, model);

      // The meta-data that was on the original row should also be present on the
      // transformed row
      var expectedRow = [2];
      expectedRow.meta = metadata;

      expect(model.columns).to.eql(panel.columns);
      expect(model.rows).to.eql([expectedRow]);
    });

    it('should re-order the columns according the order specified in the panel definition', function () {
      var table = new _table_model.TableModel();
      table.columns.push('A', 'B', 'C');
      table.rows.push([1, 2, 3]);

      var panel = { columns: [{
          'text': 'C'
        }, {
          'text': 'B'
        }] };
      var model = new _table_model.TableModel();

      transformer.transform([table], panel, model);

      expect(model.columns).to.eql(panel.columns);
      expect(model.rows).to.eql([[3, 2]]);
    });

    it('should use an undefined value when a column is present in the panel definition, but not in any of the tables', function () {
      var table = new _table_model.TableModel();
      table.columns.push('A', 'B', 'C');
      table.rows.push([1, 2, 3]);

      var panel = { columns: [{
          'text': 'C'
        }, {
          'text': 'Z'
        }, {
          'text': 'B'
        }] };
      var model = new _table_model.TableModel();

      transformer.transform([table], panel, model);

      expect(model.columns).to.eql(panel.columns);
      expect(model.rows).to.eql([[3, undefined, 2]]);
    });

    it('should combine multiple tables into a single table', function () {
      var t1 = new _table_model.TableModel();
      t1.columns.push("A");
      t1.rows.push([1]);

      var t2 = new _table_model.TableModel();
      t2.columns.push("A");
      t2.rows.push([2]);

      var panel = {};
      var model = new _table_model.TableModel();

      transformer.transform([t1, t2], panel, model);
      expect(model.columns).to.eql(t1.columns);
      expect(model.rows).to.eql([[1], [2]]);
    });

    it('should deduplicate alarms originating from the same datasource', function () {
      var alarm_from_ds1_as_row = [1];
      alarm_from_ds1_as_row.meta = {
        source: 'ds1',
        alarm: {
          id: 1
        }
      };

      var alarm_from_ds2_as_row = [2];
      alarm_from_ds2_as_row.meta = {
        source: 'ds2',
        alarm: {
          id: 1
        }
      };

      var t1 = new _table_model.TableModel();
      t1.columns.push("ID");
      t1.rows.push(alarm_from_ds1_as_row);

      var t2 = new _table_model.TableModel();
      t2.columns.push("ID");
      t2.rows.push(alarm_from_ds1_as_row);
      t2.rows.push(alarm_from_ds2_as_row);

      var panel = {};
      var model = new _table_model.TableModel();

      transformer.transform([t1, t2], panel, model);
      expect(model.columns).to.eql(t1.columns);
      // alarm_from_ds1_as_row should only appear once
      expect(model.rows).to.eql([alarm_from_ds1_as_row, alarm_from_ds2_as_row]);
    });
  });
});
//# sourceMappingURL=alarm_table_transformers_spec.js.map