import { mapState, mapGetters, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'
import RunBar from 'components/RunBar.vue'
import WorksetBar from 'components/WorksetBar.vue'
import RunInfoDialog from 'components/RunInfoDialog.vue'
import WorksetInfoDialog from 'components/WorksetInfoDialog.vue'
import ParameterInfoDialog from 'components/ParameterInfoDialog.vue'
import draggable from 'vuedraggable'
import * as Pcvt from 'components/pivot-cvt'
import * as Puih from './pivot-ui-helper'
import PvTable from 'components/PvTable'

const SUB_ID_DIM = 'SubId' // sub-value id dminesion name

export default {
  name: 'ParameterPage',
  components: { draggable, PvTable, RunBar, WorksetBar, RunInfoDialog, WorksetInfoDialog, ParameterInfoDialog },

  props: {
    digest: { type: String, default: '' },
    runDigest: { type: String, default: '' },
    worksetName: { type: String, default: '' },
    parameterName: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false }
  },

  /* eslint-disable no-multi-spaces */
  data () {
    return {
      loadDone: false,
      loadWait: false,
      saveStarted: false,
      saveWait: false,
      isNullable: false,  // if true then parameter value can be NULL
      paramText: Mdf.emptyParamText(),
      paramSize: Mdf.emptyParamSize(),
      paramType: Mdf.emptyTypeText(),
      paramRunSet: Mdf.emptyParamRunSet(),
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
        isPvTickle: false,      // used to update view of pivot table (on data selection change, on edit/save change)
        isPvDimsTickle: false,  // used to update dimensions in pivot table (on label change)
        formatOpts: void 0      // hide format controls by default
      },
      pvc: {
        rowColMode: 2, // rows and columns mode: 2 = use spans and show dim names, 1 = use spans and hide dim names, 0 = no spans and hide dim names
        readValue: (r) => (!r.IsNull ? r.Value : (void 0)),
        processValue: Pcvt.asIsPval,    // default value processing: return as is
        formatter: Pcvt.formatDefault,  // disable format(), parse() and validation by default
        cellClass: 'pv-cell-right'      // default cell value style: right justified number
      },
      pvKeyPos: [],           // position of each dimension item in cell key
      edt: Pcvt.emptyEdit(),  // editor options and state shared with child
      isDragging: false,      // if true then user is dragging dimension select control
      showEditDiscardDlg: false,
      runInfoTickle: false,
      worksetInfoTickle: false,
      paramInfoTickle: false
    }
  },
  /* eslint-enable no-multi-spaces */

  computed: {
    isFromRun () { return (this.runDigest || '') !== '' },
    routeKey () {
      return (this.runDigest || '') !== ''
        ? Mdf.parameterRunPath(this.digest, this.runDigest, this.parameterName)
        : Mdf.parameterWorksetPath(this.digest, this.worksetName, this.parameterName)
    },
    paramDescr () { return Mdf.descrOfDescrNote(this.paramText) },

    isEditUpdated () { return this.edt.isUpdated },

    ...mapState('model', {
      theModel: state => state.theModel,
      worksetTextListUpdated: state => state.worksetTextListUpdated
    }),
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest',
      worksetTextByName: 'worksetTextByName'
    }),
    ...mapGetters('uiState', {
      paramView: 'paramView'
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl
    })
  },

  watch: {
    routeKey () { this.doRefresh() },
    refreshTickle () { this.doRefresh() },
    isEditUpdated () { this.$emit('edit-updated', this.edt.isUpdated, this.routeKey) },
    worksetTextListUpdated () { this.onWorksetUpdated() }
  },

  methods: {
    // show run parameter notes dialog
    doShowParamNote () {
      this.paramInfoTickle = !this.paramInfoTickle
    },
    // show run notes dialog
    doShowRunNote (modelDgst, runDgst) {
      this.runInfoTickle = !this.runInfoTickle
    },
    // show current workset notes dialog
    doShowWorksetNote (modelDgst, name) {
      this.worksetInfoTickle = !this.worksetInfoTickle
    },
    // on button click "new model run": pass event from child up to the next level
    onNewRunClick () {
      this.$emit('new-run-select')
    },
    // on button click "toggle workset readonly status": pass event from child up to the next level
    onWorksetEditToggle (isReadonly) {
      this.$emit('set-update-readonly', isReadonly)
    },

    // workset updated: check read-only status and adjust controls
    onWorksetUpdated () {
      const { isFound, src } = this.initParamRunSet()
      this.edt.isEnabled = !this.isFromRun && isFound && Mdf.isNotEmptyWorksetText(src) && !src.IsReadonly
    },

    // show or hide row/column/other bars
    toggleRowColControls () {
      this.ctrl.isRowColControls = !this.ctrl.isRowColControls
      this.dispatchParamView({ key: this.routeKey, isRowColControls: this.ctrl.isRowColControls })
    },
    onSetRowColMode (mode) {
      this.pvc.rowColMode = (3 + mode) % 3
      this.dispatchParamView({ key: this.routeKey, rowColMode: this.pvc.rowColMode })
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
    // reload parameter data and reset pivot view to default
    onReload () {
      if (this.pvc.formatter) {
        this.pvc.formatter.resetOptions()
      }
      this.setDefaultPageView()
      this.doRefreshDataPage()
    },
    // pivot table view updated: item keys layout updated
    onPvKeyPos (keyPos) {
      this.pvKeyPos = keyPos
    },

    // copy tab separated values to clipboard: forward actions to pivot table component
    onCopyToClipboard () { this.$refs.omPivotTable.onCopyTsv() },

    // start of editor methods
    //
    // start or stop parameter editing
    doEditToogle () {
      if (this.edt.isEdit && this.edt.isUpdated) { // redirect to dialog to confirm "discard changes?"
        this.showEditDiscardDlg = true
        return
      }
      // else: start editing or stop editing (no changes in data)
      const isEditNow = this.edt.isEdit
      Pcvt.resetEdit(this.edt)
      this.edt.isEdit = !isEditNow
      this.dispatchParamView({ key: this.routeKey, edit: this.edt })
    },
    // parameter editor question: "Discard all changes?", user answer: "yes"
    onYesDiscardChanges () {
      Pcvt.resetEdit(this.edt)
      this.dispatchParamView({ key: this.routeKey, edit: this.edt })
    },

    // save if data editied
    doEditSave () {
      this.doSaveDataPage()
    },

    // undo and redo last edit changes: forward actions to pivot table component
    onUndo () { this.$refs.omPivotTable.doUndo() },
    onRedo () { this.$refs.omPivotTable.doRedo() },

    // on edit events: input confirm (data entered), undo, redo, paste
    onPvEdit () {
      this.dispatchParamView({ key: this.routeKey, edit: this.edt })
    },
    //
    // end of editor methods

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
      let isSubIdSelUpdate = false
      for (const f of this.dimProp) {
        if (f.selection.length < 1) {
          f.selection.push(f.enums[0])
          if (f.name === SUB_ID_DIM) isSubIdSelUpdate = true
        }
      }
      for (const f of this.otherFields) {
        if (f.selection.length > 1) {
          f.selection.splice(1)
          if (f.name === SUB_ID_DIM) isSubIdSelUpdate = true
        }
      }
      for (const f of this.dimProp) {
        f.singleSelection = f.selection[0]
      }

      // update pivot view:
      //  if other dimesion(s) filters same as before
      //  then update pivot table view now
      //  else refresh data
      if (Puih.equalFilterState(this.filterState, this.otherFields, SUB_ID_DIM)) {
        this.ctrl.isPvTickle = !this.ctrl.isPvTickle
        if (isSubIdSelUpdate) {
          this.filterState = Puih.makeFilterState(this.otherFields)
        }
      } else {
        this.doRefreshDataPage()
      }
      // update pivot view rows, columns, other dimensions
      this.dispatchParamView({
        key: this.routeKey,
        rows: Pcvt.pivotStateFields(this.rowFields),
        cols: Pcvt.pivotStateFields(this.colFields),
        others: Pcvt.pivotStateFields(this.otherFields)
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
      if (panel !== 'other' || Puih.equalFilterState(this.filterState, this.otherFields, SUB_ID_DIM)) {
        this.ctrl.isPvTickle = !this.ctrl.isPvTickle
        if (name === SUB_ID_DIM) {
          this.filterState = Puih.makeFilterState(this.otherFields)
        }
      } else {
        this.doRefreshDataPage()
      }
      // update pivot view rows, columns, other dimensions
      this.dispatchParamView({
        key: this.routeKey,
        rows: Pcvt.pivotStateFields(this.rowFields),
        cols: Pcvt.pivotStateFields(this.colFields),
        others: Pcvt.pivotStateFields(this.otherFields)
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
      if (name === SUB_ID_DIM) {
        this.filterState = Puih.makeFilterState(this.otherFields)
      }
      // update pivot view rows, columns, other dimensions
      this.dispatchParamView({
        key: this.routeKey,
        rows: Pcvt.pivotStateFields(this.rowFields),
        cols: Pcvt.pivotStateFields(this.colFields),
        others: Pcvt.pivotStateFields(this.otherFields)
      })
    },
    //
    // end of dimensions drag, drop and selection filter

    doRefresh () {
      this.initView()
      this.doRefreshDataPage()
      if (!this.isFromRun) {
        this.$emit('edit-updated', this.edt.isUpdated, this.routeKey)
      }
    },

    // initialize current page view on mounted or tab switch
    initView () {
      // check if parameter exist in model run or in workset
      const { isFound, src } = this.initParamRunSet()
      if (!isFound) {
        return // exit on error
      }

      // find parameter, parameter type and size, including run sub-values count
      this.paramText = Mdf.paramTextByName(this.theModel, this.parameterName)
      this.paramSize = Mdf.paramSizeByName(this.theModel, this.parameterName)
      this.paramType = Mdf.typeTextById(this.theModel, (this.paramText.Param.TypeId || 0))

      this.isNullable = this.paramText.Param.hasOwnProperty('IsExtendable') && (this.paramText.Param.IsExtendable || false)
      this.subCount = this.paramRunSet.SubCount || 0

      // adjust controls
      this.edt.isEnabled = !this.isFromRun && isFound && Mdf.isNotEmptyWorksetText(src) && !src.IsReadonly
      Pcvt.resetEdit(this.edt) // clear editor state

      const isRc = this.paramSize.rank > 0 || this.subCount > 1
      this.pvc.rowColMode = isRc ? 2 : 0
      this.ctrl.isRowColModeToggle = isRc
      this.ctrl.isRowColControls = isRc
      this.pvKeyPos = []

      // make dimensions:
      //  [rank] of enum-based dimensions
      //  sub-value id dimension, if parameter has sub-values
      this.dimProp = []
      const dsl = this.$t('Select')

      for (let n = 0; n < this.paramText.ParamDimsTxt.length; n++) {
        const dt = this.paramText.ParamDimsTxt[n]
        const t = Mdf.typeTextById(this.theModel, (dt.Dim.TypeId || 0))
        const f = {
          name: dt.Dim.Name || '',
          label: Mdf.descrOfDescrNote(dt) || dt.Dim.Name || '',
          selectLabel: () => dsl + '\u2026',
          read: (r) => (r.DimIds.length > n ? r.DimIds[n] : void 0),
          enums: [],
          options: [],
          selection: [],
          singleSelection: {},
          filter: (val, update, abort) => {}
        }

        const eLst = Array(t.TypeEnumTxt.length)
        for (let j = 0; j < t.TypeEnumTxt.length; j++) {
          const eId = t.TypeEnumTxt[j].Enum.EnumId
          eLst[j] = {
            value: eId,
            label: Mdf.enumDescrOrCodeById(t, eId) || t.TypeEnumTxt[j].Enum.Name || eId.toString()
          }
        }
        f.enums = Object.freeze(eLst)
        f.options = f.enums
        f.filter = Puih.makeFilter(f)
        f.selectLabel = Puih.makeSelectLabel(f, dsl)

        this.dimProp.push(f)
      }

      // if parameter has sub-values then add sub-value id dimension
      if (this.subCount > 1) {
        const f = {
          name: SUB_ID_DIM,
          label: this.$t('Sub #'),
          selectLabel: () => dsl + '\u2026',
          read: (r) => (r.SubId),
          enums: [],
          options: [],
          selection: [],
          singleSelection: {},
          filter: (val, update, abort) => {}
        }

        const eLst = Array(this.subCount)
        for (let k = 0; k < this.subCount; k++) {
          eLst[k] = { value: k, label: k.toString() }
        }
        f.enums = Object.freeze(eLst)
        f.options = f.enums
        f.filter = Puih.makeFilter(f)
        f.selectLabel = Puih.makeSelectLabel(f, dsl)

        this.dimProp.push(f)
      }

      // setup process value and format value handlers:
      //  if parameter type is one of built-in then process and format value as float, int, boolen or string
      //  else parameter type is enum-based: process and format value as int enum id
      this.pvc.processValue = Pcvt.asIsPval
      this.pvc.formatter = Pcvt.formatDefault({ isNullable: this.isNullable })
      this.pvc.cellClass = 'pv-cell-right' // numeric cell value style by default
      this.ctrl.formatOpts = void 0
      this.edt.kind = Pcvt.EDIT_NUMBER

      if (Mdf.isBuiltIn(this.paramType.Type)) {
        if (Mdf.isFloat(this.paramType.Type)) {
          this.pvc.processValue = Pcvt.asFloatPval
          this.pvc.formatter = Pcvt.formatFloat({ isNullable: this.isNullable, nDecimal: -1, groupSep: ',' }) // decimal: -1 is to show source float value
        }
        if (Mdf.isInt(this.paramType.Type)) {
          this.pvc.processValue = Pcvt.asIntPval
          this.pvc.formatter = Pcvt.formatInt({ isNullable: this.isNullable, groupSep: ',' })
        }
        if (Mdf.isBool(this.paramType.Type)) {
          this.pvc.processValue = Pcvt.asBoolPval
          this.pvc.cellClass = 'pv-cell-center'
          this.pvc.formatter = Pcvt.formatBool()
          this.edt.kind = Pcvt.EDIT_BOOL
        }
        if (Mdf.isString(this.paramType.Type)) {
          this.pvc.cellClass = 'pv-cell-left' // no process or format value required for string type
          this.edt.kind = Pcvt.EDIT_STRING
        }
      } else {
        // if parameter is enum-based then value is integer enum id and format(value) should return enum description to display
        const t = this.paramType
        const valEnums = Array(t.TypeEnumTxt.length)
        for (let j = 0; j < t.TypeEnumTxt.length; j++) {
          const eId = t.TypeEnumTxt[j].Enum.EnumId
          valEnums[j] = {
            value: eId,
            label: Mdf.enumDescrOrCodeById(t, eId) || t.TypeEnumTxt[j].Enum.Name || eId.toString()
          }
        }
        this.pvc.processValue = Pcvt.asIntPval
        this.pvc.formatter = Pcvt.formatEnum({ enums: valEnums })
        this.pvc.cellClass = 'pv-cell-left'
        this.edt.kind = Pcvt.EDIT_ENUM
      }

      this.ctrl.formatOpts = this.pvc.formatter.options()

      // set columns layout and refresh the data
      this.setPageView()
      this.ctrl.isPvDimsTickle = !this.ctrl.isPvDimsTickle
    },

    // set page view: use previous page view from store or default
    setPageView () {
      // if previous page view not exist then set default view and store it
      const pv = this.paramView(this.routeKey)
      if (!pv) {
        this.setDefaultPageView()
        return
      }
      // else: restore previous view

      // restore rows, columns, others layout and items selection
      const restore = (pvSrc) => {
        const dst = []
        for (const p of pvSrc) {
          const f = this.dimProp.find((d) => d.name === p.name)
          if (!f) continue

          f.selection = []
          for (const v of p.values) {
            const e = f.enums.find((fe) => fe.value === v)
            if (e) {
              f.selection.push(e)
            }
          }
          f.singleSelection = (f.selection.length > 0) ? f.selection[0] : {}

          dst.push(f)
        }
        return dst
      }
      this.rowFields = restore(pv.rows)
      this.colFields = restore(pv.cols)
      this.otherFields = restore(pv.others)

      // restore edit state and controls state
      if (this.edt.isEnabled) {
        this.edt = pv.edit
        this.edt.isEnabled = true
      }

      this.ctrl.isRowColControls = !!pv.isRowColControls
      this.pvc.rowColMode = typeof pv.rowColMode === typeof 1 ? pv.rowColMode : 0
    },

    // set default page view parameters
    setDefaultPageView () {
      // set rows, columns and other:
      //   first dimension on rows
      //   last dimension on columns
      //   the rest on other fields
      const rf = []
      const cf = []
      const tf = []
      if (this.dimProp.length > 0) rf.push(this.dimProp[0])
      if (this.dimProp.length > 1) cf.push(this.dimProp[this.dimProp.length - 1])

      for (let k = 0; k < this.dimProp.length; k++) {
        const f = this.dimProp[k]
        f.selection = []

        // if other then single selection else rows and columns: multiple selection
        if (k > 0 && k < this.dimProp.length - 1) {
          tf.push(f)
          f.selection.push(f.enums[0])
        } else {
          f.selection = Array.from(f.enums)
        }
        f.singleSelection = (f.selection.length > 0) ? f.selection[0] : {}
      }

      this.rowFields = rf
      this.colFields = cf
      this.otherFields = tf

      // default row-column mode: no row-column headers for scalar parameters
      this.pvc.rowColMode = (this.paramSize.rank > 0 || this.subCount > 1) ? 2 : 0

      Pcvt.resetEdit(this.edt) // clear editor state

      // store pivot view
      this.dispatchParamView({
        key: this.routeKey,
        view: Pcvt.pivotState(this.rowFields, this.colFields, this.otherFields, this.ctrl.isRowColControls, this.pvc.rowColMode, this.edt)
      })
    },

    // find model run or input workset and check if parameter exist in model or workset
    initParamRunSet () {
      if (!this.digest) {
        console.warn('Invalid (empty) model digest')
        this.$q.notify({ type: 'negative', message: this.$t('Invalid (empty) model digest') })
        return { isFound: false, src: Mdf.emptyWorksetText() }
      }
      if (!this.runDigest && !this.worksetName) {
        console.warn('Unable to show parameter: scenario name and run digest are empty')
        this.$q.notify({ type: 'negative', message: this.$t('Unable to show parameter: scenario name and run digest are empty') })
        return { isFound: false, src: Mdf.emptyWorksetText() }
      }

      if (this.isFromRun) {
        const runSrc = this.runTextByDigest({ ModelDigest: this.digest, RunDigest: this.runDigest })
        if (!Mdf.isNotEmptyRunText(runSrc)) {
          console.warn('Model run not found:', this.digest, this.runDigest)
          this.$q.notify({ type: 'negative', message: this.$t('Model run not found' + ': ' + this.runDigest) })
          return { isFound: false, src: runSrc }
        }

        this.paramRunSet = Mdf.paramRunSetByName(runSrc, this.parameterName)
        if (!Mdf.isNotEmptyParamRunSet(this.paramRunSet)) {
          console.warn('Parameter not found in model run:', this.parameterName, this.runDigest)
          this.$q.notify({ type: 'negative', message: this.$t('Parameter not found in model run' + ': ' + this.runDigest) })
          return { isFound: false, src: runSrc }
        }
        return { isFound: true, src: runSrc }
      }
      // else: find workset and parameter in workset
      const wsSrc = this.worksetTextByName({ ModelDigest: this.digest, Name: this.worksetName })
      if (!Mdf.isNotEmptyWorksetText(wsSrc)) {
        console.warn('Input scenario not found:', this.digest, this.worksetName)
        this.$q.notify({ type: 'negative', message: this.$t('Input scenario not found' + ': ' + this.worksetName) })
        return { isFound: false, src: wsSrc }
      }

      this.paramRunSet = Mdf.paramRunSetByName(wsSrc, this.parameterName)
      if (!Mdf.isNotEmptyParamRunSet(this.paramRunSet)) {
        console.warn('Parameter not found in scenario:', this.parameterName, this.worksetName)
        this.$q.notify({ type: 'negative', message: this.$t('Parameter not found in scenario' + ': ' + this.worksetName) })
        return { isFound: false, src: wsSrc }
      }
      return { isFound: true, src: wsSrc }
    },

    // get page of parameter data from current model run or workset
    async doRefreshDataPage () {
      const r = this.initParamRunSet()
      if (!r.isFound) {
        return // exit on error
      }

      this.loadDone = false
      this.loadWait = true

      // save filters: other dimensions selected items
      this.filterState = Puih.makeFilterState(this.otherFields)

      // make parameter read layout and url
      const layout = Puih.makeSelectLayout(this.parameterName, this.otherFields, SUB_ID_DIM)
      const u = this.isFromRun
        ? this.omsUrl + '/api/model/' + this.digest + '/run/' + this.runDigest + '/parameter/value-id'
        : this.omsUrl + '/api/model/' + this.digest + '/workset/' + this.worksetName + '/parameter/value-id'

      // retrieve page from server, it must be: {Layout: {...}, Page: [...]}
      try {
        const response = await this.$axios.post(u, layout)
        const rsp = response.data
        let d = []
        if (!!rsp && rsp.hasOwnProperty('Page')) {
          if ((rsp.Page.length || 0) > 0) d = rsp.Page
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
        console.warn('Server offline or parameter data not found', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or parameter data not found') + ': ' + this.parameterName })
      }

      this.loadWait = false
    },

    // save page of parameter data into current workset
    async doSaveDataPage () {
      const r = this.initParamRunSet()
      if (!r.isFound) {
        return // exit on error
      }
      if (this.isFromRun) {
        console.warn('Attempt to save data into run parameter', this.parameterName, this.runDigest, this.worksetName)
        return // exit on error
      }

      this.saveStarted = true
      this.saveWait = true

      // prepare parameter data for save, exit with error if no changes found
      const pv = Puih.makePageForSave(
        this.dimProp, this.pvKeyPos, this.paramSize.rank, SUB_ID_DIM, this.isNullable, this.edt.updated
      )
      if (!Mdf.lengthOf(pv)) {
        console.warn('No parameter changes, nothing to save:', this.parameterName, this.worksetName)
        this.$q.notify({ type: 'warning', message: this.$t('No parameter changes, nothing to save.') })
        this.saveWait = false
        return
      }

      // url to update parameter data
      const u = this.omsUrl +
        '/api/model/' + this.digest + '/workset/' + this.worksetName + '/parameter/' + this.parameterName + '/new/value-id'

      // send data page to the server, response body expected to be empty
      try {
        const response = await this.$axios.patch(u, pv)
        const rsp = response.data
        if ((rsp || '') !== '') console.warn('Server reply on save:', rsp)

        // success: clear edit history and refersh data
        this.saveStarted = false
        Pcvt.resetEdit(this.edt)
        this.dispatchParamView({ key: this.routeKey, edit: this.edt })

        this.$nextTick(() => {
          this.doRefreshDataPage()
        })
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or parameter save failed:', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or parameter save failed') + ': ' + this.parameterName })
      }
      this.saveWait = false
    },

    ...mapActions('uiState', {
      dispatchParamView: 'paramView'
    })
  },

  mounted () {
    this.initView()
    this.doRefreshDataPage()
    if (this.isFromRun) {
      this.$emit('tab-mounted', 'run-parameter', { digest: this.digest, runDigest: this.runDigest, parameterName: this.parameterName })
    } else {
      this.$emit('tab-mounted', 'set-parameter', { digest: this.digest, worksetName: this.worksetName, parameterName: this.parameterName })
      this.$nextTick(() => {
        this.$emit('edit-updated', this.edt.isUpdated, this.routeKey)
      })
    }
  }
}
