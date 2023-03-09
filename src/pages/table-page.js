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
        rowColMode: Pcvt.SPANS_AND_DIMS_PVT,  // rows and columns mode: 2 = use spans and show dim names, 1 = use spans and hide dim names, 0 = no spans and hide dim names
        isShowNames: false,                   // if true then show dimension names and item names instead of labels
        readValue: (r) => (!r.IsNull ? r.Value : (void 0)),
        processValue: Pcvt.asIsPval,          // default value processing: return as is
        formatter: Pcvt.formatDefault,        // disable format(), parse() and validation by default
        cellClass: 'pv-cell-right'            // default cell value style: right justified number
      },
      pvKeyPos: [],           // position of each dimension item in cell key
      isDragging: false,      // if true then user is dragging dimension select control
      exprDimPos: 0,          // expression dimension position: table ExprPos
      totalEnumLabel: '',     // total enum item label, language-specific, ex.: All
      loadRunWait: false,
      refreshRunTickle: false,
      runInfoTickle: false,
      tableInfoTickle: false
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

      this.rank = Mdf.tableSizeByName(this.theModel, this.tableName)?.rank || 0
      this.subCount = this.runText.SubCount || 0
      this.exprDimPos = this.tableText.Table.ExprPos || 0

      this.isNullable = true // output table always nullable
      this.isScalar = false // output table view never scalar: there is always a measure dimension

      this.totalEnumLabel = Mdf.wordByCode(this.wordList, Mdf.ALL_WORD_CODE)

      // adjust controls
      this.pvc.rowColMode = !this.isScalar ? Pcvt.SPANS_AND_DIMS_PVT : Pcvt.NO_SPANS_NO_DIMS_PVT
      this.ctrl.isRowColModeToggle = !this.isScalar
      this.ctrl.isRowColControls = !this.isScalar
      this.pvKeyPos = []

      // make dimensions:
      //  [0, rank - 1] of enum-based dimensions
      //  [rank]        expressions measure dimension: expressions as enums
      //  [rank + 1]    accumulators measure dimension: accumulators as enums
      //  [rank + 2]    all accumulators measure dimension: all accumulators, including derived as enums
      //  [rank + 3]    sub-value dimension: enum labebls same as enum id's
      this.dimProp = Array(this.rank + 4)

      for (let n = 0; n < this.rank; n++) {
        const dt = this.tableText.TableDimsTxt[n]
        const t = Mdf.typeTextById(this.theModel, (dt.Dim.TypeId || 0))
        const f = {
          name: dt.Dim.Name || '',
          label: Mdf.descrOfDescrNote(dt) || dt.Dim.Name || '',
          read: (r) => (r.DimIds.length > n ? r.DimIds[n] : void 0),
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

      // expression measure dimension: items are output expressions
      const exprFmt = {}
      let maxDec = -1
      let isAllRaw = true

      const fe = {
        name: EXPR_DIM_NAME,
        label: this.tableText.ExprDescr || this.$t('Measure'),
        read: (r) => (r.ExprId),
        enums: [],
        options: [],
        selection: [],
        singleSelection: {},
        isTotal: false,
        totalId: 0,
        filter: (val, update, abort) => {}
      }
      const eLst = []

      for (let j = 0; j < this.tableText.TableExprTxt.length; j++) {
        if (!this.tableText.TableExprTxt[j].hasOwnProperty('Expr')) continue

        const e = this.tableText.TableExprTxt[j].Expr
        const eId = e.ExprId
        eLst.push({
          value: eId,
          name: e.Name || eId.toString(),
          label: Mdf.descrOfDescrNote(this.tableText.TableExprTxt[j]) || e.SrcExpr || e.Name || eId.toString()
        })

        // format value handlers: output table values are always float and nullable
        const nDec = e.Decimals || 0
        const isRaw = nDec < 0

        exprFmt[eId] = {
          isRawValue: isRaw,
          nDecimal: (!isRaw ? nDec : Pcvt.maxDecimalDefault),
          maxDecimal: (!isRaw ? nDec : Pcvt.maxDecimalDefault)
        }
        isAllRaw = isAllRaw && isRaw
        if (maxDec < nDec) maxDec = nDec
      }
      if (maxDec < 0) maxDec = Pcvt.maxDecimalDefault // if model decimals=-1, which is display all then limit decimals = 4

      fe.enums = Object.freeze(eLst)
      fe.options = fe.enums
      fe.filter = Puih.makeFilter(fe)

      this.dimProp[this.rank] = fe // expression measure dimension at [rank] position

      // accumulators measure dimension: items are output table accumulators
      const makeAccDim = (isAll) => {
        const fa = {
          name: !isAll ? ACC_DIM_NAME : ALL_ACC_DIM_NAME,
          label: this.tableText.ExprDescr || this.$t('Measure'),
          read: (r) => (r.AccId),
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
      //
      this.dimProp[this.rank + 2].read = (r) => ('none') // TODO
      //

      // sub-value dimension: items name and label are same as item id
      const fs = {
        name: Puih.SUB_ID_DIM,
        label: this.$t('Sub #'),
        read: (r) => (r.SubId),
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
        isRawValue: isAllRaw,
        nDecimal: maxDec,
        maxDecimal: maxDec,
        isByKey: (this.ctrl.kind === Puih.kind.EXPR) || false,
        itemsFormat: exprFmt
      })
      this.pvc.dimItemKeys = Pcvt.dimItemKeys(EXPR_DIM_NAME)
      this.ctrl.formatOpts = this.pvc.formatter.options()
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
      this.ctrl.kind = (typeof tv?.kind === typeof 1) ? (tv.kind % 3 || Puih.kind.EXPR) : Puih.kind.EXPR // there are only 3 kinds of view possible for output table

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

      // restore formatter and controls view state
      this.pvc.formatter.byKey((this.ctrl.kind === Puih.kind.EXPR) || false)

      this.ctrl.isRowColControls = !!tv.isRowColControls
      this.pvc.rowColMode = typeof tv.rowColMode === typeof 1 ? tv.rowColMode : Pcvt.NO_SPANS_NO_DIMS_PVT

      // refresh pivot view: both dimensions labels and table body
      this.ctrl.isPvDimsTickle = !this.ctrl.isPvDimsTickle
      this.ctrl.isPvTickle = !this.ctrl.isPvTickle
    },
    // return true if dimension name valid for the view kind
    isDimKindValid (kind, name) {
      switch (kind) {
        case Puih.kind.EXPR:
          return name !== ACC_DIM_NAME && name !== ALL_ACC_DIM_NAME && name !== Puih.SUB_ID_DIM // skip sub-value and accumulators measure
        case Puih.kind.ACC:
          return name !== EXPR_DIM_NAME && name !== ALL_ACC_DIM_NAME // skip other measure dimensions
        case Puih.kind.ALL:
          return name !== EXPR_DIM_NAME && name !== ACC_DIM_NAME // skip other measure dimensions
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

      // default row-column mode: no row-column headers for scalar output table without sub-values and measure dimension
      // as it is today output table cannot be scalar, always has measure dimension
      this.pvc.rowColMode = !this.isScalar ? Pcvt.SPANS_AND_DIMS_PVT : Pcvt.NO_SPANS_NO_DIMS_PVT

      // store pivot view
      const vs = Pcvt.pivotStateFromFields(this.rowFields, this.colFields, this.otherFields, this.ctrl.isRowColControls, this.pvc.rowColMode)
      vs.kind = this.ctrl.kind || Puih.kind.EXPR // view kind is specific to output tables

      this.dispatchTableView({
        key: this.routeKey,
        view: vs,
        digest: this.digest || '',
        modelName: Mdf.modelName(this.theModel),
        runDigest: this.runDigest || '',
        tableName: this.tableName || ''
      })

      // refresh pivot view: both dimensions labels and table body
      this.pvc.formatter.byKey((this.ctrl.kind === Puih.kind.EXPR) || false)

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
        this.$q.notify({ type: 'negative', message: this.$t('Output table not found in model run' + ': ' + this.runDigest) })
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
      const kind = this.ctrl.kind
      const mName = kind === Puih.kind.ACC ? ACC_DIM_NAME : ALL_ACC_DIM_NAME
      const mNewIdx = this.rank // expression dimension index in dimesions list

      let n = this.replaceMeasureDim(mName, mNewIdx, this.rowFields, false)
      if (n < 0) n = this.replaceMeasureDim(mName, mNewIdx, this.colFields, false)
      if (n < 0) n = this.replaceMeasureDim(mName, mNewIdx, this.otherFields, true)
      if (n < 0) {
        console.warning('Measure dimension not found:', mName)
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

      // set new view kind and  store pivot view
      this.ctrl.kind = Puih.kind.EXPR
      this.pvc.formatter.byKey(true)
      this.storeViewAndRefreshData()
    },
    // show output table accumulators
    doAccumulatorPage () {
      // replace measure dimension by accumulators measure
      // and insert sub-value dimension after accumulators
      const kind = this.ctrl.kind
      const mName = kind === Puih.kind.EXPR ? EXPR_DIM_NAME : ALL_ACC_DIM_NAME
      const mNewIdx = this.rank + 1 // accumulators dimension index in dimesions list
      const subIdx = this.rank + 3 // sub-values dimension index in dimensions list
      let isOther = false

      let n = this.replaceMeasureDim(mName, mNewIdx, this.rowFields, false)
      if (n >= 0) this.rowFields.splice(n + 1, 0, this.dimProp[subIdx])
      if (n < 0) {
        n = this.replaceMeasureDim(mName, mNewIdx, this.colFields, false)
        if (n >= 0) this.colFields.splice(n + 1, 0, this.dimProp[subIdx])
      }
      if (n < 0) {
        n = this.replaceMeasureDim(mName, mNewIdx, this.otherFields, true)
        if (n >= 0) this.otherFields.splice(n + 1, 0, this.dimProp[subIdx])
        isOther = n >= 0
      }
      if (n < 0) {
        console.warning('Measure dimension not found:', mName)
        this.$q.notify({ type: 'negative', message: this.$t('Measure dimension not found') })
        return
      }

      // select sub-value items: all items if dimesion on rows or columns or first item if it is on othres
      if (isOther) {
        this.dimProp[subIdx].selection = [this.dimProp[subIdx].enums[0]]
      } else {
        this.dimProp[subIdx].selection = Array.from(this.dimProp[subIdx].enums)
      }
      this.dimProp[subIdx].singleSelection = (this.dimProp[subIdx].selection.length > 0) ? this.dimProp[subIdx].selection[0] : {}

      // set new view kind and reload data
      this.ctrl.kind = Puih.kind.ACC
      this.pvc.formatter.byKey(false)
      this.storeViewAndRefreshData()
    },

    // show all-accumulators view
    doAllAccumulatorPage () {
      // const kind = this.ctrl.kind // current kind of table view
      // this.ctrl.kind = Puih.kind.ALL
      // this.doRefreshDataPage()
    },

    // replace measure dimension in rows, columns or othres list by new dimension
    // for example replace expressions dimension with accumulators measure
    replaceMeasureDim (mName, newDimIdx, dims, isOther) {
      // find measure position in dimension list
      const n = dims.findIndex(d => d.name === mName)
      if (n < 0) return n

      dims[n] = this.dimProp[newDimIdx] // replace existing measure with new

      // select all items if it rows or colums, select first item if it is others slicer
      if (isOther) {
        this.dimProp[newDimIdx].selection = [this.dimProp[newDimIdx].enums[0]]
      } else {
        this.dimProp[newDimIdx].selection = Array.from(this.dimProp[newDimIdx].enums)
      }
      this.dimProp[newDimIdx].singleSelection = (this.dimProp[newDimIdx].selection.length > 0) ? this.dimProp[newDimIdx].selection[0] : {}

      return n
    },

    // store pivot view, reload data and refresh pivot view
    storeViewAndRefreshData () {
      // set new view kind and  store pivot view
      const vs = Pcvt.pivotStateFromFields(this.rowFields, this.colFields, this.otherFields, this.ctrl.isRowColControls, this.pvc.rowColMode)
      vs.kind = this.ctrl.kind

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
      this.pvc.rowColMode = (3 + mode) % 3
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

    // download output table as csv file
    onDownload () {
      let u = this.omsUrl +
        '/api/model/' + encodeURIComponent(this.digest) +
        '/run/' + encodeURIComponent(this.runDigest) +
        '/table/' + encodeURIComponent(this.tableName)

      switch (this.ctrl.kind) {
        case Puih.kind.EXPR:
          u += '/expr'
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
          let cArr = []

          const eLen = Mdf.lengthOf(ed.values)
          if (eLen > 0) {
            cArr = Array(eLen)
            let n = 0
            for (let k = 0; k < eLen; k++) {
              const i = f.enums.findIndex(e => e.value === ed.values[k])
              if (i >= 0) {
                cArr[n++] = f.enums[i].name
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
        kind: this.ctrl.kind || Puih.kind.EXPR
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

      // restore view kind
      this.ctrl.kind = (typeof dv?.kind === typeof 1) ? ((dv.kind % 3) || Puih.kind.EXPR) : Puih.kind.EXPR // there are only 3 kinds of view possible for output table

      // convert output table view from "default" view: replace enum codes with enum Ids
      const enumCodesToIds = (edSrc) => {
        const dst = []
        for (const ed of edSrc) {
          if (!ed.values) continue // empty selection

          const f = this.dimProp.find((d) => d.name === ed.name)
          if (!f) {
            console.warn('Error: dimension not found:', ed.name)
            continue
          }
          let eArr = []

          const eLen = Mdf.lengthOf(ed.values)
          if (eLen > 0) {
            eArr = Array(eLen)
            let n = 0
            for (let k = 0; k < eLen; k++) {
              const i = f.enums.findIndex(e => e.name === ed.values[k])
              if (i >= 0) {
                eArr[n++] = f.enums[i].value
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

      // if is not empty any of selection rows, columns, other dimensions
      // then store pivot view: do insert or replace of the view
      if (Mdf.isLength(rows) || Mdf.isLength(cols) || Mdf.isLength(others)) {
        const vs = Pcvt.pivotState(rows, cols, others, dv.isRowColControls, dv.rowColMode || Pcvt.SPANS_AND_DIMS_PVT)
        vs.kind = this.ctrl.kind || Puih.kind.EXPR

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
      let isSubIdOrMeasure = false
      for (const f of this.dimProp) {
        if (f.selection.length < 1 && this.isDimKindValid(this.ctrl.kind, f.name)) {
          f.selection.push(f.enums[0])
          if (f.name === Puih.SUB_ID_DIM || f.name === this.measureName) isSubIdOrMeasure = true
        }
      }
      for (const f of this.otherFields) {
        if (f.selection.length > 1) {
          // select "All" item if total is exist for that dimension
          let n = 0
          if (f.isTotal) {
            n = f.selection.findIndex(e => e.value === f.totalId)
            if (n < 0) n = 0
          }
          f.selection = [f.selection[n]]
          if (f.name === Puih.SUB_ID_DIM || f.name === this.measureName) isSubIdOrMeasure = true
        }
      }
      for (const f of this.dimProp) {
        if (this.isDimKindValid(this.ctrl.kind, f.name)) f.singleSelection = f.selection[0]
      }

      // update pivot view:
      //  if other dimesion(s) filters same as before
      //  then update pivot table view now
      //  else refresh data
      if (Puih.equalFilterState(this.filterState, this.otherFields, [Puih.SUB_ID_DIM, EXPR_DIM_NAME, ACC_DIM_NAME, ALL_ACC_DIM_NAME])) {
        this.ctrl.isPvTickle = !this.ctrl.isPvTickle
        if (isSubIdOrMeasure) {
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
      if (panel !== 'other' || Puih.equalFilterState(this.filterState, this.otherFields, [Puih.SUB_ID_DIM, EXPR_DIM_NAME, ACC_DIM_NAME, ALL_ACC_DIM_NAME])) {
        this.ctrl.isPvTickle = !this.ctrl.isPvTickle
        if (name === Puih.SUB_ID_DIM || name === this.measureName) {
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
      if (name === Puih.SUB_ID_DIM) {
        this.filterState = Puih.makeFilterState(this.otherFields)
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
    async doRefreshDataPage () {
      if (!this.checkRunTable()) return // exit on error

      this.loadDone = false
      this.loadWait = true

      // save filters: other dimensions selected items
      this.filterState = Puih.makeFilterState(this.otherFields)

      // make output table read layout and url
      const layout = Puih.makeSelectLayout(this.tableName, this.otherFields, [Puih.SUB_ID_DIM, EXPR_DIM_NAME, ACC_DIM_NAME, ALL_ACC_DIM_NAME])
      layout.IsAccum = this.ctrl.kind !== Puih.kind.EXPR
      layout.IsAllAccum = this.ctrl.kind === Puih.kind.ALL

      const u = this.omsUrl +
        '/api/model/' + encodeURIComponent(this.digest) +
        '/run/' + encodeURIComponent(this.runDigest) + '/table/value-id'

      // retrieve page from server, it must be: {Layout: {...}, Page: [...]}
      try {
        const response = await this.$axios.post(u, layout)
        const rsp = response.data
        let d = []
        if (rsp) {
          if ((rsp?.Page?.length || 0) > 0) d = rsp.Page
        }

        // update pivot table view
        this.inpData = Object.freeze(d)
        this.loadDone = true
        this.ctrl.isPvTickle = !this.ctrl.isPvTickle
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or output table data not found', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or output table data not found') + ': ' + this.tableName })
      }

      this.loadWait = false
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
