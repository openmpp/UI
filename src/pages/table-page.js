import { mapState, mapGetters, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'
import * as Idb from 'src/idb/idb'
import RunBar from 'components/RunBar.vue'
import RefreshRun from 'components/RefreshRun.vue'
import RunInfoDialog from 'components/RunInfoDialog.vue'
import TableInfoDialog from 'components/TableInfoDialog.vue'
import draggable from 'vuedraggable'
import * as Pcvt from 'components/pivot-cvt'
import * as Puih from './pivot-ui-helper'
import PvTable from 'components/PvTable'
import { openURL } from 'quasar'

/* eslint-disable no-multi-spaces */
const EXPR_DIM_NAME = 'EXPRESSIONS_DIM'         // expressions measure dimension name
const ACC_DIM_NAME = 'ACCUMULATORS_DIM'         // accuimulators measure dimension name
const ALL_ACC_DIM_NAME = 'ALL_ACCUMULATORS_DIM' // all accuimulators measure dimension name
const CALC_DIM_NAME = 'CALCULATED_DIM'          // calculated expressions measure dimension name
const SMALL_PAGE_SIZE = 100                     // small page size: do not show page controls
const LAST_PAGE_OFFSET = 2 * 1024 * 1024 * 1024 // large page offset to get the last page
const CALCULATED_ID_OFFSET = 1200               // calculated exprssion id offset, for example for Expr1 calculated expression id is 1201
/* eslint-enable no-multi-spaces */

export default {
  name: 'TablePage',
  components: { draggable, PvTable, RunBar, RefreshRun, RunInfoDialog, TableInfoDialog },

  props: {
    digest: { type: String, default: '' },
    runDigest: { type: String, default: '' },
    tableName: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false }
  },

  /* eslint-disable no-multi-spaces */
  data () {
    return {
      loadDone: false,
      loadWait: false,
      isNullable: true,       // output table always nullabale, value can be NULL
      isScalar: false,        // output table never scalar, it always has at least measure dimension
      rank: 0,                // output table rank
      tableText: Mdf.emptyTableText(),
      runText: Mdf.emptyRunText(),
      subCount: 0,
      dimProp: [],
      colFields: [],
      rowFields: [],
      otherFields: [],
      filterState: {},
      inpData: Object.freeze([]),
      ctrl: {
        isRowColControls: true,
        isRowColModeToggle: true,
        isPvTickle: false,      // used to update view of pivot table (on data selection change)
        isPvDimsTickle: false,  // used to update dimensions in pivot table (on label change)
        formatOpts: void 0,     // hide format controls by default
        kind: Puih.kind.EXPR    // table view content: expressions, accumulators, all-accumulators
      },
      pvc: {
        rowColMode: Pcvt.SPANS_AND_DIMS_PVT,  // rows and columns mode: 2 = use spans and show dim names
        isShowNames: false,                   // if true then show dimension names and item names instead of labels
        reader: void 0,                       // return row reader: if defined then methods to read next row, read() dimension items and readValue()
        processValue: Pcvt.asIsPval,          // default value processing: return as is
        formatter: Pcvt.formatDefault,        // disable format(), parse() and validation by default
        cellClass: 'pv-cell-right'            // default cell value style: right justified number
      },
      readerExpr: void 0,     // expression row reader
      readerAcc: void 0,      // accumulators row reader: one row for each accumulator
      readerAllAcc: void 0,   // all accumulators row reader: all acumulators in single row
      readerCalc: void 0,     // calculated expressions row reader
      pvKeyPos: [],           // position of each dimension item in cell key
      srcCalc: '',            // calculation source name, ex.: MEAN
      isDragging: false,      // if true then user is dragging dimension select control
      exprDimPos: 0,          // expression dimension position: table ExprPos
      totalEnumLabel: '',     // total enum item label, language-specific, ex.: All
      isPages: false,
      pageStart: 0,
      pageSize: 0,
      isLastPage: false,
      isShowPageControls: false,
      loadRunWait: false,
      refreshRunTickle: false,
      runInfoTickle: false,
      tableInfoTickle: false,
      calcList: [{            // list of calculations
        code: 'MEAN',
        label: 'Average'
      }, {
        code: 'COUNT',
        label: 'Count'
      }, {
        code: 'SUM',
        label: 'Sum'
      }, {
        code: 'MAX',
        label: 'Maximum'
      }, {
        code: 'MIN',
        label: 'Minimum'
      }, {
        code: 'VAR',
        label: 'Variance'
      }, {
        code: 'SD',
        label: 'Standard deviation'
      }, {
        code: 'SE',
        label: 'Standard error'
      }, {
        code: 'CV',
        label: 'Coefficient of variation'
      }]
    }
  },
  /* eslint-enable no-multi-spaces */

  computed: {
    routeKey () { return Mdf.tablePath(this.digest, this.runDigest, this.tableName) },
    tableDescr () { return this?.tableText?.TableDescr || '' },

    ...mapState('model', {
      theModel: state => state.theModel,
      wordList: state => state.wordList
    }),
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest'
    }),
    ...mapState('uiState', {
      uiLang: state => state.uiLang
    }),
    ...mapGetters('uiState', {
      tableView: 'tableView'
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl
    })
  },

  watch: {
    routeKey () { this.doRefresh() },
    refreshTickle () { this.doRefresh() }
  },

  methods: {
    async doRefresh () {
      this.initView()
      await this.setPageView()
      this.doRefreshDataPage()
    },

    // initialize current page view on mounted or tab switch
    initView () {
      // check if model run exists and output table is included in model run results
      if (!this.initRunTable()) return // exit on error

      const tblSize = Mdf.tableSizeByName(this.theModel, this.tableName)
      this.rank = tblSize.rank || 0
      const allAccCount = tblSize.allAccCount || 0
      this.subCount = this.runText.SubCount || 0
      this.exprDimPos = this.tableText.Table.ExprPos || 0

      this.isPages = tblSize?.dimTotal > SMALL_PAGE_SIZE // disable pages for small table
      this.pageStart = 0
      this.pageSize = 0 // by default show all rows

      this.isNullable = true // output table always nullable
      this.isScalar = false // output table view never scalar: there is always a measure dimension

      this.totalEnumLabel = Mdf.wordByCode(this.wordList, Mdf.ALL_WORD_CODE)

      // adjust controls
      this.pvc.rowColMode = !this.isScalar ? Pcvt.SPANS_AND_DIMS_PVT : Pcvt.NO_SPANS_NO_DIMS_PVT
      this.ctrl.isRowColModeToggle = !this.isScalar
      this.ctrl.isRowColControls = !this.isScalar
      this.pvKeyPos = []
      this.srcCalc = ''

      // make dimensions:
      //  [0, rank - 1] of enum-based dimensions
      //  [rank]:       expressions measure dimension: expressions as enums
      //  [rank + 1]:   accumulators measure dimension: accumulators as enums
      //  [rank + 2]:   all accumulators measure dimension: all accumulators, including derived as enums
      //  [rank + 3]:   sub-value dimension: enum labebls same as enum id's
      //  [rank + 4]:   calculated expressions dimension: "normal" and calculated expressions as enums
      this.dimProp = Array(this.rank + 5)

      // [0, rank - 1] of enum-based dimensions
      for (let n = 0; n < this.rank; n++) {
        const dt = this.tableText.TableDimsTxt[n]
        const t = Mdf.typeTextById(this.theModel, (dt.Dim.TypeId || 0))
        const f = {
          name: dt.Dim.Name || '',
          label: Mdf.descrOfDescrNote(dt) || dt.Dim.Name || '',
          enums: [],
          options: [],
          selection: [],
          singleSelection: {},
          isTotal: dt.Dim.IsTotal,
          totalId: t.Type.TotalEnumId || 0,
          filter: (val, update, abort) => {}
        }

        const eLst = Array(t.TypeEnumTxt.length + (f.isTotal ? 1 : 0)) // if total enabled for that dimension then add "All" item
        let k = 0
        let isTd = false

        for (let j = 0; j < t.TypeEnumTxt.length; j++) {
          const eId = t.TypeEnumTxt[j].Enum.EnumId

          if (f.isTotal && eId > f.totalId) { // insert "All" item if total is enabled
            eLst[k++] = {
              value: f.totalId,
              name: Mdf.ALL_WORD_CODE,
              label: this.totalEnumLabel || f.totalId.toString()
            }
            isTd = true // total item inserted
          }

          eLst[k++] = {
            value: eId,
            name: t.TypeEnumTxt[j].Enum.Name || eId.toString(),
            label: Mdf.enumDescrOrCodeById(t, eId) || t.TypeEnumTxt[j].Enum.Name || eId.toString()
          }
        }
        if (f.isTotal && !isTd) { // append total item if not inserted before
          eLst[k++] = {
            value: f.totalId,
            name: Mdf.ALL_WORD_CODE,
            label: this.totalEnumLabel || f.totalId.toString()
          }
        }

        f.enums = Object.freeze(eLst)
        f.options = f.enums
        f.filter = Puih.makeFilter(f)

        this.dimProp[n] = f
      }

      // at [rank]:     expressions measure dimension: expressions as enums
      // at [rank + 4]: calculated expressions dimension: "normal" and calculated expressions as enums
      const exprFmt = {}
      let maxDec = -1

      const fe = {
        name: EXPR_DIM_NAME,
        label: this.tableText.ExprDescr || this.$t('Measure'),
        enums: [],
        options: [],
        selection: [],
        singleSelection: {},
        isTotal: false,
        totalId: 0,
        filter: (val, update, abort) => {}
      }
      const fc = {
        name: CALC_DIM_NAME,
        label: this.tableText.ExprDescr || this.$t('Measure'),
        enums: [],
        options: [],
        selection: [],
        singleSelection: {},
        isTotal: false,
        totalId: 0,
        filter: (val, update, abort) => {}
      }
      const eLst = []
      const cLst = []

      for (let j = 0; j < this.tableText.TableExprTxt.length; j++) {
        if (!this.tableText.TableExprTxt[j].hasOwnProperty('Expr')) continue

        const e = this.tableText.TableExprTxt[j].Expr
        const eId = e.ExprId
        eLst.push({
          value: eId,
          name: e.Name || eId.toString(),
          label: Mdf.descrOfDescrNote(this.tableText.TableExprTxt[j]) || e.SrcExpr || e.Name || eId.toString()
        })
        const ceIdx = cLst.length
        cLst.push({
          value: eLst[j].value,
          name: eLst[j].name,
          label: eLst[j].label,
          exIdx: ceIdx, // index of source expression
          calc: e.Name // calculation: table expression name
        })

        // format value handlers: output table values are always float and nullable
        const nDec = e.Decimals || 0
        exprFmt[eId] = {
          isAllDecimal: nDec < 0,
          nDecimal: (nDec >= 0 ? nDec : Pcvt.maxDecimalDefault),
          maxDecimal: (nDec >= 0 ? nDec : Pcvt.maxDecimalDefault)
        }
        if (maxDec < nDec) maxDec = nDec

        // find derived accumulator by expression name
        const na = this.tableText.TableAccTxt.findIndex(t => t.Acc.Name === e.Name && !!t.Acc.IsDerived && !!t.Acc?.SrcAcc)
        if (na < 0) {
          continue // derived accumulator not found
        }

        const cId = e.ExprId + CALCULATED_ID_OFFSET
        cLst.push({
          value: cId,
          name: 'CALC_' + eLst[j].name,
          label: 'CALC_' + eLst[j].label,
          exIdx: ceIdx, // index of source expression
          calc: this.tableText.TableAccTxt[na].Acc.SrcAcc // calculation: derived accumulator
        })

        // format expression value handlers: always float, nullable and max decimals
        exprFmt[cId] = {
          isAllDecimal: true,
          nDecimal: Pcvt.maxDecimalDefault,
          maxDecimal: Pcvt.maxDecimalDefault
        }
      }
      if (maxDec < 0) maxDec = Pcvt.maxDecimalDefault // if model decimals=-1, which is display all then limit decimals = 4

      fe.enums = Object.freeze(eLst)
      fe.options = fe.enums
      fe.filter = Puih.makeFilter(fe)
      this.dimProp[this.rank] = fe // expression measure dimension at [rank] position

      fc.enums = Object.freeze(cLst)
      fc.options = fc.enums
      fc.filter = Puih.makeFilter(fc)
      this.dimProp[this.rank + 4] = fc // calculated measure dimension at [rank + 4] position

      // accumulators measure dimension: items are output table accumulators
      const makeAccDim = (isAll) => {
        const fa = {
          name: !isAll ? ACC_DIM_NAME : ALL_ACC_DIM_NAME,
          label: this.tableText.ExprDescr || this.$t('Measure'),
          enums: [],
          options: [],
          selection: [],
          singleSelection: {},
          isTotal: false,
          totalId: 0,
          filter: (val, update, abort) => {}
        }
        const eaLst = []

        for (let j = 0; j < this.tableText.TableAccTxt.length; j++) {
          if (!this.tableText.TableAccTxt[j].hasOwnProperty('Acc')) continue
          if (!isAll && this.tableText.TableAccTxt[j].Acc.IsDerived) continue // skip derived accumulators

          const a = this.tableText.TableAccTxt[j].Acc
          const aId = a.AccId
          eaLst.push({
            value: aId,
            name: a.Name || aId.toString(),
            label: Mdf.descrOfDescrNote(this.tableText.TableAccTxt[j]) || a.SrcAcc || a.Name || aId.toString()
          })
        }

        fa.enums = Object.freeze(eaLst)
        fa.options = fa.enums
        fa.filter = Puih.makeFilter(fa)

        return fa
      }
      this.dimProp[this.rank + 1] = makeAccDim(false) // accumullators measure dimension at [rank + 1] position, not derived accumulators
      this.dimProp[this.rank + 2] = makeAccDim(true) // all accumullator measure dimension at [rank + 2] position, including derived

      // read expression rows: one row for each expression
      this.readerExpr = (src) => {
        // no data to read: if source rows are empty or invalid return undefined reader
        if (!src || (src?.length || 0) <= 0) return void 0

        const srcLen = src.length
        let nSrc = 0

        const rd = { // reader to return
          readRow: () => {
            return (nSrc < srcLen) ? src[nSrc++] : void 0 // expression row: one row for each expression
          },
          readDim: {},
          readValue: (r) => (!r.IsNull ? r.Value : void 0) // expression value
        }

        // read dimension item value: enum id, expression id
        for (let n = 0; n < this.rank; n++) {
          rd.readDim[this.dimProp[n].name] = (r) => (r.DimIds.length > n ? r.DimIds[n] : void 0)
        }

        // read measure dimension: expression id
        rd.readDim[EXPR_DIM_NAME] = (r) => (r.ExprId)

        return rd
      }

      // read calculated expressions rows: one row for each calculation
      this.readerCalc = (src) => {
        // no data to read: if source rows are empty or invalid return undefined reader
        if (!src || (src?.length || 0) <= 0) return void 0

        const srcLen = src.length
        let nSrc = 0

        const rd = { // reader to return
          readRow: () => {
            return (nSrc < srcLen) ? src[nSrc++] : void 0 // expression row: one row for each calculation
          },
          readDim: {},
          readValue: (r) => (!r.IsNull ? r.Value : void 0) // calculated value
        }

        // read dimension item value: enum id, expression id
        for (let n = 0; n < this.rank; n++) {
          rd.readDim[this.dimProp[n].name] = (r) => (r.DimIds.length > n ? r.DimIds[n] : void 0)
        }

        // read calculation dimension: calculation id
        rd.readDim[CALC_DIM_NAME] = (r) => (r.CalcId)

        return rd
      }

      // read native accumulators rows: one row for each accumilator
      this.readerAcc = (src) => {
        // no data to read: if source rows are empty or invalid return undefined reader
        if (!src || (src?.length || 0) <= 0) return void 0

        const srcLen = src.length
        let nSrc = 0

        const rd = { // reader to return
          readRow: () => {
            return (nSrc < srcLen) ? src[nSrc++] : void 0 // accumilator row: one row for each accumilator
          },
          readDim: {},
          readValue: (r) => (!r.IsNull ? r.Value : void 0) // accumilator value
        }

        // read dimension item value: enum id, sub-value id, accumulator id
        for (let n = 0; n < this.rank; n++) {
          rd.readDim[this.dimProp[n].name] = (r) => (r.DimIds.length > n ? r.DimIds[n] : void 0)
        }

        // read measure dimensions: accumulator id and sub-value id
        rd.readDim[ACC_DIM_NAME] = (r) => (r.AccId)
        rd.readDim[Puih.SUB_ID_DIM] = (r) => (r.SubId)

        return rd
      }

      // read all accumulators rows: all accumulators are in one row, including derived accumulators
      this.readerAllAcc = (src) => {
        // no data to read: if source rows are empty or invalid return undefined reader
        if (!src || (src?.length || 0) <= 0) return void 0

        // accumulator id's: measure dimension items, all accumulators dimension is at [rank + 2]
        const accIds = []
        for (const e of this.dimProp[this.rank + 2].enums) {
          accIds.push(e.value)
        }

        const srcLen = src.length
        let nSrc = 0
        let nAcc = -1 // after first read row must be nAcc = 0

        const rd = { // reader to return
          readRow: () => {
            nAcc++
            if (nAcc >= allAccCount) {
              nAcc = 0
              nSrc++
            }
            return (nSrc < srcLen) ? src[nSrc] : void 0 // accumilator row: all accumulators in one row
          },
          readDim: {},
          readValue: (r) => {
            const v = !r.IsNull[nAcc] ? r.Value[nAcc] : void 0 // accumilator value
            return v
          }
        }

        // read dimension item value: enum id, sub-value id, accumulator id
        for (let n = 0; n < this.rank; n++) {
          rd.readDim[this.dimProp[n].name] = (r) => (r.DimIds.length > n ? r.DimIds[n] : void 0)
        }

        // read measure dimensions: accumulator id and sub-value id
        rd.readDim[ALL_ACC_DIM_NAME] = (r) => (accIds[nAcc])
        rd.readDim[Puih.SUB_ID_DIM] = (r) => (r.SubId)

        return rd
      }

      // sub-value dimension: items name and label are same as item id
      const fs = {
        name: Puih.SUB_ID_DIM,
        label: this.$t('Sub #'),
        enums: [],
        options: [],
        selection: [],
        singleSelection: {},
        isTotal: false,
        totalId: 0,
        filter: (val, update, abort) => {}
      }

      const esLst = Array(this.subCount)
      for (let k = 0; k < this.subCount; k++) {
        esLst[k] = { value: k, name: k.toString(), label: k.toString() }
      }
      fs.enums = Object.freeze(esLst)
      fs.options = fs.enums
      fs.filter = Puih.makeFilter(fs)

      this.dimProp[this.rank + 3] = fs // sub-values dimension at [rank + 3] position

      // setup process value and format value handlers: output table values are always float and nullable
      // output table values type is always float and nullable
      let lc = this.uiLang || this.$q.lang.getLocale() || ''
      if (lc) {
        try {
          const cla = Intl.getCanonicalLocales(lc)
          lc = cla?.[0] || ''
        } catch (e) {
          lc = ''
          console.warn('Error: undefined canonical locale:', e)
        }
      }
      this.pvc.processValue = Pcvt.asFloatPval
      this.pvc.formatter = Pcvt.formatFloatByKey({
        isNullable: this.isNullable,
        locale: lc,
        nDecimal: maxDec,
        maxDecimal: maxDec,
        isByKey: (this.ctrl.kind === Puih.kind.EXPR || this.ctrl.kind === Puih.kind.CALC),
        itemsFormat: exprFmt
      })
      this.ctrl.formatOpts = this.pvc.formatter.options()
      this.pvc.dimItemKeys = Pcvt.dimItemKeys(EXPR_DIM_NAME)
      this.pvc.cellClass = 'pv-cell-right'
    },

    // set page view: use previous page view from store or default
    async setPageView () {
      // if previous page view exist in session store
      let tv = this.tableView(this.routeKey)
      if (!tv) {
        await this.restoreDefaultView() // restore default output table view, if exist
        tv = this.tableView(this.routeKey) // check if default view of output table restored
        if (!tv) {
          this.setInitialPageView() // setup and use initial view of output table
          return
        }
      }
      // else: restore previous view
      this.ctrl.kind = (typeof tv?.kind === typeof 1) ? (tv.kind % 4 || Puih.kind.EXPR) : Puih.kind.EXPR // there are only 4 kinds of view possible for output table
      this.srcCalc = (this.ctrl.kind === Puih.kind.CALC && typeof tv?.calc === typeof 'string') ? (tv?.calc || '') : ''

      // restore rows, columns, others layout and items selection
      const restore = (edSrc) => {
        const dst = []
        for (const ed of edSrc) {
          const f = this.dimProp.find((d) => d.name === ed.name)
          if (!f) continue
          if (!this.isDimKindValid(this.ctrl.kind, f.name)) continue // skip measure dimensions not applicable for that view kind

          f.selection = []
          let n = 0
          for (const v of ed.values) {
            const e = f.enums.find((fe) => fe.value === v)
            if (e) {
              f.selection.push(e)
              if (f.isTotal && e.value === f.totalId) n = f.selection.length - 1
            }
          }
          f.singleSelection = (f.selection.length > 0) ? f.selection[n] : {}

          dst.push(f)
        }
        return dst
      }
      this.rowFields = restore(tv.rows)
      this.colFields = restore(tv.cols)
      this.otherFields = restore(tv.others)

      // if there are any dimensions which are not in rows, columns or others then push it to others
      // it is possible if view restored and sub-value dimension is hidden (if it is only one sub-value in current model run)
      for (const f of this.dimProp) {
        if (this.rowFields.findIndex((d) => f.name === d.name) >= 0) continue
        if (this.colFields.findIndex((d) => f.name === d.name) >= 0) continue
        if (this.otherFields.findIndex((d) => f.name === d.name) >= 0) continue
        if (!this.isDimKindValid(this.ctrl.kind, f.name)) continue // skip measure dimensions not applicable for that view kind

        // append to other fields, select "All" item if total is exist for that dimension
        f.selection = []
        let n = 0
        if (f.isTotal) {
          n = f.enums.findIndex(e => e.value === f.totalId)
          if (n < 0) n = 0
        }
        f.selection.push(f.enums[n])
        f.singleSelection = (f.selection.length > 0) ? f.selection[0] : {}
        this.otherFields.push(f)
      }

      // if calcualted expression dimension on others then select first calculated item, skip source exprtession
      if (this.ctrl.kind === Puih.kind.CALC) {
        const nc = this.otherFields.findIndex(f => f.name === CALC_DIM_NAME)
        if (nc >= 0) {
          const fc = this.otherFields[nc]
          if (fc.selection.length > 0 && (fc.singleSelection?.value || 0) < CALCULATED_ID_OFFSET) {
            const n = fc.selection.findIndex(e => e.value >= CALCULATED_ID_OFFSET)
            if (n >= 0) fc.singleSelection = fc.selection
          }
        }
      }

      // restore rows reader
      switch (this.ctrl.kind) {
        case Puih.kind.EXPR:
          this.pvc.reader = this.readerExpr
          this.pvc.dimItemKeys = Pcvt.dimItemKeys(EXPR_DIM_NAME)
          break
        case Puih.kind.ACC:
          this.pvc.reader = this.readerAcc
          break
        case Puih.kind.ALL:
          this.pvc.reader = this.readerAllAcc
          break
        case Puih.kind.CALC:
          this.pvc.reader = this.readerCalc
          this.pvc.dimItemKeys = Pcvt.dimItemKeys(CALC_DIM_NAME)
          break
        default:
          this.pvc.reader = void 0 // default empty reader: no data
          console.warn('Inavlid table view kind:', this.ctrl.kind)
      }

      // restore formatter and controls view state
      this.pvc.formatter.byKey(this.ctrl.kind === Puih.kind.EXPR || this.ctrl.kind === Puih.kind.CALC)

      // restore calculated expressions dimension: update name and label for calculated items
      if (this.ctrl.kind === Puih.kind.CALC) {
        this.setCalcEnumsNameLabel(this.srcCalc) // update name and label for calculated items
        this.setCalcDecimals(this.srcCalc) // decimals format: zero decimals if calculation is count else max decimals
      }

      this.ctrl.isRowColControls = !!tv.isRowColControls
      this.pvc.rowColMode = typeof tv.rowColMode === typeof 1 ? tv.rowColMode : Pcvt.NO_SPANS_NO_DIMS_PVT

      // restore page offset and size
      if (this.isPages) {
        this.pageStart = (typeof tv?.pageStart === typeof 1) ? (tv?.pageStart || 0) : 0
        this.pageSize = (typeof tv?.pageSize === typeof 1) ? (tv?.pageSize || SMALL_PAGE_SIZE) : SMALL_PAGE_SIZE
      } else {
        this.pageStart = 0
        this.pageSize = 0
      }

      // refresh pivot view: both dimensions labels and table body
      this.ctrl.isPvDimsTickle = !this.ctrl.isPvDimsTickle
      this.ctrl.isPvTickle = !this.ctrl.isPvTickle
    },
    // return true if dimension name valid for the view kind
    isDimKindValid (kind, name) {
      switch (kind) {
        case Puih.kind.EXPR:
          return name !== CALC_DIM_NAME && name !== ACC_DIM_NAME && name !== ALL_ACC_DIM_NAME && name !== Puih.SUB_ID_DIM
        case Puih.kind.ACC:
          return name !== EXPR_DIM_NAME && name !== CALC_DIM_NAME && name !== ALL_ACC_DIM_NAME
        case Puih.kind.ALL:
          return name !== EXPR_DIM_NAME && name !== CALC_DIM_NAME && name !== ACC_DIM_NAME
        case Puih.kind.CALC:
          return name !== EXPR_DIM_NAME && name !== ACC_DIM_NAME && name !== ALL_ACC_DIM_NAME && name !== Puih.SUB_ID_DIM
      }
      return false // invalid view kind
    },

    // set initial page view for output table
    setInitialPageView () {
      // dimensions and measure dimension are ordered as [others, row, column]
      // measure dimension: -1 <= position <= rank, it is inserted as extra dimension at index = measure position + 1
      // for example: if position = -1 then at index 0 and the rest of dimensions where index >=0 shifted to the index = index+1
      //
      // expressions view:
      //   dimensions (including measure) on other, last-1 dimension on rows, last dimension on columns
      //   dimensions count: rank  + 1 = rank is a count of normal dimensions + 1 measure dimension
      this.ctrl.kind = Puih.kind.EXPR
      this.srcCalc = '' // clear calculation function name
      const rf = []
      const cf = []
      const tf = []

      // others: rank - 1 dimensions
      let nFld = 0
      let nDim = 0
      let isMdone = false
      for (; nFld < this.rank - 1 && nDim < this.rank - 1; nDim++) {
        // check if this is an expression position
        if (this.exprDimPos + 1 === nFld) {
          tf.push(this.dimProp[this.rank]) // expression dimension
          nFld++
          isMdone = true
        }
        if (nFld >= this.rank - 1) break

        tf.push(this.dimProp[nDim]) // regular dimension
        nFld++
      }

      // rows: last-1 dimension, it can be measure dimension
      if (this.rank > 0 && this.exprDimPos + 1 === nFld) {
        rf.push(this.dimProp[this.rank]) // expression dimension
        isMdone = true
        nFld++
      } else {
        if (nDim < this.rank) rf.push(this.dimProp[nDim++]) // regular dimension
        nFld++
      }

      // columns: last dimension and measure dimension if not inserted yet
      if (nDim < this.rank) cf.push(this.dimProp[nDim++]) // regular dimension
      if (!isMdone) cf.push(this.dimProp[this.rank]) // expression dimension

      // select single item for other dimesions, if diemnsion has All total then select total id item
      for (const f of tf) {
        // select "All" total is exist for that dimension
        let n = 0
        if (f.isTotal) {
          n = f.enums.findIndex(e => e.value === f.totalId)
          if (n < 0) n = 0
        }

        f.selection = [f.enums[n]]
        f.singleSelection = (f.selection.length > 0) ? f.selection[0] : {}
      }

      // for rows and columns select all items
      for (const f of cf) {
        f.selection = Array.from(f.enums)
        f.singleSelection = (f.selection.length > 0) ? f.selection[0] : {}
      }
      for (const f of rf) {
        f.selection = Array.from(f.enums)
        f.singleSelection = (f.selection.length > 0) ? f.selection[0] : {}
      }

      this.rowFields = rf
      this.colFields = cf
      this.otherFields = tf

      this.pvc.reader = this.readerExpr // use expression reader

      // default row-column mode: no row-column headers for scalar output table without sub-values and measure dimension
      // as it is today output table cannot be scalar, always has measure dimension
      this.pvc.rowColMode = !this.isScalar ? Pcvt.SPANS_AND_DIMS_PVT : Pcvt.NO_SPANS_NO_DIMS_PVT

      // store pivot view
      const vs = Pcvt.pivotStateFromFields(this.rowFields, this.colFields, this.otherFields, this.ctrl.isRowColControls, this.pvc.rowColMode)
      vs.kind = this.ctrl.kind || Puih.kind.EXPR // view kind is specific to output tables
      vs.calc = this.srcCalc || ''
      vs.pageStart = 0
      vs.pageSize = this.isPages ? this.pageSize : SMALL_PAGE_SIZE

      this.dispatchTableView({
        key: this.routeKey,
        view: vs,
        digest: this.digest || '',
        modelName: Mdf.modelName(this.theModel),
        runDigest: this.runDigest || '',
        tableName: this.tableName || ''
      })

      // refresh pivot view: both dimensions labels and table body
      this.pvc.formatter.byKey(this.ctrl.kind === Puih.kind.EXPR || this.ctrl.kind === Puih.kind.CALC)
      this.pvc.dimItemKeys = Pcvt.dimItemKeys(EXPR_DIM_NAME)

      this.ctrl.isPvDimsTickle = !this.ctrl.isPvDimsTickle
      this.ctrl.isPvTickle = !this.ctrl.isPvTickle
    },

    // find model run and check if output table exist in the model run
    initRunTable () {
      if (!this.checkRunTable()) return false // return error if model, run or table name is empty

      this.runText = this.runTextByDigest({ ModelDigest: this.digest, RunDigest: this.runDigest })
      if (!Mdf.isNotEmptyRunText(this.runText)) {
        console.warn('Model run not found:', this.digest, this.runDigest)
        this.$q.notify({ type: 'negative', message: this.$t('Model run not found' + ': ' + this.runDigest) })
        return false
      }

      this.tableText = Mdf.tableTextByName(this.theModel, this.tableName)
      if (!Mdf.isNotEmptyTableText(this.tableText)) {
        console.warn('Output table not found:', this.tableName)
        this.$q.notify({ type: 'negative', message: this.$t('Output table not found' + ': ' + this.tableName) })
        return false
      }
      if (!Mdf.isRunTextHasTable(this.runText, this.tableName)) {
        console.warn('Output table not found in model run:', this.tableName, this.runDigest)
        this.$q.notify({ type: 'negative', message: this.$t('Output table not found in model run' + ': ' + this.tableName + ' ' + this.runDigest) })
        return false
      }
      return true
    },
    // check if model digeset, run digest and table name is not empty
    checkRunTable () {
      if (!this.digest) {
        console.warn('Invalid (empty) model digest')
        this.$q.notify({ type: 'negative', message: this.$t('Invalid (empty) model digest') })
        return false
      }
      if (!this.runDigest) {
        console.warn('Unable to show output table: run digest is empty')
        this.$q.notify({ type: 'negative', message: this.$t('Unable to show output table: run digest is empty') })
        return false
      }
      if (!this.tableName) {
        console.warn('Unable to show output table: table name is empty')
        this.$q.notify({ type: 'negative', message: this.$t('Unable to show output table: table name is empty') })
        return false
      }
      return true
    },

    // show output table expressions
    doExpressionPage () {
      // replace measure dimension by expressions measure
      let mName = CALC_DIM_NAME
      if (this.ctrl.kind === Puih.kind.ACC) mName = ACC_DIM_NAME
      if (this.ctrl.kind === Puih.kind.ALL) mName = ALL_ACC_DIM_NAME

      const mNewIdx = this.rank // expression dimension index in dimesions list

      let n = this.replaceMeasureDim(mName, mNewIdx, this.rowFields, false)
      if (n < 0) n = this.replaceMeasureDim(mName, mNewIdx, this.colFields, false)
      if (n < 0) n = this.replaceMeasureDim(mName, mNewIdx, this.otherFields, true)
      if (n < 0) {
        console.warn('Measure dimension not found:', mName)
        this.$q.notify({ type: 'negative', message: this.$t('Measure dimension not found') })
        return
      }

      // remove sub-values dimension
      const removeSubValueDim = (dims) => {
        const n = dims.findIndex(d => d.name === Puih.SUB_ID_DIM)
        if (n >= 0) dims.splice(n, 1)
        return n >= 0
      }
      let isFound = removeSubValueDim(this.rowFields)
      if (!isFound) isFound = removeSubValueDim(this.colFields)
      if (!isFound) isFound = removeSubValueDim(this.otherFields)

      // use expression reader and format by key on expresson dimension
      this.pvc.reader = this.readerExpr
      this.pvc.dimItemKeys = Pcvt.dimItemKeys(EXPR_DIM_NAME)
      this.srcCalc = ''

      // set new view kind and  store pivot view
      this.ctrl.kind = Puih.kind.EXPR
      this.pvc.formatter.byKey(true)
      this.storeViewAndRefreshData()
    },
    // show output table accumulators
    doAccumulatorPage () {
      this.switchToAccumulatorPage(false)
    },
    // show all-accumulators view
    doAllAccumulatorPage () {
      this.switchToAccumulatorPage(true)
    },
    // switch to output table accumulators or all accumulators view
    switchToAccumulatorPage (isToAll) {
      // replace current measure dimension mName by accumulators measure
      // and insert sub-value dimension after accumulators, if current measure is expressions or claculated expressions
      const isFromExpr = this.ctrl.kind === Puih.kind.EXPR || this.ctrl.kind === Puih.kind.CALC

      let mName = EXPR_DIM_NAME
      if (this.ctrl.kind === Puih.kind.CALC) mName = CALC_DIM_NAME
      if (this.ctrl.kind === Puih.kind.ACC) mName = ACC_DIM_NAME
      if (this.ctrl.kind === Puih.kind.ALL) mName = ALL_ACC_DIM_NAME

      const mNewIdx = isToAll ? this.rank + 2 : this.rank + 1 // new accumulators dimension index in dimesions list
      const subIdx = this.rank + 3 // sub-values dimension index in dimensions list

      let n = this.replaceMeasureDim(mName, mNewIdx, this.rowFields, false)
      if (n >= 0 && isFromExpr) this.rowFields.splice(n + 1, 0, this.dimProp[subIdx])
      if (n < 0) {
        n = this.replaceMeasureDim(mName, mNewIdx, this.colFields, false)
        if (n >= 0 && isFromExpr) this.colFields.splice(n + 1, 0, this.dimProp[subIdx])
      }
      if (n < 0) {
        n = this.replaceMeasureDim(mName, mNewIdx, this.otherFields, true)
        if (n >= 0 && isFromExpr) this.otherFields.splice(n + 1, 0, this.dimProp[subIdx])
      }
      if (n < 0) {
        console.warn('Measure dimension not found:', mName)
        this.$q.notify({ type: 'negative', message: this.$t('Measure dimension not found') })
        return
      }

      // select sub-value items: first item if it is on othres or select all items if dimesion on rows or columns
      if (this.otherFields.findIndex(f => f.name === Puih.SUB_ID_DIM) >= 0) {
        this.dimProp[subIdx].selection = [this.dimProp[subIdx].enums[0]]
      } else {
        this.dimProp[subIdx].selection = Array.from(this.dimProp[subIdx].enums)
      }
      this.dimProp[subIdx].singleSelection = (this.dimProp[subIdx].selection.length > 0) ? this.dimProp[subIdx].selection[0] : {}

      // use accumulators or all accumulators reader
      this.pvc.reader = isToAll ? this.readerAllAcc : this.readerAcc
      this.srcCalc = ''

      // set new view kind and reload data
      this.ctrl.kind = isToAll ? Puih.kind.ALL : Puih.kind.ACC
      this.pvc.formatter.byKey(false)
      this.storeViewAndRefreshData()
    },
    // replace measure dimension in rows, columns or othres list by new dimension
    // for example replace expressions dimension with accumulators measure
    replaceMeasureDim (mName, newDimIdx, dims, isOther) {
      // find measure position in dimension list
      const n = dims.findIndex(d => d.name === mName)
      if (n < 0) return n

      dims[n] = this.dimProp[newDimIdx] // replace existing measure with new

      // select all items if it rows or columns, select first item if it is others slicer
      if (isOther) {
        this.dimProp[newDimIdx].selection = [this.dimProp[newDimIdx].enums[0]]
      } else {
        this.dimProp[newDimIdx].selection = Array.from(this.dimProp[newDimIdx].enums)
      }
      this.dimProp[newDimIdx].singleSelection = (this.dimProp[newDimIdx].selection.length > 0) ? this.dimProp[newDimIdx].selection[0] : {}

      return n
    },
    // show calculated output table expressions
    doCalcPage (src) {
      const fnc = Puih.toCalcFnc(src)
      if (!fnc) {
        console.warn('Invalid calculation name:', src)
        this.$q.notify({ type: 'negative', message: this.$t('Invalid calculation name') + ' ' + (src || '') })
        return
      }
      this.srcCalc = src

      // build calculated expressions dimension
      const mNewIdx = this.rank + 4
      this.setCalcEnumsNameLabel(src) // update name and label for calculated items
      this.setCalcDecimals(src) // decimals format: zero decimals if calculation is count else max decimals

      // replace measure dimension by calculation measure
      if (this.ctrl.kind !== Puih.kind.CALC) {
        let mName = EXPR_DIM_NAME
        if (this.ctrl.kind === Puih.kind.ACC) mName = ACC_DIM_NAME
        if (this.ctrl.kind === Puih.kind.ALL) mName = ALL_ACC_DIM_NAME

        let n = this.replaceMeasureDim(mName, mNewIdx, this.rowFields, false)
        if (n < 0) n = this.replaceMeasureDim(mName, mNewIdx, this.colFields, false)
        if (n < 0) n = this.replaceMeasureDim(mName, mNewIdx, this.otherFields, true)
        if (n < 0) {
          console.warn('Measure dimension not found:', mName)
          this.$q.notify({ type: 'negative', message: this.$t('Measure dimension not found') })
          return
        }

        // remove sub-values dimension
        const removeSubValueDim = (dims) => {
          const n = dims.findIndex(d => d.name === Puih.SUB_ID_DIM)
          if (n >= 0) dims.splice(n, 1)
          return n >= 0
        }
        let isFound = removeSubValueDim(this.rowFields)
        if (!isFound) isFound = removeSubValueDim(this.colFields)
        if (!isFound) isFound = removeSubValueDim(this.otherFields)
      }

      // use calculation reader and format by key on calculation dimension
      this.pvc.reader = this.readerCalc
      this.pvc.dimItemKeys = Pcvt.dimItemKeys(CALC_DIM_NAME)

      // set new view kind and  store pivot view
      this.ctrl.kind = Puih.kind.CALC
      this.pvc.formatter.byKey(true)
      this.storeViewAndRefreshData()
    },
    // set calculation items decimals: zero decimals if calculation is count else max decimals
    setCalcDecimals (src) {
      for (const cId in this.ctrl.formatOpts.itemsFormat) {
        if (cId >= CALCULATED_ID_OFFSET && this.ctrl.formatOpts.itemsFormat[cId] !== void 0) {
          this.ctrl.formatOpts.itemsFormat[cId].nDecimal = src === 'COUNT' ? 0 : Pcvt.maxDecimalDefault
          this.ctrl.formatOpts.itemsFormat[cId].maxDecimal = src === 'COUNT' ? 0 : Pcvt.maxDecimalDefault
        }
      }
    },
    // update name and label for calculated items
    setCalcEnumsNameLabel (src) {
      const fc = this.dimProp[this.rank + 4] // [rank + 4]: calculated expression dimension index in dimesions list

      for (const ec of fc.enums) {
        if (ec.value >= CALCULATED_ID_OFFSET) { // if this is calculted item
          ec.name = src + ' ' + fc.enums[ec.exIdx].name
          ec.label = src + ' ' + fc.enums[ec.exIdx].label
        }
      }
    },

    // store pivot view, reload data and refresh pivot view
    storeViewAndRefreshData () {
      // set new view kind and  store pivot view
      const vs = Pcvt.pivotStateFromFields(this.rowFields, this.colFields, this.otherFields, this.ctrl.isRowColControls, this.pvc.rowColMode)
      vs.kind = this.ctrl.kind
      vs.calc = this.srcCalc || ''
      vs.pageStart = this.isPages ? this.pageStart : 0
      vs.pageSize = this.isPages ? this.pageSize : 0

      this.dispatchTableView({
        key: this.routeKey,
        view: vs,
        digest: this.digest || '',
        modelName: Mdf.modelName(this.theModel),
        runDigest: this.runDigest || '',
        tableName: this.tableName || ''
      })

      // reload data and refresh pivot view: both dimensions labels and table body
      this.doRefreshDataPage()

      this.ctrl.isPvDimsTickle = !this.ctrl.isPvDimsTickle
      this.ctrl.isPvTickle = !this.ctrl.isPvTickle
    },

    // show output table notes dialog
    doShowTableNote () {
      this.tableInfoTickle = !this.tableInfoTickle
    },
    // show run notes dialog
    doShowRunNote (modelDgst, runDgst) {
      this.runInfoTickle = !this.runInfoTickle
    },

    // show or hide row/column/other bars
    onToggleRowColControls () {
      this.ctrl.isRowColControls = !this.ctrl.isRowColControls
      this.dispatchTableView({ key: this.routeKey, isRowColControls: this.ctrl.isRowColControls })
    },
    onSetRowColMode (mode) {
      this.pvc.rowColMode = (4 + mode) % 4
      this.dispatchTableView({ key: this.routeKey, rowColMode: this.pvc.rowColMode })
    },
    // switch between show dimension names and item names or labels
    onShowItemNames () {
      this.pvc.isShowNames = !this.pvc.isShowNames
      this.ctrl.isPvDimsTickle = !this.ctrl.isPvDimsTickle
    },
    // show more decimals (or more details) in table body
    onShowMoreFormat () {
      if (!this.pvc.formatter) return
      this.pvc.formatter.doMore()
    },
    // show less decimals (or less details) in table body
    onShowLessFormat () {
      if (!this.pvc.formatter) return
      this.pvc.formatter.doLess()
    },
    // toogle to formatted value or to raw value in table body
    onToggleRawValue () {
      if (!this.pvc.formatter) return
      this.pvc.formatter.doRawValue()
    },
    // copy tab separated values to clipboard: forward actions to pivot table component
    onCopyToClipboard () {
      this.$refs.omPivotTable.onCopyTsv()
    },

    // view table rows by pages
    onPageSize () {
      if (this.isAllPageSize()) {
        this.pageStart = 0
        this.pageSize = 0
      }
      this.doRefreshDataPage()
    },
    onFirstPage () {
      this.pageStart = 0
      this.doRefreshDataPage()
    },
    onPrevPage () {
      this.pageStart = this.pageStart - this.pageSize
      if (this.pageStart < 0) this.pageStart = 0

      this.doRefreshDataPage()
    },
    onNextPage () {
      this.pageStart = this.pageStart + this.pageSize
      this.doRefreshDataPage()
    },
    onLastPage () {
      if (this.isAllPageSize() || this.pageSize > SMALL_PAGE_SIZE) { // limit last page size
        this.pageSize = SMALL_PAGE_SIZE
        this.$q.notify({ type: 'info', message: this.$t('Size reduced to') + ': ' + this.pageSize })
      }
      this.pageStart = LAST_PAGE_OFFSET

      this.doRefreshDataPage(true)
    },
    isAllPageSize () {
      return !this.pageSize || typeof this.pageSize !== typeof 1 || this.pageSize <= 0
    },

    // download output table as csv file
    onDownload () {
      let u = this.omsUrl +
        '/api/model/' + encodeURIComponent(this.digest) +
        '/run/' + encodeURIComponent(this.runDigest) +
        '/table/' + encodeURIComponent(this.tableName)

      let c = ''
      if (this.ctrl.kind === Puih.kind.CALC) {
        c = Puih.toCsvFnc(this.srcCalc)
        if (!c) {
          console.warn('Invalid calculation name:', this.srcCalc)
          this.$q.notify({ type: 'negative', message: this.$t('Invalid calculation name') + ' ' + (this.srcCalc || '') })
          return
        }
      }
      switch (this.ctrl.kind) {
        case Puih.kind.EXPR:
          u += '/expr'
          break
        case Puih.kind.CALC:
          u += '/calc/' + c
          break
        case Puih.kind.ACC:
          u += '/acc'
          break
        case Puih.kind.ALL:
          u += '/all-acc'
          break
        default:
          console.warn('Unable to download output table, t.kind:', this.ctrl.kind)
          this.$q.notify({ type: 'negative', message: this.$t('Unable to download output table') + ': ' + this.tableName })
          return
      }
      u += (this.$q.platform.is.win) ? '/csv-bom' : '/csv'

      openURL(u)
    },

    // reload output table data and reset pivot view to default
    async onReloadDefaultView () {
      if (this.pvc.formatter) {
        this.pvc.formatter.resetOptions()
      }
      this.dispatchTableViewDelete(this.routeKey) // clean current view
      await this.restoreDefaultView()
      await this.setPageView()
      this.doRefreshDataPage()
    },
    // save current view as default output table view
    async onSaveDefaultView () {
      const tv = this.tableView(this.routeKey)
      if (!tv) {
        console.warn('Output table view not found:', this.routeKey)
        return
      }

      // convert selection values from enum Ids to enum codes for rows, columns, others dimensions
      const enumIdsToCodes = (edSrc) => {
        const dst = []
        for (const ed of edSrc) {
          if (!ed?.values) continue // skip if no items selected in the dimension

          const f = this.dimProp.find((d) => d.name === ed.name)
          if (!f) {
            console.warn('Error: dimension not found:', ed.name)
            continue
          }
          const isCd = f.name === CALC_DIM_NAME
          let cArr = []

          const eLen = Mdf.lengthOf(ed.values)
          if (eLen > 0) {
            cArr = Array(eLen)
            let n = 0
            for (let k = 0; k < eLen; k++) {
              const i = f.enums.findIndex(e => e.value === ed.values[k])
              if (i >= 0) {
                if (!isCd) {
                  cArr[n++] = f.enums[i].name
                } else {
                  cArr[n++] = f.enums[i].value < CALCULATED_ID_OFFSET ? f.enums[i].name : ('CALC_' + f.enums[f.enums[i].exIdx].name) // calculated item
                }
              }
            }
            cArr.length = n // remove size of not found
          }

          dst.push({
            name: ed.name,
            values: cArr
          })
        }
        return dst
      }

      // convert output table view to "default" view: replace enum Ids with enum codes
      const dv = {
        rows: enumIdsToCodes(tv.rows),
        cols: enumIdsToCodes(tv.cols),
        others: enumIdsToCodes(tv.others),
        isRowColControls: this.ctrl.isRowColControls,
        rowColMode: this.pvc.rowColMode,
        kind: this.ctrl.kind || Puih.kind.EXPR,
        calc: this.ctrl.kind === Puih.kind.CALC ? (this.srcCalc || '') : '',
        pageStart: this.isPages ? this.pageStart : 0,
        pageSize: this.isPages ? this.pageSize : 0
      }

      // save into indexed db
      try {
        const dbCon = await Idb.connection()
        const rw = await dbCon.openReadWrite(Mdf.modelName(this.theModel))
        await rw.put(this.tableName, dv)
      } catch (e) {
        console.warn('Unable to save default output table view', e)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to save default output table view') })
        return
      }

      this.$q.notify({ type: 'info', message: this.$t('Default view of output table saved') + ': ' + this.tableName })
      this.$emit('table-view-saved', this.tableName)
    },

    // restore default output table view
    async restoreDefaultView () {
      // select default output table view from inxeded db
      let dv
      try {
        const dbCon = await Idb.connection()
        const rd = await dbCon.openReadOnly(Mdf.modelName(this.theModel))
        dv = await rd.getByKey(this.tableName)
      } catch (e) {
        console.warn('Unable to restore default output table view', this.tableName, e)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to restore default output table view') + ': ' + this.tableName })
        return
      }
      // exit if not found or empty
      if (!dv || !dv?.rows || !dv?.cols || !dv?.others) {
        return
      }

      // restore view kind and calculation name
      this.ctrl.kind = (typeof dv?.kind === typeof 1) ? ((dv.kind % 4) || Puih.kind.EXPR) : Puih.kind.EXPR // there are only 4 kinds of view possible for output table
      if (this.ctrl.kind !== Puih.kind.CALC) {
        this.srcCalc = ''
      } else {
        this.srcCalc = (this.ctrl.kind === Puih.kind.CALC && typeof dv?.calc === typeof 'string') ? (dv?.calc || '') : ''
      }

      // convert output table view from "default" view: replace enum codes with enum Ids
      const enumCodesToIds = (edSrc) => {
        const ncp = 'CALC_'.length

        const dst = []
        for (const ed of edSrc) {
          if (!ed.values) continue // empty selection

          const f = this.dimProp.find((d) => d.name === ed.name)
          if (!f) {
            console.warn('Error: dimension not found:', ed.name)
            continue
          }
          const isCd = f.name === CALC_DIM_NAME // it is calculated expressions dimension
          let eArr = []

          const eLen = Mdf.lengthOf(ed.values)
          if (eLen > 0) {
            eArr = Array(eLen)

            let n = 0
            for (let k = 0; k < eLen; k++) {
              // if it is a name of calculated item then find enum id of source expression
              if (isCd && ed.values[k].startsWith('CALC_')) {
                const i = f.enums.findIndex(e => e.name === ed.values[k].substring(ncp))
                if (i >= 0) {
                  eArr[n++] = f.enums[i].value + CALCULATED_ID_OFFSET
                }
              } else { // it is not calculated item
                const i = f.enums.findIndex(e => e.name === ed.values[k])
                if (i >= 0) {
                  eArr[n++] = f.enums[i].value
                }
              }
            }
            eArr.length = n // remove size of not found
          }

          dst.push({
            name: ed.name,
            values: eArr
          })
        }
        return dst
      }
      const rows = enumCodesToIds(dv.rows)
      const cols = enumCodesToIds(dv.cols)
      const others = enumCodesToIds(dv.others)

      // restore default page offset and size
      if (this.isPages) {
        this.pageStart = (typeof dv?.pageStart === typeof 1) ? (dv?.pageStart || 0) : 0
        this.pageSize = (typeof dv?.pageSize === typeof 1) ? (dv?.pageSize || SMALL_PAGE_SIZE) : SMALL_PAGE_SIZE
      } else {
        this.pageStart = 0
        this.pageSize = 0
      }

      // if is not empty any of selection rows, columns, other dimensions
      // then store pivot view: do insert or replace of the view
      if (Mdf.isLength(rows) || Mdf.isLength(cols) || Mdf.isLength(others)) {
        const vs = Pcvt.pivotState(rows, cols, others, dv.isRowColControls, dv.rowColMode || Pcvt.SPANS_AND_DIMS_PVT)
        vs.kind = this.ctrl.kind || Puih.kind.EXPR
        vs.calc = this.srcCalc || ''
        vs.pageStart = this.isPages ? this.pageStart : 0
        vs.pageSize = this.isPages ? this.pageSize : 0

        this.dispatchTableView({
          key: this.routeKey,
          view: vs,
          digest: this.digest || '',
          modelName: Mdf.modelName(this.theModel),
          runDigest: this.runDigest || '',
          tableName: this.tableName || ''
        })
      }
    },

    // pivot table view updated: item keys layout updated
    onPvKeyPos (keyPos) { this.pvKeyPos = keyPos },

    // dimensions drag, drop and selection filter
    //
    onDrag () {
      // drag started
      this.isDragging = true
    },
    onDrop (e) {
      // drag completed: drop
      this.isDragging = false

      // make sure at least one item selected in each dimension
      // other dimensions: use single-select dropdown
      let isAllAcc = false
      for (const f of this.dimProp) {
        if (f.selection.length < 1 && this.isDimKindValid(this.ctrl.kind, f.name)) {
          f.selection.push(f.enums[0])
          if (f.name === ALL_ACC_DIM_NAME) isAllAcc = true
        }
      }
      for (const f of this.otherFields) {
        if (f.selection.length > 1) {
          // select "All" item if total is exist for that dimension
          let n = 0
          if (f.isTotal) {
            n = f.selection.findIndex(e => e.value === f.totalId)
          } else { // if this is calculated dimension then select first calculated item
            if (f.name === CALC_DIM_NAME) {
              n = f.selection.findIndex(e => e.value >= CALCULATED_ID_OFFSET)
            }
          }
          if (n < 0) n = 0

          f.selection = [f.selection[n]]
          if (f.name === ALL_ACC_DIM_NAME) isAllAcc = true
        }
      }
      for (const f of this.dimProp) {
        if (this.isDimKindValid(this.ctrl.kind, f.name)) f.singleSelection = f.selection[0]
      }

      // update pivot view:
      //  if other dimesion(s) filters same as before
      //  then update pivot table view now
      //  else refresh data
      if (Puih.equalFilterState(this.filterState, this.otherFields, ALL_ACC_DIM_NAME)) {
        this.ctrl.isPvTickle = !this.ctrl.isPvTickle
        if (isAllAcc) {
          this.filterState = Puih.makeFilterState(this.otherFields)
        }
      } else {
        this.doRefreshDataPage()
      }
      // update pivot view rows, columns, other dimensions
      this.dispatchTableView({
        key: this.routeKey,
        rows: Pcvt.pivotStateFields(this.rowFields),
        cols: Pcvt.pivotStateFields(this.colFields),
        others: Pcvt.pivotStateFields(this.otherFields),
        kind: this.ctrl.kind
      })
    },

    // dimension select input: selection changed
    onSelectInput (panel, name, vals) {
      if (this.isDragging) return // exit: this is drag-and-drop, no changes in selection yet

      const f = this.dimProp.find((d) => d.name === name)
      if (!f) return

      // sync other dimension(s) single selection value with selection array(s) filter
      if (panel === 'other') {
        f.singleSelection = {}
        f.selection = []
        if (vals) {
          f.singleSelection = vals
          f.selection.push(vals)
        }
      }
      f.selection.sort(
        (left, right) => (left.value === right.value) ? 0 : ((left.value < right.value) ? -1 : 1)
      )

      // update pivot view:
      //   if other dimesions filters same as before then update pivot table view now
      //   else refresh data
      if (panel !== 'other' || Puih.equalFilterState(this.filterState, this.otherFields, ALL_ACC_DIM_NAME)) {
        this.ctrl.isPvTickle = !this.ctrl.isPvTickle
        if (name === ALL_ACC_DIM_NAME) {
          this.filterState = Puih.makeFilterState(this.otherFields)
        }
      } else {
        this.doRefreshDataPage()
      }
      // update pivot view rows, columns, other dimensions
      this.dispatchTableView({
        key: this.routeKey,
        rows: Pcvt.pivotStateFields(this.rowFields),
        cols: Pcvt.pivotStateFields(this.colFields),
        others: Pcvt.pivotStateFields(this.otherFields),
        kind: this.ctrl.kind
      })
    },

    // do "select all" items: all which are visible through filter options
    onSelectAll (name) {
      const f = this.dimProp.find((d) => d.name === name)
      if (!f) return

      // if options not filtered then all select items in dimension
      // else append to current selection items from the filter
      if (f.options.length === f.enums.length) {
        f.selection = Array.from(f.options)
      } else {
        const a = f.options.filter(ov => f.selection.findIndex(sv => sv.value === ov.value) < 0)
        f.selection = f.selection.concat(a)
        f.selection.sort(
          (left, right) => (left.value === right.value) ? 0 : ((left.value < right.value) ? -1 : 1)
        )
      }

      f.singleSelection = f.selection.length > 0 ? f.selection[0] : {}
      f.options = f.enums

      this.updateSelectOrClearView(name)
    },
    // do "clear all" items: all which are visible through filter options
    onClearAll (name) {
      const f = this.dimProp.find((d) => d.name === name)
      if (!f) return

      // if options not filtered then clear all selection (select nothing)
      // else remove from selection all filtered options
      if (f.options.length === f.enums.length) {
        f.selection = []
      } else {
        f.selection = f.selection.filter(sv => f.options.findIndex(ov => ov.value === sv.value) < 0)
      }

      f.singleSelection = f.selection.length > 0 ? f.selection[0] : {}
      f.options = f.enums

      this.updateSelectOrClearView(name)
    },
    // update pivot view after "select all" or "clear all"
    updateSelectOrClearView (name) {
      this.ctrl.isPvTickle = !this.ctrl.isPvTickle

      // update pivot view rows, columns, other dimensions
      this.dispatchTableView({
        key: this.routeKey,
        rows: Pcvt.pivotStateFields(this.rowFields),
        cols: Pcvt.pivotStateFields(this.colFields),
        others: Pcvt.pivotStateFields(this.otherFields),
        kind: this.ctrl.kind
      })
    },
    //
    // end of dimensions drag, drop and selection filter

    // make a label for dimension item(s) select
    selectLabel (isNames, f) {
      const dsl = this.$t('Select')

      if (!f) return dsl + '\u2026'
      //
      switch (f.selection.length) {
        case 0: return dsl + ' ' + (isNames ? f.name : f.label) + '\u2026'
        case 1: return (isNames ? f.selection[0].name : f.selection[0].label)
      }
      return (isNames ? f.selection[0].name : f.selection[0].label) + ', ' + '\u2026'
    },

    // get page of output table data from current model run
    async doRefreshDataPage (isFullPage = false) {
      if (!this.checkRunTable()) return // exit on error

      // save filters: other dimensions selected items
      this.filterState = Puih.makeFilterState(this.otherFields)

      // make output table read layout and url
      const layout = Puih.makeSelectLayout(
        this.tableName,
        this.otherFields,
        [Puih.SUB_ID_DIM, EXPR_DIM_NAME, CALC_DIM_NAME, ACC_DIM_NAME, ALL_ACC_DIM_NAME]
      )

      // if sub_id on other dimensions then add filter by sub-value id
      const fSub = this.filterState?.[Puih.SUB_ID_DIM]
      if (fSub) {
        layout.IsSubId = Array.isArray(fSub) && fSub.length > 0
        if (layout.IsSubId) layout.SubId = fSub[0]
      }

      // if expr_id on other dimensions then add filter by expression name
      if (this.ctrl.kind === Puih.kind.EXPR) {
        const fExpr = this.filterState?.[EXPR_DIM_NAME]
        if (fExpr) {
          if (Array.isArray(fExpr) && fExpr.length > 0) {
            // rank: expressions dimension index in dimesions list
            for (const e of this.dimProp[this.rank].enums) {
              if (e.value === fExpr[0]) {
                layout.ValueName = e.name
                break
              }
            }
          }
        }
      }

      // if acc_id on other dimensions then add filter by accumulator name
      if (this.ctrl.kind === Puih.kind.ACC) {
        const fAcc = this.filterState?.[ACC_DIM_NAME]
        if (fAcc) {
          if (Array.isArray(fAcc) && fAcc.length > 0) {
            // rank + 1: accumulators dimension index in dimesions list
            for (const e of this.dimProp[this.rank + 1].enums) {
              if (e.value === fAcc[0]) {
                layout.ValueName = e.name
                break
              }
            }
          }
        }
      }

      // make calculated page layout: all calculated expressions or single calculation
      if (this.ctrl.kind === Puih.kind.CALC) {
        const fnc = Puih.toCalcFnc(this.srcCalc)
        if (!fnc) {
          console.warn('Invalid calculation name:', this.srcCalc)
          this.$q.notify({ type: 'negative', message: this.$t('Invalid calculation name') + ' ' + (this.srcCalc || '') })
          return
        }
        const cArr = []

        const fCalc = this.filterState?.[CALC_DIM_NAME]
        if (fCalc) {
          if (Array.isArray(fCalc) && fCalc.length > 0) {
            // rank + 4: calculated dimension index in dimesions list
            for (const ec of this.dimProp[this.rank + 4].enums) {
              if (ec.value === fCalc[0]) {
                if (ec.value < CALCULATED_ID_OFFSET) {
                  cArr.push({
                    Calculate: ec.calc,
                    CalcId: ec.value, // table expression
                    IsAggr: false
                  })
                } else {
                  cArr.push({
                    Calculate: fnc + '(' + ec.calc + ')', // derived accumulator aggregation
                    CalcId: ec.value,
                    IsAggr: true
                  })
                }
              }
            }
          }
        } else { // all calculated items
          // rank + 4: calculated dimension index in dimesions list
          for (const ec of this.dimProp[this.rank + 4].enums) {
            if (ec.value < CALCULATED_ID_OFFSET) {
              cArr.push({
                Calculate: ec.calc,
                CalcId: ec.value, // table expression
                IsAggr: false
              })
            } else {
              cArr.push({
                Calculate: fnc + '(' + ec.calc + ')', // derived accumulator aggregation
                CalcId: ec.value,
                IsAggr: true
              })
            }
          }
        }

        if (cArr.length <= 0) {
          console.warn('Invalid (empty) list of calculations:', this.srcCalc)
          this.$q.notify({ type: 'negative', message: this.$t('Invalid (empty) list of calculations') + ' ' + (this.srcCalc || '') })
          return
        }
        layout.Calculation = cArr
      }

      layout.IsAllAccum = this.ctrl.kind === Puih.kind.ALL
      layout.IsAccum = layout.IsAllAccum || this.ctrl.kind === Puih.kind.ACC
      layout.Offset = 0
      layout.Size = 0
      layout.IsFullPage = false
      if (this.isPages) {
        layout.Offset = this.pageStart || 0
        layout.Size = (!!this.pageSize && typeof this.pageSize === typeof 1) ? (this.pageSize || 0) : 0
        layout.IsFullPage = !!isFullPage
      }

      // validation completed: build url and post query
      this.loadDone = false
      this.loadWait = true

      const u = this.omsUrl +
        '/api/model/' + encodeURIComponent(this.digest) +
        '/run/' + encodeURIComponent(this.runDigest) + '/table/' +
        (this.ctrl.kind !== Puih.kind.CALC ? 'value-id' : 'calc-id')

      // retrieve page from server, it must be: {Layout: {...}, Page: [...]}
      let isOk = false
      try {
        const response = await this.$axios.post(u, layout)
        const rsp = response.data

        let d = []
        if (!rsp) {
          this.pageStart = 0
          this.isLastPage = true
        } else {
          if ((rsp?.Page?.length || 0) > 0) {
            d = rsp.Page
          }
          this.pageStart = rsp?.Layout?.Offset || 0
          this.isLastPage = rsp?.Layout?.IsLastPage || false
        }

        // update pivot table view
        this.inpData = Object.freeze(d)
        this.loadDone = true
        this.ctrl.isPvTickle = !this.ctrl.isPvTickle
        isOk = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or output table data not found', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or output table data not found') + ': ' + this.tableName })
      }

      this.loadWait = false
      if (isOk) {
        this.dispatchTableView({
          key: this.routeKey,
          pageStart: this.isPages ? this.pageStart : 0,
          pageSize: this.isPages ? this.pageSize : 0
        })
      }
    },

    ...mapActions('uiState', {
      dispatchTableView: 'tableView',
      dispatchTableViewDelete: 'tableViewDelete'
    })
  },

  mounted () {
    this.doRefresh()
    this.$emit('tab-mounted', 'table', { digest: this.digest, runDigest: this.runDigest, tableName: this.tableName })
  }
}
