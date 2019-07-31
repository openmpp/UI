/*
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
  dimension selection[] is an array of selected enums for each dimension

pvControl: {
  isRowColNames: true/false, if true then show row and column field label
  readValue():   function expected to return table cell value
  processValue:  functions are used to aggregate cell value(s)
  formatter: {
    format():   function (if defined) to convert cell value to string
    parse():    function (if defined) to convert cell string to value, ex: parseFloat(), used by editor only
    isValid():  function to validate cell value, used by editor only
  }

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
}

refreshTickle: watch true/false, on change pivot table view updated
  it is recommended to set
    refreshTickle = !refreshTickle
  after pvData[] or any selection[] changed

refreshDimsTickle: watch true/false, on change dimension properties updated
  it is recommended to set
    refreshDimsTickle = !refreshDimsTickle
  after dimension arrays initialized (after init of: rowFields[], colFields[], otherFields[])

refreshFormatTickle: watch true/false, on change body cells formatted value updated
  it is recommended to set
    refreshFormatTickle = !refreshFormatTickle
  after format options updated
*/

import * as Pcvt from './pivot-cvt'

export default {
  /* eslint-disable no-multi-spaces */
  props: {
    rowFields: { type: Array, default: () => [] },
    colFields: { type: Array, default: () => [] },
    otherFields: { type: Array, default: () => [] },
    pvData: {
      type: Array, default: () => [] // input data as array of objects
    },
    pvControl: {
      type: Object,
      default: () => ({
        isRowColNames: false,           // if true then show row and column field names
        readValue: (r) => (!r.IsNull ? r.Value : (void 0)),
        processValue: Pcvt.asIsPval,    // default value processing: return as is
        formatter: Pcvt.formatDefault,  // disable format(), parse() and validation by default
        cellClass: 'pv-cell-right'      // default cell value style: right justified number
      })
    },
    refreshTickle: {
      type: Boolean, required: true // on refreshTickle change pivot table view updated
    },
    refreshDimsTickle: {
      type: Boolean, required: true // on refreshDimsTickle change items labels updated
    },
    refreshFormatTickle: {
      type: Boolean, required: true // on refreshFormatTickle change cell values updated
    },
    pvEdit: { // editor options and state shared with parent
      type: Object,
      default: () => ({
        isEnabled: false,       // if true then edit value
        kind: Pcvt.EDIT_NUMBER, // default: numeric float or integer editor
        // current editor state
        isEdit: false,    // if true then edit in progress
        isUpdated: false, // if true then cell value(s) updated
        cellKey: '',      // current eidtor focus cell
        cellValue: '',    // current eidtor input value
        updated: {},      // updated cells
        history: [],      // update history
        lastHistory: 0    // length of update history, changed by undo-redo
      })
    },
  },

  data () {
    return {
      pvt: {
        rowCount: 0,  // table size: number of rows
        colCount: 0,  // table size: number of columns
        labels: {},   // row, column, other dimensions item labels, key: {dimensionName, itemCode}
        rows: Object.freeze([]),      // for each row:    array of item keys
        cols: Object.freeze([]),      // for each column: array of item keys
        rowKeys: Object.freeze([]),   // for each table row:    itemsToKey(rows[i])
        colKeys: Object.freeze([]),   // for each table column: itemsToKey(cols[j])
        cells: Object.freeze({}),     // body cells value, object key: cellKey
        cellKeys: Object.freeze([]),  // keys of table body values ordered by [row index, column index]
        rowSpans: Object.freeze({}),  // row span for each row label
        colSpans: Object.freeze({})   // column span for each column label
      },
      keyPos: [],         // position of each dimension item in cell key
      valueLen: 0,        // value input text size
      isSizeUpdate: false // if true then recalculate size
    }
  },
  /* eslint-enable no-multi-spaces */

  watch: {
    refreshTickle () {
      this.setData(this.pvData)
    },
    refreshDimsTickle () {
      this.setDimItemLabels()
    },
    refreshFormatTickle () {
      let vcells = {}
      for (const bkey in this.pvt.cells) {
        let src = this.pvt.cells[bkey].src
        vcells[bkey] = { src: src, fmt: this.pvControl.formatter.format(src) }
      }
      this.pvt.cells = Object.freeze(vcells)
    }
  },

  methods: {
    // start of editor methods
    //
    // start cell edit: enter into input control
    onCellKeyEnter (key) {
      this.cellInputStart(key)
    },
    onCellDblClick (key) {
      this.cellInputStart(key)
    },
    cellInputStart (key) {
      this.pvEdit.cellKey = key
      this.pvEdit.cellValue = this.getUpdatedSrc(key)
      this.$nextTick(() => {
        if (this.$refs[key] && (this.$refs[key].length || 0) > 0) this.$refs[key][0].focus()
      })
    },

    // cancel input edit by escape
    onCellInputEscape () {
      const ckey = this.pvEdit.cellKey
      this.$nextTick(() => {
        this.$nextTick(() => {
          if (this.$refs[ckey] && (this.$refs[ckey].length || 0) > 0) this.$refs[ckey][0].focus()
        })
      })
      this.pvEdit.cellKey = ''
      this.pvEdit.cellValue = ''
    },

    // confirm input edit: finish cell edit and keep focus at the same cell
    onCellInputConfirm () {
      const ckey = this.pvEdit.cellKey
      this.cellInputConfirm(this.pvEdit.cellValue, ckey)
      this.$nextTick(() => {
        this.$nextTick(() => {
          if (this.$refs[ckey] && (this.$refs[ckey].length || 0) > 0) this.$refs[ckey][0].focus()
        })
      })
      this.pvEdit.cellKey = ''
      this.pvEdit.cellValue = ''
    },
    // confirm input edit by lost focus
    onCellInputBlur () {
      const ckey = this.pvEdit.cellKey
      this.cellInputConfirm(this.pvEdit.cellValue, ckey)
      this.pvEdit.cellKey = ''
      this.pvEdit.cellValue = ''
    },

    // confirm input edit: validate and save changes in edit history
    cellInputConfirm (val, key) {
      // validate input
      if (!this.pvControl.formatter.isValid(val)) {
        this.$emit('pv-message', 'Invalid (or empty) value entered')
        return false
      }  

      // compare input value with previous
      const now = this.pvControl.formatter.parse(val)
      const prev = this.pvEdit.updated.hasOwnProperty(key) ? this.pvEdit.updated[key] : this.pvt.cells[key].src

      if (now === prev || (now === '' && prev === void 0)) return true // exit if value not changed

      // store updated value and append it change history
      this.pvEdit.updated[key] = now
      this.pvEdit.isUpdated = true

      if (this.pvEdit.lastHistory < this.pvEdit.history.length) {
        this.pvEdit.history.splice(this.pvEdit.lastHistory)
      }
      this.pvEdit.history.push({
        key: key,
        now: now,
        prev: prev
      })
      this.pvEdit.lastHistory = this.pvEdit.history.length

      return true
    },

    // return updated cell value or default if value not updated
    getUpdatedSrc(key) {
      return this.pvEdit.isUpdated && this.pvEdit.updated.hasOwnProperty(key) ? this.pvEdit.updated[key] : this.pvt.cells[key].src
    },
    getUpdatedFmt(key) {
      return this.pvEdit.isUpdated && this.pvEdit.updated.hasOwnProperty(key) ? this.pvControl.formatter.format(this.pvEdit.updated[key]) : this.pvt.cells[key].fmt
    },
    getUpdatedFmtToDisplay(key) {
      let v = this.getUpdatedFmt(key)
      return (v !== void 0 && v !== '') ? v : '\u00a0' // value or &nbsp;
    },

    // undo last edit changes
    doUndo () {
      if (this.pvEdit.lastHistory <= 0) return // exit: entire history already undone

      let n = --this.pvEdit.lastHistory
      let key = this.pvEdit.history[n].key

      let isPrev = false
      for (let k = 0; !isPrev && k < n; k++) {
        isPrev = this.pvEdit.history[k].key === key
      }
      if (isPrev) {
        this.pvEdit.updated[key] = this.pvEdit.history[n].prev
      } else {
        delete this.pvEdit.updated[key]
        this.pvEdit.isUpdated = !!this.pvEdit.updated && this.pvEdit.lastHistory > 0
      }
      this.updatedNextTick(key)
    },
    // redo most recent undo
    doRedo () {
      if (this.pvEdit.lastHistory >= this.pvEdit.history.length) return // exit: already at the end of history

      let n = this.pvEdit.lastHistory++
      let key = this.pvEdit.history[n].key
      this.pvEdit.updated[key] = this.pvEdit.history[n].now
      this.pvEdit.isUpdated = true

      this.updatedNextTick(key)
    },
    // show updated cell value
    updatedNextTick (key) {
      this.$nextTick(() => {
        if (this.$refs[key] && (this.$refs[key].length || 0) === 1) {
          this.$refs[key][0].textContent = this.getUpdatedFmtToDisplay(key) // value or &nbsp;
          this.$refs[key][0].focus()
        }
      })
    },

    // arrows navigation
    onLeftArrow(nRow, nCol) {
      if (nCol > 0) this.focusToRowCol(nRow, nCol - 1)
    },
    onRightArrow(nRow, nCol) {
      if (nCol < this.pvt.colCount - 1) this.focusToRowCol(nRow, nCol + 1)
    },
    onDownArrow(nRow, nCol) {
      if (nRow < this.pvt.rowCount - 1) this.focusToRowCol(nRow + 1, nCol)
    },
    onUpArrow(nRow, nCol) {
      if (nRow > 0) this.focusToRowCol(nRow - 1, nCol)
    },
    // set cell focus to rowNumber+columnNumber
    focusToRowCol (nRow, nCol) {
      if (nRow < 0 || nRow > this.pvt.rowCount - 1 || nCol < 0 || nCol > this.pvt.colCount - 1) return // at the edge of table body

      let nextKey = this.pvt.cellKeys[nRow * this.pvt.colCount + nCol]
      if (this.$refs[nextKey] && (this.$refs[nextKey].length || 0) === 1) this.$refs[nextKey][0].focus()
    },

    // paste tab separated values from clipboard, event.preventDefault done by event modifier
    onPaste (e) {
      if (!e || !e.target) {
        console.log('Paste error: event target unknown')
        return false
      }
      let t = e.target

      const nTop = parseInt((t.getAttribute('data-om-nrow') || ''), 10)
      const nLeft = parseInt((t.getAttribute('data-om-ncol') || ''), 10)
      if (isNaN(nTop) || isNaN(nLeft)) {
        console.log('Paste error: event target row or column undefined')
        return false
      }

      // get clipboard values
      let pv = ''
      if (e.clipboardData && e.clipboardData.getData) {
        pv = e.clipboardData.getData('text') || ''
      } else {
        if (window.clipboardData && window.clipboardData.getData) pv = window.clipboardData.getData('Text') || ''
      }
      if (!pv || typeof pv !== typeof 'string') {
        this.$emit('pv-message', 'Empty (or invalid) paste: tab separated value(s) expected')
        return false
      }

      // parse tab separated values
      let lines = pv.split(/\r\n|\r|\n/)
      let nL = (lines.length || 0)
      if (nL > 0 && lines[nL - 1] === '') nL-- // ignore last line if it is empty
      if (nL < 1) {
        this.$emit('pv-message', 'Empty (or invalid) paste: tab separated value(s) expected')
        return false
      }
      if (nTop + nL > this.pvt.rowCount) {
        this.$emit('pv-message', 'Too many rows pasted: ' + nL.toString())
        return false
      }

      let apv = Array(nL)
      for (let k = 0; k < nL; k++) {
        let la = lines[k].split('\t')
        if (nLeft + (la.length || 0) > this.pvt.colCount) {
          this.$emit('pv-message', 'Too many columns pasted: ' + la.length.toString() + ' at row: ' + k.toString())
          return false
        }
        apv[k] = (la.length || 0) > 0 ? la : ['']
      }

      // for each value do input into the cell
      // if this is enum based parameter and cell values are labels then convert enum labels to enum id's
      let isToEnumId = this.pvEdit.kind === Pcvt.EDIT_ENUM && !this.pvControl.formatter.options().isSrcValue

      for (let k = 0; k < nL; k++) {
        for (let j = 0; j < apv[k].length; j++) {
          let ckey = this.pvt.cellKeys[(nTop + k) * this.pvt.colCount + (nLeft + j)]
          
          let val = apv[k][j]
          if (isToEnumId) {
            val = this.pvControl.formatter.enumIdByLabel(val)
            if (val === void 0 || val === '') {
              this.$emit('pv-message', 'Inavlid enum label at row: ' + k.toString() + ' column: ' + j.toString())
              return false
            }
          }

          // do input into the cell
          if (!this.cellInputConfirm(val, ckey)) return false // input validation failed
          this.updatedNextTick(ckey)
        }
      }
      return true // success
    },
    tsvFromClipboard () {
      // TODO: keep cell focus before button click
      console.log('tsvFromClipboard')
    },
    //
    // end of editor methods

    // copy tab separated values to clipboard
    tsvToClipboard () {
      let tsv = ''

      // prefix for each column header: empty '' value * by count of row dimensions
      let cp = ''
      for (let nFld = 0; nFld < this.rowFields.length; nFld++) {
        cp += '\t'
      }

      // table header: items of column dimensions
      for (let nFld = 0; nFld < this.colFields.length; nFld++) {
        tsv += cp
        for (let nCol = 0; nCol < this.pvt.colCount; nCol++) {
          tsv += (this.pvt.labels[this.colFields[nFld].name][this.pvt.cols[nCol][nFld]] || '') + (nCol < this.pvt.colCount - 1 ? '\t' : '\r\n')
        }
      }

      // table body: headers of each row and body cell values
      for (let nRow = 0; nRow < this.pvt.rowCount; nRow++) {
        // items of row dimemensions
        for (let nFld = 0; nFld < this.rowFields.length; nFld++) {
          tsv += (this.pvt.labels[this.rowFields[nFld].name][this.pvt.rows[nRow][nFld]] || '') + '\t'
        }

        // body cell values
        if (!this.pvEdit.isEdit) {
          for (let nCol = 0; nCol < this.pvt.colCount; nCol++) {
            tsv += this.pvt.cells[this.pvt.cellKeys[nRow * this.pvt.colCount + nCol]].fmt + (nCol < this.pvt.colCount - 1 ? '\t' : '\r\n')
          }
        } else {
          for (let nCol = 0; nCol < this.pvt.colCount; nCol++) {
            tsv += this.getUpdatedFmt(this.pvt.cellKeys[nRow * this.pvt.colCount + nCol]) + (nCol < this.pvt.colCount - 1 ? '\t' : '\r\n')
          }
        }
      }

      // copy to clipboard
      let isOk = Pcvt.toClipboard(tsv)

      this.$emit('pv-message', isOk ? 'Copy tab separated values to clipboard: ' + tsv.length + ' characters' : 'Failed to copy tab separated values to clipboard')
      return isOk
    },

    // set item labels for for all dimensions: rows, columns, other
    setDimItemLabels () {
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

    // get enum label by dimension name and enum item value
    getDimItemLabel (dimName, enumValue) {
      return this.pvt.labels.hasOwnProperty(dimName) ? (this.pvt.labels[dimName][enumValue] || '') : ''
    },

    // update pivot table from input data page
    setData (d) {
      // clean existing view
      this.pvt.rowCount = 0
      this.pvt.colCount = 0
      this.pvt.rows = Object.freeze([])
      this.pvt.cols = Object.freeze([])
      this.pvt.rowKeys = Object.freeze([])
      this.pvt.colKeys = Object.freeze([])
      this.pvt.cells = Object.freeze({})
      this.pvt.cellKeys = Object.freeze([])
      this.pvt.rowSpans = Object.freeze({})
      this.pvt.colSpans = Object.freeze({})
      this.keyPos = []
      this.valueLen = 0
      this.isSizeUpdate = false

      // if response is empty or invalid: clean table
      const len = (!!d && (d.length || 0) > 0) ? d.length : 0
      if (!d || len <= 0) {
        return
      }

      // make dimensions field selector:
      //  read dimension items from input record
      //  check if item is in dropdown filter values
      //  return comparator to sort items in the order of dimension enums
      const makeProc = (field, isRow = false, isCol = false) => {
        //
        let selected = Array(field.selection.length)
        for (let k = 0; k < field.selection.length; k++) {
          selected[k] = field.selection[k].value
        }

        return {
          isRow: isRow,
          isCol: isCol,
          name: field.name,
          isCellKey: isRow || isCol || selected.length === 1, // use field item as body cell key
          cellKeyItem: selected.length === 1 ? selected[0] : void 0, // if only single item selected then use it as body cell key
          keyPos: 0,
          read: field.read,
          filter: (v) => selected.includes(v),
          compare: (left, right) => {
            const nL = field.enums.findIndex(e => (left === e.value))
            const nR = field.enums.findIndex(e => (right === e.value))
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

      const isScalar = recProc.length === 0 // scalar parameter with only one sub-value

      let cellKeyLen = 0
      for (const p of recProc) {
        if (!p.isCellKey) continue
        cellKeyLen++
        for (const rp of recProc) {
          if (!rp.isCellKey) continue
          if (p.name > rp.name) p.keyPos++
        }
      }

      // process all input records: check if it match selection filters and aggregate values
      const rowKeyLen = this.rowFields.length
      const colKeyLen = this.colFields.length
      let vrows = []
      let vcols = []
      let rKeys = {}
      let cKeys = {}
      let vcells = {}
      let vstate = {}

      for (let nSrc = 0; nSrc < len; nSrc++) {
        // check if record match selection filters
        let isSel = true
        let r = Array(rowKeyLen)
        let c = Array(colKeyLen)
        let b = Array(cellKeyLen)
        let i = 0
        let j = 0
        for (const p of recProc) {
          let v = p.read(d[nSrc])
          isSel = p.filter(v)
          if (!isSel) break
          if (p.isRow) r[i++] = v
          if (p.isCol) c[j++] = v
          if (p.isCellKey) b[p.keyPos] = v
        }
        if (!isSel) continue // skip row: dimension item is not in filter values

        // build list of rows and columns keys
        let rk = Pcvt.itemsToKey(r)
        if (!rKeys[rk]) {
          rKeys[rk] = true
          vrows.push(r)
        }
        let ck = Pcvt.itemsToKey(c)
        if (!cKeys[ck]) {
          cKeys[ck] = true
          vcols.push(c)
        }

        // extract value(s) from record and aggregate
        let v = this.pvControl.readValue(d[nSrc])

        let bkey = isScalar ? Pcvt.PV_KEY_SCALAR : Pcvt.itemsToKey(b)
        if (!vstate.hasOwnProperty(bkey)) {
          vstate[bkey] = this.pvControl.processValue.init()
          vcells[bkey] = { src: void 0, fmt: void 0 }
        }
        if (v !== void 0 || v !== null) {
          vcells[bkey].src = this.pvControl.processValue.doNext(v, vstate[bkey])
        }
      }

      // if format() not empty then format values else use source value as formatted value
      for (const bkey in vcells) {
        vcells[bkey].fmt = this.pvControl.formatter.format(vcells[bkey].src)
      }

      // sort row keys and column keys in the order of dimension items
      const cmpKeys = (keyLen, aCmp) => {
        return (leftKey, rightKey) => {
          for (let k = 0; k < keyLen; k++) {
            let v = aCmp[k](leftKey[k], rightKey[k])
            if (v !== 0) return v
          }
          return 0
        }
      }
      vrows.sort(cmpKeys(rowKeyLen, rCmp))
      vcols.sort(cmpKeys(colKeyLen, cCmp))

      // calculate span for rows and columns
      const itemSpans = (keyLen, itemArr) => {
        if (!itemArr || itemArr.length < 1) return {} // no items: no rows or columns

        let prev = Array(keyLen).fill('')
        let idx = Array(keyLen).fill(0)
        let itSpan = {}

        for (let i = 0; i < itemArr.length; i++) {
          for (let j = 0; j < keyLen; j++) {
            if (itemArr[i][j] === prev[j]) { // if value same as previous then increase span
              itSpan[idx[j] * keyLen + j]++
              continue
            }
            // else new value: new span of all fields at this field and after
            for (let k = j; k < keyLen; k++) {
              prev[k] = itemArr[i][k]
              idx[k] = i
              itSpan[i * keyLen + k] = 1
            }
            break // next line: done with current fields - new span strated
          }
        }

        return itSpan
      }

      let rsp = itemSpans(rowKeyLen, vrows)
      let csp = itemSpans(colKeyLen, vcols)

      // sorted keys: row keys, column keys, body value keys
      const rowCount = vrows.length
      const colCount = vcols.length

      let vrk = Array(rowCount)
      let n = 0
      for (const r of vrows) {
        vrk[n++] = Pcvt.itemsToKey(r)
      }

      let vck = Array(colCount)
      n = 0
      for (const c of vcols) {
        vck[n++] = Pcvt.itemsToKey(c)
      }

      // body cell key is row dimension(s) items, column dimension(s) items
      // and filter items: items other dimension(s) where only one item selected
      let b = Array(cellKeyLen)
      let nkp = Array(cellKeyLen)
      let kp = {}
      for (let k = 0; k < recProc.length; k++) {
        if (!recProc[k].isCellKey) continue
        nkp[recProc[k].keyPos] = {
          name: recProc[k].name, pos: recProc[k].keyPos
        }
        kp[recProc[k].name] = recProc[k].keyPos
        if (!recProc[k].isRow && !recProc[k].isCol) {
          b[recProc[k].keyPos] = recProc[k].cellKeyItem // add selected item to cell key
        }
      }

      let vkeys = Array(rowCount * colCount)
      n = 0
      for (const r of vrows) {
        for (let k = 0; k < rowKeyLen; k++) { // add row items to key
          b[kp[this.rowFields[k].name]] = r[k]
        }
        for (const c of vcols) {
          for (let k = 0; k < colKeyLen; k++) { // add column items to key
            b[kp[this.colFields[k].name]] = c[k]
          }
          vkeys[n++] = Pcvt.itemsToKey(b)
        }
      }
      // scalar parameter with only one sub-value
      if (isScalar && vkeys.length === 1) {
        if (vkeys[0] === '') vkeys[0] = Pcvt.PV_KEY_SCALAR
      }

      // done
      this.pvt.rowCount = rowCount
      this.pvt.colCount = colCount
      this.pvt.rows = Object.freeze(vrows)
      this.pvt.cols = Object.freeze(vcols)
      this.pvt.rowKeys = Object.freeze(vrk)
      this.pvt.colKeys = Object.freeze(vck)
      this.pvt.cells = Object.freeze(vcells)
      this.pvt.cellKeys = Object.freeze(vkeys)
      this.pvt.rowSpans = Object.freeze(rsp)
      this.pvt.colSpans = Object.freeze(csp)
      this.keyPos = nkp
      this.valueLen = 0
      this.isSizeUpdate = this.pvEdit.isEnabled // update size only if edit value enabled

      this.$emit('pv-key-pos', this.keyPos)
    }
  },

  // on table html updated: if required for editor then recalculate size of input text
  updated () {
    if (!this.isSizeUpdate) return // size update not required

    // max length of cell value as string
    let ml = 0
    for (const bkey in this.pvt.cells) {
      if (this.pvt.cells[bkey].src !== void 0) {
        let n = (this.pvt.cells[bkey].src.toString() || '').length
        if (ml < n) ml = n
      }
    }
    if (this.valueLen < ml) this.valueLen = ml

    // find max column client width
    let mw = 0

    if (this.colFields.length > 0) {
      let prf = 'cth-' + (this.colFields.length - 1).toString() + '-'

      for (let nCol = 0; nCol < this.pvt.colCount; nCol++) {
        let thLst = this.$refs[prf + nCol.toString()]
        if (thLst && (thLst.length || 0) > 0) {
          let n = thLst[thLst.length - 1].clientWidth || 0
          if (n > mw) mw = n
        }
      }
    }

    if (!mw) {
      let thPad = this.$refs.cthPad
      if (thPad) {
        let n = thPad.clientWidth || 0
        if (n > mw) mw = n
      }
    }

    // adjust input text size based on clientWidth
    if (mw) {
      let nc = Math.floor((mw - 9) / 9) - 1
      if (this.valueLen < nc) this.valueLen = nc
    }
    this.isSizeUpdate = false
  },

  mounted () {
    this.setDimItemLabels()
    this.setData(this.pvData)
  }
}
