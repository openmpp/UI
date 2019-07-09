<!-- pivot table view -->
<template>

  <table class="pv-main-table">
    <template v-if="!!showRowColNames"><!-- if do show row and column fields name -->

      <thead>

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
                {{getEnumLabel(cf.name, col[nFld])}}
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
      <tbody>

        <tr v-for="(row, nRow) in pvt.rows" :key="pvt.rowKeys[nRow]">
          <template v-for="(rf, nFld) in rowFields">
            <th
              :key="rf.name"
              v-if="!!pvt.rowSpans[nRow * rowFields.length + nFld]"
              :colspan="(!!colFields.length && nFld === rowFields.length - 1) ? 2 : 1"
              :rowspan="pvt.rowSpans[nRow * rowFields.length + nFld]"
              class="pv-row-head">
                {{getEnumLabel(rf.name, row[nFld])}}
            </th>
          </template>
          <th v-if="!rowFields.length && !!colFields.length" class="pv-rc-pad"></th>
          <td v-for="(col, nCol) in pvt.cols" :key="pvt.colKeys[nCol]" :class="cellClass">
            <slot name="cell"
              :cell="pvt.cells[pvt.cellKeys[nRow * pvt.colCount + nCol]]">{{pvt.cells[pvt.cellKeys[nRow * pvt.colCount + nCol]].value}}</slot>
          </td>
        </tr>
      </tbody>

    </template>
    <template v-else><!-- else: do not show row and column fields name -->

      <thead>
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
                {{getEnumLabel(cf.name, col[nFld])}}
            </th>
          </template>
        </tr>
      </thead>

      <tbody>
        <tr v-for="(row, nRow) in pvt.rows" :key="pvt.rowKeys[nRow]">
          <template v-for="(rf, nFld) in rowFields">
            <th :key="rf.name"
              v-if="!!pvt.rowSpans[nRow * rowFields.length + nFld]"
              :rowspan="pvt.rowSpans[nRow * rowFields.length + nFld]"
              class="pv-row-head">
                {{getEnumLabel(rf.name, row[nFld])}}
            </th>
          </template>
          <td v-for="(col, nCol) in pvt.cols" :key="pvt.colKeys[nCol]" :class="cellClass">
            <slot name="cell"
              :cell="pvt.cells[pvt.cellKeys[nRow * pvt.colCount + nCol]]">{{pvt.cells[pvt.cellKeys[nRow * pvt.colCount + nCol]].value}}</slot>
          </td>
        </tr>
      </tbody>

    </template>
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
.pv-cell {
  font-size: 0.875rem;
  padding: 0.25rem;
  border: 1px solid lightgrey;
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

</style>
