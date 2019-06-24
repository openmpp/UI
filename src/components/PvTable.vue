<!-- pivot table view -->
<!--
Properties:

rowFields[], colFields[], otherFields[]: array of dimensions, example:
  {
    name: 'dim0',
    label: 'Salary',
    read: (r) => (r.DimIds.length > 0 ? r.DimIds[0] : void 0),
    selection: [],
    enums: [
      { value: 100, text: 'Low' },
      { value: 200, text: 'Medium' },
      { value: 300, text: 'High' }
    ]
  }

pvData: array of table rows, example:
    { DimIds: [100, 0], IsNull: false, Value: 895.5, ExprId: 0 }
  or:
    { DimIds: [10, 0], IsNull: false, Value: 0.1, SubId: 0 }
    ....
  dimension read() function expected to return enum value from row
  readValue() function expected to return table cell value
  processValue functions are used to aggregate cell value(s)
  formatValue function (if defined) is used to convert cell value to string
  dimension selection[] is an array of selected enums for each dimension

readValue(): function, example:
  readValue: (r) => (!r.IsNull ? r.Value : (void 0))

processValue{}: object with two methods,
  doNext() applied to each input row readValue() return, example:
  {
    // sum
    init: () => ({ result: void 0 }),
    doNext: (val, state) => {
      let v = parseFloat(val)
      if (!isNaN(v)) state.result = (state.result || 0) + v
      return state.result
    }
  }
  default processValue{} return value as is, (no conversion or aggregation)

formatValue(): function to convert cell value to display output, example:
    formatValue: (val) => (val.toFixed(2))
  if formatValue() undefined and it is not called

showRowColNames: true/false, if true then show row and column field label

refreshTickle: watch true/false, on change pivot table view updated
  it is recommended to set
    refreshTickle = !refreshTickle
  after pvData[] or any selection[] changed

refreshDimsTickle: watch true/false, on change deimension properties updated
  it is recommended to set
    refreshDimsTickle = !refreshDimsTickle
  after dimension arrays initialized (after init of: rowFields[], colFields[], otherFields[])
-->
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
              v-if="!!pvt.colSpans[nCol + '_' + nFld]"
              :colspan="pvt.colSpans[nCol + '_' + nFld]"
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
          <th class="pv-rc-pad"></th>
        </tr>

      </thead>
      <tbody>

        <tr v-for="(row, nRow) in pvt.rows" :key="pvt.rowKeys[nRow]">
          <template v-for="(rf, nFld) in rowFields">
            <th
              :key="rf.name"
              v-if="!!pvt.rowSpans[nRow + '_' + nFld]"
              :colspan="(!!colFields.length && nFld === rowFields.length - 1) ? 2 : 1"
              :rowspan="pvt.rowSpans[nRow + '_' + nFld]"
              class="pv-row-head">
                {{getEnumLabel(rf.name, row[nFld])}}
            </th>
          </template>
          <th v-if="!rowFields.length && !!colFields.length" class="pv-rc-pad"></th>
          <td v-for="(col, nCol) in pvt.cols" :key="pvt.colKeys[nCol]" :class="cellClass">
            <slot name="cell"
              :cell="{key: pvt.valKeys[nRow * pvt.colCount + nCol], value: pvt.vals[pvt.valKeys[nRow * pvt.colCount + nCol]]}"
              >{{pvt.vals[pvt.valKeys[nRow * pvt.colCount + nCol]]}}</slot>
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
              v-if="!!pvt.colSpans[nCol + '_' + nFld]"
              :colspan="pvt.colSpans[nCol + '_' + nFld]"
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
              v-if="!!pvt.rowSpans[nRow + '_' + nFld]"
              :rowspan="pvt.rowSpans[nRow + '_' + nFld]"
              class="pv-row-head">
                {{getEnumLabel(rf.name, row[nFld])}}
            </th>
          </template>
          <td v-for="(col, nCol) in pvt.cols" :key="pvt.colKeys[nCol]" :class="cellClass">
            <slot name="cell"
              :cell="{key: pvt.valKeys[nRow * pvt.colCount + nCol], value: pvt.vals[pvt.valKeys[nRow * pvt.colCount + nCol]]}"
              >{{pvt.vals[pvt.valKeys[nRow * pvt.colCount + nCol]]}}</slot>
          </td>
        </tr>
      </tbody>

    </template>
  </table>

</template>

<script>
import * as Pcvt from './pivot-cvt'

const RC_KEY_SEP = '|' + String.fromCharCode(2) + '|'
const KEY_ITEM_SEP = String.fromCharCode(1) + '-'

export default {

  props: {
    showRowColNames: {
      type: Boolean, default: false // if true then show row and column field names
    },
    refreshTickle: {
      type: Boolean, required: true // on refreshTickle change pivot table view updated
    },
    refreshDimsTickle: {
      type: Boolean, required: true // on refreshDimsTickle change enum labels updated
    },
    refreshValuesTickle: {
      type: Boolean, required: true // on refreshValuesTickle change cell values updated
    },
    rowFields: { type: Array, default: () => [] },
    colFields: { type: Array, default: () => [] },
    otherFields: { type: Array, default: () => [] },
    pvData: {
      type: Array, default: () => [] // input data as array of objects
    },
    readValue: {
      type: Function,
      required: true
    },
    processValue: {
      type: Object,
      default: Pcvt.asIsPval
    },
    formatValue: {
      type: Function,
      default: void 0 // disable format() value by default
    },
    cellClass: { type: String, default: 'pv-val-num' }
  },

  /* eslint-disable no-multi-spaces */
  data () {
    return {
      pvt: {
        rows: [],     // for each row array of item keys
        cols: [],     // for each column array of item keys
        rowKeys: [],  // keys of table rows:    itKey(rows[i])
        colKeys: [],  // keys of table columns: itKey(cols[j])
        rowCount: 0,  // table row count
        colCount: 0,  // table column count
        vals: {},     // formatted body values, object key: rcKey()
        srcVals: {},  // cource body values, object key: rcKey()
        valKeys: [],  // keys of table body values: rcKey(row[i], cols[j])
        labels: {},   // dimension (row, column, other) item labels, key: {dimensionName, itemCode}
        rowSpans: {}, // row span for each row label
        colSpans: {}  // column span for each column label
      },
      itKey: (it) => (it.join(KEY_ITEM_SEP)),
      rcKey: (row, col) => (this.itKey(row) + RC_KEY_SEP + this.itKey(col))
    }
  },
  /* eslint-enable no-multi-spaces */

  watch: {
    refreshTickle () {
      this.setData(this.pvData)
    },
    refreshDimsTickle () {
      this.setEnumLabels()
    },
    refreshValuesTickle () {
      let vfmt = this.applyFormat(this.pvt.srcVals, this.formatValue)
      this.pvt.vals = Object.freeze(vfmt)
    }
  },

  methods: {
    // set enum labels for all dimensions: rows, columns, other
    setEnumLabels () {
      const makeLabels = (dims) => {
        for (let f of dims) {
          let ls = {}

          // make enum labels
          for (const e of f.enums) {
            ls[e.value] = e.text
          }
          this.pvt.labels[f.name] = ls
        }
      }

      this.pvt.labels = {}
      makeLabels(this.rowFields)
      makeLabels(this.colFields)
      makeLabels(this.otherFields)
    },

    // get enum label by dimension name and enum value
    getEnumLabel (dimName, enumValue) {
      return this.pvt.labels.hasOwnProperty(dimName) ? (this.pvt.labels[dimName][enumValue] || '') : ''
    },

    // update pivot table from input data page
    setData (d) {
      // clean existing view
      this.pvt.rows = []
      this.pvt.cols = []
      this.pvt.rowKeys = []
      this.pvt.colKeys = []
      this.pvt.rowCount = 0
      this.pvt.colCount = 0
      this.pvt.vals = {}
      this.pvt.srcVals = {}
      this.pvt.valKeys = []
      this.pvt.rowSpans = {}
      this.pvt.colSpans = {}

      // if response is empty or invalid: clean table
      const len = (!!d && (d.length || 0) > 0) ? d.length : 0
      if (!d || len <= 0) {
        return
      }

      // make dimensions field selector:
      //  read dimension items from input record
      //  check if item is in dropdown filter values
      //  return comparator to sort items in the order of dimension enums
      const makeProc = (f, isRow = false, isCol = false) => {
        //
        let selected = Array(f.selection.length)
        for (let k = 0; k < f.selection.length; k++) {
          selected[k] = f.selection[k].value
        }

        return {
          isRow: isRow,
          isCol: isCol,
          read: f.read,
          filter: (v) => selected.includes(v),
          compare: (left, right) => {
            const nL = f.enums.findIndex(e => (left === e.value))
            const nR = f.enums.findIndex(e => (right === e.value))
            if (nL >= 0 && nR >= 0) {
              return nL - nR
            }
            if (nL >= 0 && nR < 0) return -1
            if (nL < 0 && nR >= 0) return 1
            return left < right ? -1 : (left > right ? 1 : 0)
          }
        }
      }

      let recProc = []
      let rCmp = []
      let cCmp = []
      for (const f of this.rowFields) {
        let p = makeProc(f, true, false)
        recProc.push(p)
        rCmp.push(p.compare)
      }
      for (const f of this.colFields) {
        let p = makeProc(f, false, true)
        recProc.push(p)
        cCmp.push(p.compare)
      }
      for (const f of this.otherFields) {
        recProc.push(makeProc(f, false, false))
      }

      // process all input records: check if it match selection filters and aggregate values
      const rowKeyLen = this.rowFields.length
      const colKeyLen = this.colFields.length
      let vrows = []
      let vcols = []
      let rKeys = {}
      let cKeys = {}
      let vbody = {}
      let vstate = {}

      for (let k = 0; k < len; k++) {
        // check if record match selection filters
        let isSel = true
        let r = Array(rowKeyLen)
        let c = Array(colKeyLen)
        let i = 0
        let j = 0
        for (const p of recProc) {
          let v = p.read(d[k])
          isSel = p.filter(v)
          if (!isSel) break
          if (p.isRow) r[i++] = v
          if (p.isCol) c[j++] = v
        }
        if (!isSel) continue // skip row: dimension item is not in filter values

        // build list of rows and columns keys
        let rk = this.itKey(r)
        if (!rKeys[rk]) {
          rKeys[rk] = true
          vrows.push(r)
        }
        let ck = this.itKey(c)
        if (!cKeys[ck]) {
          cKeys[ck] = true
          vcols.push(c)
        }

        // extract value(s) from record and aggregate
        let v = this.readValue(d[k])
        if (v === void 0 || v === null) continue // skip: empty value

        let rck = rk + RC_KEY_SEP + ck
        if (!vstate.hasOwnProperty(rck)) {
          vstate[rck] = this.processValue.init()
        }
        vbody[rck] = this.processValue.doNext(v, vstate[rck])
      }

      // if format() not empty then format values
      let vfmt = this.applyFormat(vbody, this.formatValue)

      // sort row keys and column keys in the order of dimension items
      const cmpKeys = (aCmp) => {
        const keyLen = aCmp.length
        return (leftKey, rightKey) => {
          for (let k = 0; k < keyLen; k++) {
            let v = aCmp[k](leftKey[k], rightKey[k])
            if (v !== 0) return v
          }
          return 0
        }
      }
      vrows.sort(cmpKeys(rCmp))
      vcols.sort(cmpKeys(cCmp))

      // calculate span for rows and columns
      const itemSpans = (itemArr) => {
        if (!itemArr || itemArr.length < 1) return {} // no items: no rows or columns

        const nLen = itemArr.length
        const nFlds = itemArr[0].length // expected rectangular array of items
        let prev = Array(nFlds).fill('')
        let idx = Array(nFlds).fill(0)
        let itSpan = {}

        for (let i = 0; i < nLen; i++) {
          for (let j = 0; j < nFlds; j++) {
            if (itemArr[i][j] === prev[j]) { // if value same as previous then increase span
              itSpan[idx[j] + '_' + j]++
              continue
            }
            // else new value: new span of all fields at this field and after
            for (let k = j; k < nFlds; k++) {
              prev[k] = itemArr[i][k]
              idx[k] = i
              itSpan[i + '_' + k] = 1
            }
            break // next line: done with current fields - new span strated
          }
        }

        return itSpan
      }

      let rsp = itemSpans(vrows)
      let csp = itemSpans(vcols)

      // store keys: row keys, column keys, body value keys
      let vrk = Array(vrows.length || 1)
      let n = 0
      for (let r of vrows) {
        vrk[n++] = this.itKey(r)
      }

      let vck = Array(vcols.length || 1)
      n = 0
      for (let c of vcols) {
        vck[n++] = this.itKey(c)
      }

      let vkeys = Array((vrows.length || 1) * (vcols.length || 1))
      n = 0
      for (let r of vrows) {
        for (let c of vcols) {
          vkeys[n++] = this.rcKey(r, c)
        }
      }

      // done
      this.pvt.rowCount = vrows.length
      this.pvt.colCount = vcols.length
      this.pvt.rows = Object.freeze(vrows)
      this.pvt.cols = Object.freeze(vcols)
      this.pvt.rowKeys = Object.freeze(vrk)
      this.pvt.colKeys = Object.freeze(vck)
      this.pvt.rowSpans = Object.freeze(rsp)
      this.pvt.colSpans = Object.freeze(csp)
      this.pvt.srcVals = Object.freeze(vbody)
      this.pvt.vals = Object.freeze(vfmt)
      this.pvt.valKeys = Object.freeze(vkeys)
    },

    // apply format() to all source values, if format defined else return source values as is
    applyFormat (srcVals, format) {
      if (!format) return srcVals

      let vfmt = {}
      for (let rck in srcVals) {
        vfmt[rck] = format(srcVals[rck])
      }
      return vfmt
    }
  },

  mounted () {
    this.setEnumLabels()
    this.setData(this.pvData)
  }
}
</script>

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
