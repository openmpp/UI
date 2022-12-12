/*
Properties:

rowFields[], colFields[], otherFields[]: array of dimensions, example of each element:
  {
    name: 'dim0',
    label: 'Salary',
    read: (r) => (r.DimIds.length > 0 ? r.DimIds[0] : void 0),
    selection: [],
    enums: [
      { value: 100, label: 'Low' },
      { value: 200, label: 'Medium' },
      { value: 300, label: 'High' }
    ]
  }

pvData: // array of table rows, for example:
    { DimIds: [100, 0], IsNull: false, Value: 895.5, ExprId: 0 }
  or:
    { DimIds: [10, 0], IsNull: false, Value: 0.1, SubId: 0 }
    ....
  dimension read() function expected to return enum value from row
  dimension selection[] is an array of selected enums for each dimension

pvControl: {
  rowColMode:   rows and columns mode: 2 = use spans, show dim names, 1 = use spans, hide dim names, 0 = no spans, hide dim names
  readValue():  function expected to return table cell value
  processValue: functions are used to aggregate cell value(s)
  formatter: {
    format():   function (if defined) to convert cell value to string
    parse():    function (if defined) to convert cell string to value, ex: parseFloat(), used by editor only
    isValid():  function to validate cell value, used by editor only
  }

  readValue(): // function, for example:
    readValue: (r) => (!r.IsNull ? r.Value : (void 0))

  processValue{}: // object with two methods:
    doNext() applied to each input row readValue() return, for example:
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

refreshViewTickle: watch true/false, on change pivot table view updated
  it is recommended to set
    refreshViewTickle = !refreshViewTickle
  after pvData[] or any selection[] changed

refreshDimsTickle: watch true/false, on change dimension properties updated
  it is recommended to set
    refreshDimsTickle = !refreshDimsTickle
  after dimension arrays initialized (after init of: rowFields[], colFields[], otherFields[])

if you are using pivot table editor then pvEdit is editor options and state shared with parent
pvEdit: {
  isEnabled: false,       // if true then edit value
  kind: Pcvt.EDIT_NUMBER, // numeric editor by default, other kinds: text, bool checkbox or enums dropdown
        // current editor state
  isEdit: false,    // if true then edit in progress
  isUpdated: false, // if true then cell value(s) updated
  cellKey: '',      // current eidtor focus cell
  cellValue: '',    // current eidtor input value
  updated: {},      // updated cells
  history: [],      // update history
  lastHistory: 0    // length of update history, changed by undo-redo
}
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
        rowColMode: Pcvt.NO_SPANS_NO_DIMS_PVT,  // rows and columns mode: 2 = use spans and show dim names, 1 = use spans and hide dim names, 0 = no spans and hide dim names
        isShowNames: false,                     // if true then show dimension names and item names instead of labels
        readValue: (r) => (!r.IsNull ? r.Value : (void 0)),
        processValue: Pcvt.asIsPval,    // default value processing: return as is
        formatter: Pcvt.formatDefault,  // disable format(), parse() and validation by default
        cellClass: 'pv-cell-right'      // default cell value style: right justified number
      })
    },
    refreshViewTickle: {
      type: Boolean, required: true // on refreshViewTickle change pivot table view updated
    },
    refreshDimsTickle: {
      type: Boolean, required: true // on refreshDimsTickle change items labels updated
    },
    pvEdit: { // editor options and state shared with parent
      type: Object,
      default: Pcvt.emptyEdit
    }
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
      keyRenderCount: 0,  // table body cell key suffix to force update
      renderKeys: {},     // for each cellKey string of: 'cellKey-keyRenderCount'
      keyPos: [],         // position of each dimension item in cell key
      valueLen: 0         // value input text size
    }
  },
  /* eslint-enable no-multi-spaces */

  watch: {
    refreshViewTickle () { this.setData(this.pvData) },
    refreshDimsTickle () { this.setDimItemLabels() },

    // on edit started event: set focus on top left cell
    isPvEditNow () {
      if (this.pvEdit.isEdit) {
        this.$nextTick(() => {
          this.focusToRowCol(0, 0)
          // this.updateValueLenByRowCol(0, 0)
        })
      }
    }
  },
  computed: {
    // return true if pivot table in edit mode
    isPvEditNow () {
      return this.pvEdit.isEdit
    },
    // return true if pivot table in edit mode and cell input mode
    isEditInput () {
      return this.pvEdit.isEdit && typeof this.pvEdit.cellKey === typeof 'string' && this.pvEdit.cellKey !== ''
    }
  },

  methods: {
    // table body cell render keys to force update
    getRenderKey (key) {
      return this.renderKeys.hasOwnProperty(key) ? this.renderKeys[key] : void 0
    },
    makeRenderKey (key) {
      return [key, this.keyRenderCount].join('-')
    },
    changeRenderKey (key) {
      this.renderKeys[key] = [key, ++this.keyRenderCount].join('-')
    },
    // return formatted cell value
    getCellValueFmt (key) {
      return this.pvControl.formatter.format(this.pvt.cells[key])
    },

    // start of editor methods
    //
    // return updated cell value or default if value not updated
    getUpdatedSrc (key) {
      return this.pvEdit.isUpdated && this.pvEdit.updated.hasOwnProperty(key) ? this.pvEdit.updated[key] : this.pvt.cells[key]
    },
    getUpdatedFmt (key) {
      return this.pvEdit.isUpdated && this.pvEdit.updated.hasOwnProperty(key)
        ? this.pvControl.formatter.format(this.pvEdit.updated[key])
        : this.pvControl.formatter.format(this.pvt.cells[key])
    },
    getUpdatedToDisplay (key) {
      const v = this.getUpdatedFmt(key)
      return (v !== void 0 && v !== '') ? v : '\u00a0' // value or &nbsp;
    },

    // start cell edit: enter into input control
    onKeyEnter (e) {
      const rc = this.rowColAttrs(e)
      if (rc) this.cellInputStart(rc.cRow, rc.cCol) // if this is table body cell then start input
    },
    onDblClick (e) {
      const rc = this.rowColAttrs(e)
      if (rc) this.cellInputStart(rc.cRow, rc.cCol) // if this is table body cell then start input
    },
    cellInputStart (nRow, nCol) {
      if (typeof nRow !== typeof 1 || typeof nCol !== typeof 1) {
        console.warn('Fail to start cell editing: invalid or undefined row or column')
        return
      }
      const key = this.pvt.cellKeys[nRow * this.pvt.colCount + nCol]
      this.updateValueLenByKey(key)
      this.pvEdit.cellKey = key
      this.pvEdit.cellValue = this.getUpdatedSrc(key)
      this.focusNextTick('input-cell')
    },

    // cancel input edit by escape
    onCellInputEscape () {
      const ckey = this.pvEdit.cellKey
      this.$nextTick(() => {
        this.focusNextTick(ckey)
      })
      this.pvEdit.cellKey = ''
      this.pvEdit.cellValue = ''
    },

    // confirm input edit by Enter: finish cell edit, move to next cell and start next cell edit
    onCellInputEnter (nRow, nCol) {
      const ckey = this.pvEdit.cellKey
      const isOk = this.cellInputConfirm(this.pvEdit.cellValue, ckey)
      this.pvEdit.cellKey = ''
      this.pvEdit.cellValue = ''
      this.$emit('pv-edit')
      // if invalid input or end of the table then stop edit and keep focus at the same cell
      if (!isOk || ((nRow || 0) >= this.pvt.rowCount - 1 && (nCol || 0) >= this.pvt.colCount - 1)) {
        this.$nextTick(() => { this.focusNextTick(ckey) })
        return
      }
      // else: move to next cell right and down
      let nr = nRow || 0
      let nc = nCol || 0
      if (nc < this.pvt.colCount - 1) {
        nc++
      } else {
        nr++
        nc = 0
      }
      // move focus to next cell (next right, next down) and start edit
      this.$nextTick(() => {
        this.focusToRowCol(nr, nc)
        this.$nextTick(() => { this.cellInputStart(nr, nc) })
      })
    },
    // confirm input edit: finish cell edit and keep focus at the same cell
    onCellInputConfirm () {
      const ckey = this.pvEdit.cellKey
      this.cellInputConfirm(this.pvEdit.cellValue, ckey)
      this.$nextTick(() => {
        this.focusNextTick(ckey)
      })
      this.pvEdit.cellKey = ''
      this.pvEdit.cellValue = ''
      this.$emit('pv-edit')
    },
    // confirm input edit by lost focus
    onCellInputBlur () {
      const ckey = this.pvEdit.cellKey
      if ((ckey || '') === '') return // exit on blur before focus: Chrome vs Firefox
      this.cellInputConfirm(this.pvEdit.cellValue, ckey)
      this.pvEdit.cellKey = ''
      this.pvEdit.cellValue = ''
      this.$emit('pv-edit')
    },

    // confirm input edit: validate and save changes in edit history
    cellInputConfirm (val, key) {
      // validate input
      if (!this.pvControl.formatter.isValid(val)) {
        this.$q.notify({ type: 'negative', message: this.$t('Invalid (or empty) value entered') })
        return false
      }

      // compare input value with previous
      const now = this.pvControl.formatter.parse(val)
      const prev = this.pvEdit.updated.hasOwnProperty(key) ? this.pvEdit.updated[key] : this.pvt.cells[key]

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

      this.changeRenderKey(key)
      this.updateValueLenByValue(now)
      return true
    },

    // undo last edit changes
    doUndo () {
      if (!this.pvEdit.isEdit || this.pvEdit.lastHistory <= 0) return // exit: entire history already undone

      const n = --this.pvEdit.lastHistory
      const ckey = this.pvEdit.history[n].key

      let isPrev = false
      for (let k = 0; !isPrev && k < n; k++) {
        isPrev = this.pvEdit.history[k].key === ckey
      }
      if (isPrev) {
        this.pvEdit.updated[ckey] = this.pvEdit.history[n].prev
      } else {
        delete this.pvEdit.updated[ckey]
        this.pvEdit.isUpdated = !!this.pvEdit.updated && this.pvEdit.lastHistory > 0
      }

      // update display value
      this.changeRenderKey(ckey)
      this.focusNextTick(ckey)
      this.$emit('pv-edit')
    },
    // redo most recent undo
    doRedo () {
      if (!this.pvEdit.isEdit || this.pvEdit.lastHistory >= this.pvEdit.history.length) return // exit: already at the end of history

      const n = this.pvEdit.lastHistory++
      const ckey = this.pvEdit.history[n].key
      this.pvEdit.updated[ckey] = this.pvEdit.history[n].now
      this.pvEdit.isUpdated = true

      // update display value
      this.changeRenderKey(ckey)
      this.focusNextTick(ckey)
      this.$emit('pv-edit')
    },

    // arrows navigation
    onLeftArrow (e) {
      const rc = this.rowColAttrs(e)
      if (rc && rc.cCol > 0) this.focusToRowCol(rc.cRow, rc.cCol - 1) // move focus left if this is table body cell
    },
    onRightArrow (e) {
      const rc = this.rowColAttrs(e)
      if (rc && rc.cCol < this.pvt.colCount - 1) this.focusToRowCol(rc.cRow, rc.cCol + 1) // move focus right if this is table body cell
    },
    onDownArrow (e) {
      const rc = this.rowColAttrs(e)
      if (rc && rc.cRow < this.pvt.rowCount - 1) this.focusToRowCol(rc.cRow + 1, rc.cCol) // move focus down if this is table body cell
    },
    onUpArrow (e) {
      const rc = this.rowColAttrs(e)
      if (rc && rc.cRow > 0) this.focusToRowCol(rc.cRow - 1, rc.cCol) // move focus up if this is table body cell
    },

    // set cell focus to (rowNumber,columnNumber) coordinates
    focusToRowCol (nRow, nCol) {
      const cKey = this.cellKeyByRowCol(nRow, nCol)
      if (cKey && this.$refs[cKey] && (this.$refs[cKey].length || 0) === 1) this.$refs[cKey][0].focus()
    },
    // set cell focus on next tick
    focusNextTick (key) {
      this.$nextTick(() => {
        if (this.$refs[key] && (this.$refs[key].length || 0) === 1) this.$refs[key][0].focus()
      })
    },
    // get cell key by (row, column)
    cellKeyByRowCol (nRow, nCol) {
      if (typeof nRow !== typeof 1 || typeof nCol !== typeof 1) return void 0
      if (nRow < 0 || nRow > this.pvt.rowCount - 1 || nCol < 0 || nCol > this.pvt.colCount - 1) return void 0 // outside of table body

      return this.pvt.cellKeys[nRow * this.pvt.colCount + nCol]
    },

    // get body cell {row,column} from event target attributes
    rowColAttrs (e) {
      if (!e || !e.target) {
        console.warn('Failed to get row and column: event target unknown')
        return void 0
      }
      const nRow = parseInt((e.target.getAttribute('data-om-nrow') || ''), 10)
      const nCol = parseInt((e.target.getAttribute('data-om-ncol') || ''), 10)

      return (!isNaN(nRow) && !isNaN(nCol)) ? { cRow: nRow, cCol: nCol } : void 0 // return undefined if taregt has no row or column attribute
    },

    // on recalculate size of input text value based on client width
    updateValueLenByRowCol (nRow, nCol) {
      this.updateValueLenByKey(this.cellKeyByRowCol(nRow, nCol))
    },
    updateValueLenByKey (key) {
      if (key && this.$refs[key] && (this.$refs[key].length || 0) === 1) {
        const n = this.$refs[key][0].clientWidth || 0
        if (n) {
          const nc = Math.floor((n - 9) / 9) - 1
          if (this.valueLen < nc) this.valueLen = nc
        }
      }
    },
    // on recalculate size of input text value
    updateValueLenByValue (val) {
      if (val !== void 0 && val !== '') {
        const n = (val.toString() || '').length
        if (this.valueLen < n) this.valueLen = n
      }
    },

    // keyup event handler in editor mode: capture hot keys if it is not input text
    onKeyUpEdit (e) {
      if (e.defaultPrevented) return

      // capture hot keys: ctrl-z and ctrl-y
      if (!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return
      switch (e.key) {
        case 'z':
        case 'Z':
          this.doUndo()
          break
        case 'y':
        case 'Y':
          this.doRedo()
          break
        default:
          return // not a hot key: pass to default
      }
      e.preventDefault() // done with hot keys
    },

    // keydown event handler in editor mode: capture hot keys if it is not input text
    onKeyDownEdit (e) {
      if (e.defaultPrevented) return

      // capture hot keys: enter and arrows
      if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return
      switch (e.key) {
        case 'Enter':
          this.onKeyEnter(e)
          break
        case 'Left':
        case 'ArrowLeft':
          this.onLeftArrow(e)
          break
        case 'Right':
        case 'ArrowRight':
          this.onRightArrow(e)
          break
        case 'Up':
        case 'ArrowUp':
          this.onUpArrow(e)
          break
        case 'Down':
        case 'ArrowDown':
          this.onDownArrow(e)
          break
        default:
          return // not a hot key: pass to default
      }
      e.preventDefault() // done with hot keys
    },

    // paste tab separated values from clipboard, event.preventDefault done by event modifier
    onPasteTsv (e) {
      const rc = this.rowColAttrs(e)
      if (!rc) {
        return false // current cell is unknown: paste must be done into table cell
      }

      // get pasted clipboard values
      let pasted = ''
      if (e.clipboardData && e.clipboardData.getData) {
        pasted = e.clipboardData.getData('text') || ''
      } else {
        if (window.clipboardData && window.clipboardData.getData) pasted = window.clipboardData.getData('Text') || ''
      }

      // parse tab separated values
      const pv = Pcvt.parseTsv(pasted, this.pvt.rowCount - rc.cRow, this.pvt.colCount - rc.cCol)

      if (!pv || pv.rowSize <= 0 || (pv.colSize <= 0 && rc.cRow + pv.rowSize <= this.pvt.rowCount)) {
        this.$q.notify({ type: 'negative', message: this.$t('Empty (or invalid) paste: tab separated values expected') })
        return false
      }
      if (rc.cRow + pv.rowSize > this.pvt.rowCount) {
        this.$q.notify({ type: 'negative', message: this.$t('Too many rows pasted') + ': ' + pv.rowSize.toString() })
        return false
      }
      if (rc.cCol + pv.colSize > this.pvt.colCount) {
        this.$q.notify({ type: 'negative', message: this.$t('Too many columns pasted') + ': ' + pv.colSize.toString() })
        return false
      }

      // for each value do input into the cell
      // if this is enum based parameter and cell values are labels then convert enum labels to enum id's
      const isToEnumId = this.pvEdit.kind === Pcvt.EDIT_ENUM && !this.pvControl.formatter.options().isSrcValue

      for (let k = 0; k < pv.arr.length; k++) {
        for (let j = 0; j < pv.arr[k].length; j++) {
          const cKey = this.pvt.cellKeys[(rc.cRow + k) * this.pvt.colCount + (rc.cCol + j)]

          let val = pv.arr[k][j]
          if (isToEnumId) {
            val = this.pvControl.formatter.enumIdByLabel(val)
            if (val === void 0 || val === '') {
              this.$q.notify({
                type: 'negative',
                message: this.$t('Invalid enum label at row') + ': ' + k.toString() + ' ' + this.$t('column') + ': ' + j.toString()
              })
              return false
            }
          }

          // do input into the cell
          if (!this.cellInputConfirm(val, cKey)) return false // input validation failed
          this.$emit('pv-edit')
          this.focusNextTick(cKey)
        }
      }
      return true // success
    },
    //
    // end of editor methods

    // copy tab separated values to clipboard
    onCopyTsv () {
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
            tsv += this.pvControl.formatter.format(this.pvt.cells[this.pvt.cellKeys[nRow * this.pvt.colCount + nCol]]) + (nCol < this.pvt.colCount - 1 ? '\t' : '\r\n')
          }
        } else {
          for (let nCol = 0; nCol < this.pvt.colCount; nCol++) {
            tsv += this.getUpdatedFmt(this.pvt.cellKeys[nRow * this.pvt.colCount + nCol]) + (nCol < this.pvt.colCount - 1 ? '\t' : '\r\n')
          }
        }
      }

      // copy to clipboard
      const isOk = Pcvt.toClipboard(tsv)

      if (isOk) {
        this.$q.notify({
          type: 'info',
          message: this.$t('Copy tab separated values to clipboard') + ': ' + tsv.length + ' ' + this.$t('characters')
        })
      } else {
        this.$q.notify({
          type: 'negative',
          message: this.$t('Failed to copy tab separated values to clipboard')
        })
      }
      return isOk
    },

    // set item labels for for all dimensions: rows, columns, other
    setDimItemLabels () {
      const makeLabels = (dims) => {
        for (const f of dims) {
          const ls = {}

          // make enum labels
          for (const e of f.enums) {
            ls[e.value] = !this.pvControl.isShowNames ? e.label : e.name
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
      this.renderKeys = {}
      this.keyPos = []

      // if response is empty or invalid: clean table
      const len = (!!d && (d.length || 0) > 0) ? d.length : 0
      if (!d || len <= 0) {
        return
      }

      // make dimensions field selectors to read, filter and sort dimension fields
      const dimProc = []
      const rCmp = []
      const cCmp = []
      for (const f of this.rowFields) {
        const p = Pcvt.dimField(f, true, false)
        dimProc.push(p)
        rCmp.push(p.compareEnumIdByIndex)
      }
      for (const f of this.colFields) {
        const p = Pcvt.dimField(f, false, true)
        dimProc.push(p)
        cCmp.push(p.compareEnumIdByIndex)
      }
      for (const f of this.otherFields) {
        dimProc.push(Pcvt.dimField(f, false, false))
      }

      const isScalar = dimProc.length === 0 // scalar parameter with only one sub-value

      let cellKeyLen = 0
      for (const p of dimProc) {
        if (!p.isCellKey) continue
        cellKeyLen++
        for (const rp of dimProc) {
          if (!rp.isCellKey) continue
          if (p.name > rp.name) p.keyPos++
        }
      }

      // process all input records: check if it match selection filters and aggregate values
      const rowKeyLen = this.rowFields.length
      const colKeyLen = this.colFields.length
      const vrows = []
      const vcols = []
      const rKeys = {}
      const cKeys = {}
      const vcells = {}
      const vstate = {}

      for (let nSrc = 0; nSrc < len; nSrc++) {
        // check if record match selection filters
        let isSel = true
        const r = Array(rowKeyLen)
        const c = Array(colKeyLen)
        const b = Array(cellKeyLen)
        let i = 0
        let j = 0
        for (const p of dimProc) {
          const v = p.read(d[nSrc])
          isSel = p.filter(v)
          if (!isSel) break
          if (p.isRow) r[i++] = v
          if (p.isCol) c[j++] = v
          if (p.isCellKey) b[p.keyPos] = v
        }
        if (!isSel) continue // skip row: dimension item is not in filter values

        // build list of rows and columns keys
        const rk = Pcvt.itemsToKey(r)
        if (!rKeys[rk]) {
          rKeys[rk] = true
          vrows.push(r)
        }
        const ck = Pcvt.itemsToKey(c)
        if (!cKeys[ck]) {
          cKeys[ck] = true
          vcols.push(c)
        }

        // extract value(s) from record and aggregate
        const v = this.pvControl.readValue(d[nSrc])

        const bkey = isScalar ? Pcvt.PV_KEY_SCALAR : Pcvt.itemsToKey(b)
        if (!vstate.hasOwnProperty(bkey)) {
          vstate[bkey] = this.pvControl.processValue.init()
          vcells[bkey] = void 0
        }
        if (v !== void 0 || v !== null) {
          vcells[bkey] = this.pvControl.processValue.doNext(v, vstate[bkey])
        }
      }

      // sort row keys and column keys in the order of dimension items
      vrows.sort(Pcvt.compareKeys(rowKeyLen, rCmp))
      vcols.sort(Pcvt.compareKeys(colKeyLen, cCmp))

      // calculate span for rows and columns
      const rsp = Pcvt.itemSpans(rowKeyLen, vrows)
      const csp = Pcvt.itemSpans(colKeyLen, vcols)

      // sorted keys: row keys, column keys, body value keys
      const rowCount = vrows.length
      const colCount = vcols.length

      const vrk = Array(rowCount)
      let n = 0
      for (const r of vrows) {
        vrk[n++] = Pcvt.itemsToKey(r)
      }

      const vck = Array(colCount)
      n = 0
      for (const c of vcols) {
        vck[n++] = Pcvt.itemsToKey(c)
      }

      // body cell key is row dimension(s) items, column dimension(s) items
      // and filter items: items other dimension(s) where only one item selected
      const b = Array(cellKeyLen)
      const nkp = Array(cellKeyLen)
      const kp = {}
      for (let k = 0; k < dimProc.length; k++) {
        if (!dimProc[k].isCellKey) continue
        nkp[dimProc[k].keyPos] = {
          name: dimProc[k].name,
          pos: dimProc[k].keyPos
        }
        kp[dimProc[k].name] = dimProc[k].keyPos
        if (dimProc[k].isSingleKey) {
          b[dimProc[k].keyPos] = dimProc[k].singleKey // add selected item to cell key
        }
      }

      const vkeys = Array(rowCount * colCount)
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

      this.keyRenderCount++
      const vupd = {}
      for (const bkey of vkeys) {
        vupd[bkey] = this.makeRenderKey(bkey)
      }

      // max length of cell value as string
      this.valueLen = 0
      let ml = 0
      for (const bkey in vcells) {
        if (vcells[bkey] !== void 0) {
          const n = (vcells[bkey].toString() || '').length
          if (ml < n) ml = n
        }
      }
      if (this.valueLen < ml) this.valueLen = ml

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
      this.renderKeys = vupd
      this.keyPos = nkp

      this.$emit('pv-key-pos', this.keyPos)
    }
  },

  mounted () {
    this.keyRenderCount = 0
    this.setDimItemLabels()
    this.setData(this.pvData)
  }
}
