<!-- pivot table view -->
<!--
Props:
Array of dimensions (rowFields[], colFields[], otherFields[]) example:
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

Array of table rows pvData example:
    { DimIds: [100, 0], IsNull: false, Value: 895.5, ExprId: 0 }
  or:
    { DimIds: [10, 0], IsNull: false, Value: 0.1, SubId: 0 }
    ....
  dimension read() function expected to return enum value from row
  readValue() function expected to return table cell value
  processValue functions are used to aggregate cell value(s)
  dimension selection[] is an array of selected enums for each dimension

Function readValue() example:
  readValue: (r) => (!r.IsNull ? r.Value : (void 0))

Object processValue{} example:
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

True/false showRowColNames: if true then show row and column field label

Watch true/false refreshTickle: on change pivot table view updated
  it is recommended to set
    refreshTickle = !refreshTickle
  after pvData[] or any selection[] changed

Watch true/false refreshDimsTickle: on change deimension properties updated
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
              :key="itKey(col)"
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

        <tr v-for="(row, nRow) in pvt.rows" :key="itKey(row)">
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
          <td v-for="col in pvt.cols" :key="itKey(col)" class="pv-val-num">
            {{pvt.vals[rcKey(row, col)]}}
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
              :key="itKey(col)"
              v-if="!!pvt.colSpans[nCol + '_' + nFld]"
              :colspan="pvt.colSpans[nCol + '_' + nFld]"
              class="pv-col-head">
                {{getEnumLabel(cf.name, col[nFld])}}
            </th>
          </template>
        </tr>
      </thead>

      <tbody>
        <tr v-for="(row, nRow) in pvt.rows" :key="itKey(row)">
          <template v-for="(rf, nFld) in rowFields">
            <th :key="rf.name"
              v-if="!!pvt.rowSpans[nRow + '_' + nFld]"
              :rowspan="pvt.rowSpans[nRow + '_' + nFld]"
              class="pv-row-head">
                {{getEnumLabel(rf.name, row[nFld])}}
            </th>
          </template>
          <td v-for="col in pvt.cols" :key="itKey(col)" class="pv-val-num">
            {{pvt.vals[rcKey(row, col)]}}
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
      default: () => (Pcvt.asIsPval)
    }
  },

  data () {
    return {
      pvt: {
        rows: [],
        cols: [],
        vals: {},
        labels: {},
        rowSpans: {},
        colSpans: {}
      },
      itKey: (it) => (it.join(KEY_ITEM_SEP)),
      rcKey: (row, col) => (this.itKey(row) + RC_KEY_SEP + this.itKey(col))
    }
  },

  watch: {
    refreshTickle () {
      this.setData(this.pvData)
    },
    refreshDimsTickle () {
      this.setEnumLabels()
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
      this.pvt.rowSpans = {}
      this.pvt.colSpans = {}
      this.pvt.vals = {}

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

      // done
      this.pvt.rows = vrows
      this.pvt.cols = vcols
      this.pvt.rowSpans = Object.freeze(rsp)
      this.pvt.colSpans = Object.freeze(csp)
      this.pvt.vals = Object.freeze(vbody)
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
}
.pv-hdr {
  @extend .medium-wt;
  @extend .pv-cell;
  background-color: whitesmoke;
  border: 1px solid lightgrey;
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
  border: 1px solid lightgrey;
}

</style>
