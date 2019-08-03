<!-- pivot table view -->
<template>

  <table
    class="pv-main-table"
    @copy="tsvToClipboard">

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
            :ref="'cth-' + nFld + '-' + nCol"
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
            :ref="'cth-' + nFld + '-' + nCol"
            v-if="!!pvt.colSpans[nCol * colFields.length + nFld]"
            :colspan="pvt.colSpans[nCol * colFields.length + nFld]"
            class="pv-col-head">
              {{getDimItemLabel(cf.name, col[nFld])}}
          </th>
        </template>
      </tr>

    </thead>

    <!-- table body: pivot view -->
    <tbody v-if="!pvEdit.isEdit">

      <tr v-for="(row, nRow) in pvt.rows" :key="pvt.rowKeys[nRow]">

        <!-- row headers: row dimension(s) item label -->
        <template v-for="(rf, nFld) in rowFields">
          <th
            :key="pvt.rowKeys[nRow] + '-' + nFld"
            v-if="!!pvt.rowSpans[nRow * rowFields.length + nFld]"
            :rowspan="pvt.rowSpans[nRow * rowFields.length + nFld]"
            :colspan="(pvControl.isRowColNames && !!colFields.length && nFld === rowFields.length - 1) ? 2 : 1"
            class="pv-row-head">
              {{getDimItemLabel(rf.name, row[nFld])}}
          </th>
        </template>
        <!-- empty row headers if all dimensions on the columns and "show dimensions name" enabled -->
        <th v-if="pvControl.isRowColNames && !rowFields.length && !!colFields.length" class="pv-rc-pad"></th>

        <!-- table body value cells -->
        <template>
          <td v-for="(col, nCol) in pvt.cols" :key="pvt.cellKeys[nRow * pvt.colCount + nCol]"
            :class="pvControl.cellClass">{{pvt.cells[pvt.cellKeys[nRow * pvt.colCount + nCol]].fmt}}</td>
        </template>
      </tr>

    </tbody>
    <!-- table body: pivot editor -->
    <tbody v-else
      @paste.prevent="onPaste($event)"
      @keydown.enter.exact="onKeyEnter($event)"
      @dblclick="onDblClick($event)"
      @keyup.ctrl.90="doUndo"
      @keyup.ctrl.89="doRedo"
      @keydown.left.exact="onLeftArrow($event)"
      @keydown.right.exact="onRightArrow($event)"
      @keydown.down.exact="onDownArrow($event)"
      @keydown.up.exact="onUpArrow($event)"
      >

      <tr v-for="(row, nRow) in pvt.rows" :key="pvt.rowKeys[nRow]">

        <!-- row headers: row dimension(s) item label -->
        <template v-for="(rf, nFld) in rowFields">
          <th
            :key="pvt.rowKeys[nRow] + '-' + nFld"
            v-if="!!pvt.rowSpans[nRow * rowFields.length + nFld]"
            :rowspan="pvt.rowSpans[nRow * rowFields.length + nFld]"
            :colspan="(pvControl.isRowColNames && !!colFields.length && nFld === rowFields.length - 1) ? 2 : 1"
            class="pv-row-head">
              {{getDimItemLabel(rf.name, row[nFld])}}
          </th>
        </template>
        <!-- empty row headers if all dimensions on the columns and "show dimensions name" enabled -->
        <th v-if="pvControl.isRowColNames && !rowFields.length && !!colFields.length" class="pv-rc-pad"></th>

        <!-- table body value cells: readonly cells and edit input cell (if edit in progress) -->
        <td v-for="(col, nCol) in pvt.cols" :key="getRenderKey(pvt.cellKeys[nRow * pvt.colCount + nCol])"
          :class="pvControl.cellClass"
          >
          <template v-if="pvt.cellKeys[nRow * pvt.colCount + nCol] !== pvEdit.cellKey"> <!-- eidtor: readonly cells -->
            <span
              :ref="pvt.cellKeys[nRow * pvt.colCount + nCol]"
              :data-om-nrow="nRow"
              :data-om-ncol="nCol"
              tabindex="0"
              role="button"
              class="pv-cell-view">{{getUpdatedToDisplay(pvt.cellKeys[nRow * pvt.colCount + nCol])}}</span>
          </template>
          <template v-else>
            <template v-if="pvEdit.kind === 2"> <!-- checkbox editor for boolean value -->
              <input
                type="checkbox"
                v-model.lazy="pvEdit.cellValue"
                :ref="pvt.cellKeys[nRow * pvt.colCount + nCol]"
                @keydown.enter.stop="onCellInputConfirm"
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
                @keydown.enter.stop="onCellInputConfirm"
                @blur="onCellInputBlur"
                @keydown.esc="onCellInputEscape"
                tabindex="0"
                role="button"
                class="pv-cell-font mdc-typography--body1">
                  <option v-for="opt in pvControl.formatter.getEnums()" :key="opt.value" :value="opt.value">{{opt.text}}</option>
              </select>
            </template>
            <template v-else> <!-- default editor for float, integer or string value -->
              <input
                type="text"
                v-model="pvEdit.cellValue"
                :ref="pvt.cellKeys[nRow * pvt.colCount + nCol]"
                @keydown.enter.stop="onCellInputConfirm"
                @dblclick.stop="onCellInputConfirm"
                @blur="onCellInputBlur"
                @keydown.esc="onCellInputEscape"
                tabindex="0"
                role="button"
                class="pv-cell-input mdc-typography--body1"
                :size="valueLen" />
            </template>
          </template>
        </td>
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

// table body cells: readonly view or editor input
.pv-cell-right {
  text-align: right;
  @extend .pv-cell;
}
.pv-cell-left {
  text-align: left;
  @extend .pv-cell;
}
.pv-cell-center {
  text-align: center;
  @extend .pv-cell;
}
.pv-cell-view {
  width: 100%;
  height: 100%;
  display: inline-block;
  @extend .pv-cell-font;
  &:focus {
    background-color: gainsboro;
  }
}
.pv-cell-input { // input text
  border: 0;
  padding: 0px 1px;
  background-color: #e6e6e6;
  @extend .pv-cell-font;
}
</style>
