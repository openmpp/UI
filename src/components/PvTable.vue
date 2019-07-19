<!-- pivot table view -->
<template>

  <table class="pv-main-table">

    <thead v-if="pvControl.isRowColNames"><!-- if do show row and column fields name -->

      <tr v-for="(cf, nFld) in colFields" :key="cf.name">
        <th
          v-if="nFld === 0 && !!rowFields.length"
          :colspan="rowFields.length"
          :rowspan="colFields.length"
          class="pv-rc-pad"></th>
        <th
          class="pv-rc-cell">{{cf.label}}</th>
        <template v-for="(col, nCol) in pvt.cols">
          <th
            :key="pvt.colKeys[nCol]"
            :ref="'cth-' + nFld.toString() + '-' + nCol.toString()"
            v-if="!!pvt.colSpans[nCol * colFields.length + nFld]"
            :colspan="pvt.colSpans[nCol * colFields.length + nFld]"
            :rowspan="(!!rowFields.length && nFld === colFields.length - 1) ? 2 : 1"
            class="pv-col-head">
              {{getDimItemLabel(cf.name, col[nFld])}}
          </th>
        </template>
      </tr>
      <tr v-if="!!rowFields.length">
        <th v-for="rf in rowFields"
          :key="rf.name"
          class="pv-rc-cell">
            {{rf.label}}
        </th>
        <th ref="cthPad" class="pv-rc-pad"></th>
      </tr>

    </thead>
    <thead v-else><!-- else: do not show row and column fields name -->

      <tr v-for="(cf, nFld) in colFields" :key="cf.name">
        <th
          v-if="nFld === 0 && !!rowFields.length"
          :colspan="rowFields.length"
          :rowspan="colFields.length"
          class="pv-rc-pad"></th>
        <template v-for="(col, nCol) in pvt.cols">
          <th
            :key="pvt.colKeys[nCol]"
            :ref="'cth-' + nFld.toString() + '-' + nCol.toString()"
            v-if="!!pvt.colSpans[nCol * colFields.length + nFld]"
            :colspan="pvt.colSpans[nCol * colFields.length + nFld]"
            class="pv-col-head">
              {{getDimItemLabel(cf.name, col[nFld])}}
          </th>
        </template>
      </tr>

    </thead>
    <tbody>

      <tr v-for="(row, nRow) in pvt.rows" :key="pvt.rowKeys[nRow]">
        <template v-for="(rf, nFld) in rowFields">
          <th
            :key="rf.name"
            v-if="!!pvt.rowSpans[nRow * rowFields.length + nFld]"
            :rowspan="pvt.rowSpans[nRow * rowFields.length + nFld]"
            :colspan="(pvControl.isRowColNames && !!colFields.length && nFld === rowFields.length - 1) ? 2 : 1"
            class="pv-row-head">
              {{getDimItemLabel(rf.name, row[nFld])}}
          </th>
        </template>
        <!-- empty row headers if all dimensions on the columns and "show dimensions name" enabled -->
        <th v-if="pvControl.isRowColNames && !rowFields.length && !!colFields.length" class="pv-rc-pad"></th>

        <!-- body value cells: pivot view -->
        <template v-if="!pvEdit.isEdit">
          <td v-for="(col, nCol) in pvt.cols" :key="pvt.colKeys[nCol]"
            :class="pvControl.cellClass">{{pvt.cells[pvt.cellKeys[nRow * pvt.colCount + nCol]].fmt}}</td>
        </template>

        <!-- body value cells: pivot editor -->
        <template v-else>
          <td v-for="(col, nCol) in pvt.cols" :key="pvt.colKeys[nCol]"
            :class="pvControl.cellClass"
            >
            <template v-if="pvt.cellKeys[nRow * pvt.colCount + nCol] !== pvEdit.cellKey">
              <span
                :ref="pvt.cellKeys[nRow * pvt.colCount + nCol]"
                @keydown.enter="onCellKeyEnter(pvt.cellKeys[nRow * pvt.colCount + nCol])"
                @dblclick="onCellDblClick(pvt.cellKeys[nRow * pvt.colCount + nCol])"
                @keyup.ctrl.90="doUndo"
                @keyup.ctrl.89="doRedo"
                tabindex="0"
                role="button"
                class="pv-cell-view">&nbsp;{{getUpdatedFmt(pvt.cellKeys[nRow * pvt.colCount + nCol])}}</span>
            </template>
            <template v-else>
              <template v-if="pvEdit.kind === 2"> <!-- checkbox editor for boolean value -->
                <input
                  type="checkbox"
                  v-model.lazy="pvEdit.cellValue"
                  :ref="pvt.cellKeys[nRow * pvt.colCount + nCol]"
                  @keydown.enter="onCellInputConfirm"
                  @blur="onCellInputBlur"
                  @keydown.esc="onCellInputEscape"
                  tabindex="0"
                  role="button"
                  class="mdc-typography--body1" />
              </template>
              <template v-else-if="pvEdit.kind === 3"> <!-- select dropdown editor for enum value -->
                <select
                  v-model.lazy="pvEdit.cellValue"
                  :ref="pvt.cellKeys[nRow * pvt.colCount + nCol]"
                  @keydown.enter="onCellInputConfirm"
                  @blur="onCellInputBlur"
                  @keydown.esc="onCellInputEscape"
                  tabindex="0"
                  role="button"
                  class="pv-cell-font mdc-typography--body1">
                    <option v-for="opt in pvEdit.enums" :key="opt.value" :value="opt.value">{{opt.text}}</option>
                </select>
              </template>
              <template v-else> <!-- default editor for float, integer or string value -->
                <input
                  type="text"
                  v-model="pvEdit.cellValue"
                  :ref="pvt.cellKeys[nRow * pvt.colCount + nCol]"
                  @keydown.enter="onCellInputConfirm"
                  @dblclick="onCellInputConfirm"
                  @blur="onCellInputBlur"
                  @keydown.esc="onCellInputEscape"
                  tabindex="0"
                  role="button"
                  class="pv-cell-input mdc-typography--body1"
                  :size="valueLen" />
              </template>
            </template>
          </td>
        </template>
      </tr>

    </tbody>
  </table>

</template>

<script src="./pv-table.js"></script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
@import "@/om-mcw.scss";

.pv-main-table {
  text-align: left;
  border-collapse: collapse;
}
.pv-cell-font {
  font-size: 0.875rem;
}
.pv-cell {
  padding: 0.25rem;
  border: 1px solid lightgrey;
  @extend .pv-cell-font;
}
.pv-hdr {
  @extend .medium-wt;
  @extend .pv-cell;
  background-color: whitesmoke;
}
.pv-col-head {
  text-align: center;
  @extend .pv-hdr;
}
.pv-row-head {
  text-align: left;
  @extend .pv-hdr;
}
.pv-rc {
  @extend .pv-hdr;
  // background-color: gainsboro;
  background-color: #e6e6e6;
}
.pv-rc-pad {
  @extend .pv-rc;
}
.pv-rc-cell {
  text-align: left;
  @extend .pv-rc;
}
.pv-val-num {
  text-align: right;
  @extend .pv-cell;
}
.pv-val-text {
  text-align: left;
  @extend .pv-cell;
}
.pv-val-center {
  text-align: center;
  @extend .pv-cell;
}

// table body cell: readonly view, input text
.pv-cell-view {
  width: 100%;
  height: 100%;
  display: inline-block;
  @extend .pv-cell-font;
}
.pv-cell-input {
  border: 0;
  padding: 0px 1px;
  background-color: #e6e6e6;
  @extend .pv-cell-font;
}
</style>
