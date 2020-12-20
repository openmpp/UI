import axios from 'axios'
import draggable from 'vuedraggable'
import multiSelect from 'vue-multi-select'
// import 'vue-multi-select/dist/lib/vue-multi-select.css'
import 'vue-multi-select/dist/lib/vue-multi-select.min.css' // 3.15.0

import { mapGetters, mapActions } from 'vuex'
import { GET, DISPATCH } from '@/store'
import * as Mdf from '@/modelCommon'
import OmMcwDialog from '@/om-mcw/OmMcwDialog'
import OmMcwSnackbar from '@/om-mcw/OmMcwSnackbar'
import * as Pcvt from './pivot-cvt'
import * as Puih from './pivot-ui-helper'
import PvTable from './PvTable'
import ParamInfoDialog from './ParameterInfoDialog'

const SUB_ID_DIM = 'SubId' // sub-value id dminesion name

export default {
  components: { multiSelect, draggable, PvTable, ParamInfoDialog, OmMcwDialog, OmMcwSnackbar },

  /* eslint-disable no-multi-spaces */
  props: {
    digest: '',      // model digest or name
    paramName: '',   // parameter name
    runOrSet: '',    // if "run" then model run if "set" then workset
    nameOrDigest: '' // workset name or model run digest or name
  },

  data () {
    return {
      loadDone: false,
      loadWait: false,
      saveStarted: false,
      saveWait: false,
      isNullable: false,  // if true then parameter value can be NULL
      isFromWs: false,    // if true then page view is a workset else model run
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
      pvRef: 'pv-' + this.digest + '-' + this.paramName + '-' + this.runOrSet + '-' + this.nameOrDigest,
      inpData: Object.freeze([]),
      ctrl: {
        isRowColControls: true,
        isRowColModeToggle: true,
        isPvTickle: false,
        isPvDimsTickle: false,
        formatOpts: void 0  // hide format controls by default
      },
      pvc: {
        rowColMode: 2, // row and columns mode: 2 = use spans and show dim names, 1 = use spans and hide dim names, 0 = no spans and hide dim names
        readValue: (r) => (!r.IsNull ? r.Value : (void 0)),
        processValue: Pcvt.asIsPval,    // default value processing: return as is
        formatter: Pcvt.formatDefault,  // disable format(), parse() and validation by default
        cellClass: 'pv-cell-right'      // default cell value style: right justified number
      },
      pvKeyPos: [],          // position of each dimension item in cell key
      edt: Pcvt.emptyEdit(), // editor options and state shared with child
      multiSel: {
        dragging: false,
        rcOpts: {
          multi: true,
          labelName: 'text',
          labelValue: 'value',
          cssSelected: item => (item.selected ? 'background-color: whitesmoke;' : '')
        },
        otherOpts: {
          multi: false,
          labelName: 'text',
          labelValue: 'value',
          cssSelected: item => (item.selected ? 'background-color: whitesmoke;' : '')
        },
        filters: [{
          nameAll: 'Select all',
          nameNotAll: 'Deselect all',
          func: () => true
        }]
      },
      msg: ''
    }
  },
  /* eslint-enable no-multi-spaces */

  watch: {
    routeKey () {
      this.initView()
      this.doRefreshDataPage()
      this.$emit('tab-new-route', 'parameter', { digest: this.digest, runOrSet: this.runOrSet, runSetKey: this.nameOrDigest, itemKey: this.paramName })
      this.$emit('edit-updated', this.edt.isUpdated, this.routeKey)
    },
    isEditUpdated () {
      this.$emit('edit-updated', this.edt.isUpdated, this.routeKey)
    }
  },
  computed: {
    routeKey () {
      return Mdf.paramRouteKey(this.digest, this.paramName, this.runOrSet, this.nameOrDigest)
    },
    isEditUpdated () {
      return this.edt.isUpdated
    },
    ...mapGetters({
      theModel: GET.THE_MODEL,
      runTextByDigest: GET.RUN_TEXT_BY_DIGEST,
      worksetTextByName: GET.WORKSET_TEXT_BY_NAME,
      paramView: GET.PARAM_VIEW,
      omppServerUrl: GET.OMPP_SRV_URL
    })
  },

  methods: {
    paramDescr () { return Mdf.descrOfDescrNote(this.paramText) },

    // show parameter info dialog
    showParamInfo () {
      this.$refs.paramNoteDlg.showParamInfo(this.paramText, this.paramRunSet)
    },
    // show or hide extra controls
    toggleRowColMode () {
      this.pvc.rowColMode = (3 + (this.pvc.rowColMode - 1)) % 3
      this.dispatchParamView({ key: this.routeKey, rowColMode: this.pvc.rowColMode })
    },
    toggleRowColControls () {
      this.ctrl.isRowColControls = !this.ctrl.isRowColControls
      this.dispatchParamView({ key: this.routeKey, isRowColControls: this.ctrl.isRowColControls })
    },
    // show more decimals (or more details) in table body
    showMoreFormat () {
      if (!this.pvc.formatter) return
      this.pvc.formatter.doMore()
    },
    // show less decimals (or less details) in table body
    showLessFormat () {
      if (!this.pvc.formatter) return
      this.pvc.formatter.doLess()
    },
    // reload parameter data and reset pivot view to default
    doReload () {
      if (this.pvc.formatter) {
        this.pvc.formatter.resetOptions()
      }
      this.setDefaultPageView()
      this.doRefreshDataPage()
    },
    // update workset read-only status: handler for model page event
    refreshWsEditStatus (key) {
      if (!!key && key === this.nameOrDigest) {
        const wsSrc = this.isFromWs ? this.worksetTextByName(this.nameOrDigest) : Mdf.emptyWorksetText()
        this.edt.isEnabled = this.isFromWs && Mdf.isNotEmptyWorksetText(wsSrc) && !wsSrc.IsReadonly
      }
    },
    // pivot table view updated: changes item keys layout
    onPvKeyPos (kp) {
      this.pvKeyPos = kp
    },

    // copy tab separated values to clipboard
    copyToClipboard () {
      this.$refs[this.pvRef].onCopyTsv()
    },

    // start of editor methods
    //
    // start or stop parameter editing
    doEditToogle () {
      if (this.edt.isEdit && this.edt.isUpdated) { // redirect to dialog to confirm "discard changes?"
        this.$refs.paramEditDiscardDlg.open()
        return
      }
      // else: start editing or stop editing (no changes in data)
      let isEditNow = this.edt.isEdit
      Pcvt.resetEdit(this.edt)
      this.edt.isEdit = !isEditNow
      this.dispatchParamView({ key: this.routeKey, edit: this.edt })
    },
    onEditDiscardClosed (e) {
      if ((e.action || '') === 'accept') {
        Pcvt.resetEdit(this.edt) // question: "discard changes?", user answer: "yes"
        this.dispatchParamView({ key: this.routeKey, edit: this.edt })
      }
    },

    // save if data editied
    doEditSave () {
      this.doSaveDataPage()
    },
    // undo last edit changes
    onUndo () {
      this.$refs[this.pvRef].doUndo()
    },
    onRedo () {
      this.$refs[this.pvRef].doRedo()
    },

    // on edit events: input confirm (data entered), undo, redo, paste
    onPvEdit () {
      this.dispatchParamView({ key: this.routeKey, edit: this.edt })
    },

    // show message, ex: "invalid value entered"
    onPvMessage (msg) {
      this.$refs.paramSnackbarMsg.doOpen({ labelText: msg })
    },
    //
    // end of editor methods

    onDrag () {
      // drag started
      this.multiSel.dragging = true
    },
    onDrop () {
      // drag completed: drop
      this.multiSel.dragging = false

      // make sure at least one item selected in each dimension
      // other dimensions: use single-select dropdown
      let isSelUpdate = false
      let isSubIdSelUpdate = false
      for (let f of this.dimProp) {
        if (f.selection.length < 1) {
          f.selection.push(f.enums[0])
          isSelUpdate = true
          if (f.name === SUB_ID_DIM) isSubIdSelUpdate = true
        }
      }
      for (let f of this.otherFields) {
        if (f.selection.length > 1) {
          f.selection.splice(1)
          isSelUpdate = true
          if (f.name === SUB_ID_DIM) isSubIdSelUpdate = true
        }
      }
      for (let f of this.dimProp) {
        f.selLabel = Puih.makeSelLabel(f.label, f.selection)
      }

      // update pivot view:
      //   if selection changed then pivot table view updated by multi-select input event
      //   else
      //     if other dimesions filters same as before then update pivot table view now
      //     else refresh data
      if (!isSelUpdate) {
        if (Puih.equalFilterState(this.filterState, this.otherFields, SUB_ID_DIM)) {
          this.ctrl.isPvTickle = !this.ctrl.isPvTickle
          if (isSubIdSelUpdate) {
            this.filterState = Puih.makeFilterState(this.otherFields)
          }
        } else {
          this.doRefreshDataPage()
        }
      }
      // update pivot view rows, columns, other dimensions
      this.dispatchParamView({
        key: this.routeKey,
        rows: Pcvt.pivotStateFields(this.rowFields),
        cols: Pcvt.pivotStateFields(this.colFields),
        others: Pcvt.pivotStateFields(this.otherFields)
      })
    },

    // multi-select input: drag-and-drop or selection changed
    onSelectInput (panel, name, vals) {
      if (this.multiSel.dragging) return // exit: this is drag-and-drop, no changes in selection yet

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

    // initialize current page view on mounted or tab switch
    initView () {
      // find parameter, parameter type and size, including run sub-values count
      this.paramText = Mdf.paramTextByName(this.theModel, this.paramName)
      this.paramSize = Mdf.paramSizeByName(this.theModel, this.paramName)
      this.paramType = Mdf.typeTextById(this.theModel, (this.paramText.Param.TypeId || 0))

      this.isFromWs = ((this.runOrSet || '') === 'set')
      const wsSrc = this.isFromWs ? this.worksetTextByName(this.nameOrDigest) : Mdf.emptyWorksetText()
      this.paramRunSet = Mdf.paramRunSetByName(
        this.isFromWs ? wsSrc : this.runTextByDigest(this.nameOrDigest),
        this.paramName)
      this.subCount = this.paramRunSet.SubCount || 0
      this.isNullable = this.paramText.Param.hasOwnProperty('IsExtendable') && (this.paramText.Param.IsExtendable || false)

      // adjust controls
      this.edt.isEnabled = this.isFromWs && Mdf.isNotEmptyWorksetText(wsSrc) && !wsSrc.IsReadonly
      Pcvt.resetEdit(this.edt) // clear editor state

      let isRc = this.paramSize.rank > 0 || this.subCount > 1
      this.pvc.rowColMode = isRc ? 2 : 0
      this.ctrl.isRowColModeToggle = isRc
      this.ctrl.isRowColControls = isRc
      this.pvKeyPos = []

      // make dimensions:
      //  [rank] of enum-based dimensions
      //  sub-value id dimension, if parameter has sub-values
      this.dimProp = []

      for (let n = 0; n < this.paramText.ParamDimsTxt.length; n++) {
        const dt = this.paramText.ParamDimsTxt[n]
        let t = Mdf.typeTextById(this.theModel, (dt.Dim.TypeId || 0))
        let f = {
          name: dt.Dim.Name || '',
          label: Mdf.descrOfDescrNote(dt) || dt.Dim.Name || '',
          read: (r) => (r.DimIds.length > n ? r.DimIds[n] : void 0),
          enums: Array(t.TypeEnumTxt.length),
          selection: [],
          selLabel: () => ('Select...')
        }

        for (let j = 0; j < t.TypeEnumTxt.length; j++) {
          let eId = t.TypeEnumTxt[j].Enum.EnumId
          f.enums[j] = {
            value: eId,
            text: Mdf.enumDescrOrCodeById(t, eId) || t.TypeEnumTxt[j].Enum.Name || eId.toString()
          }
        }

        this.dimProp.push(f)
      }

      // if parameter has sub-values then add sub-value id dimension
      if (this.subCount > 1) {
        let f = {
          name: SUB_ID_DIM,
          label: 'Sub #',
          read: (r) => (r.SubId),
          enums: Array(this.subCount),
          selection: [],
          selLabel: () => ('Select...')
        }
        for (let k = 0; k < this.subCount; k++) {
          f.enums[k] = { value: k, text: k.toString() }
        }
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
        let valEnums = Array(t.TypeEnumTxt.length)
        for (let j = 0; j < t.TypeEnumTxt.length; j++) {
          let eId = t.TypeEnumTxt[j].Enum.EnumId
          valEnums[j] = {
            value: eId,
            text: Mdf.enumDescrOrCodeById(t, eId) || t.TypeEnumTxt[j].Enum.Name || eId.toString()
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
        let dst = []
        for (const p of pvSrc) {
          let f = this.dimProp.find((d) => d.name === p.name)
          if (!f) continue

          f.selection = []
          for (const v of p.values) {
            let e = f.enums.find((fe) => fe.value === v)
            if (e) f.selection.push(e)
          }

          f.selLabel = Puih.makeSelLabel(f.label, f.selection)
          dst.push(f)
        }
        return dst
      }
      this.rowFields = restore(pv.rows)
      this.colFields = restore(pv.cols)
      this.otherFields = restore(pv.others)

      // restore edit state and controls state
      let isEnabled = this.edt.isEnabled
      if (isEnabled) {
        this.edt = pv.edit
        this.edt.isEnabled = isEnabled
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
      let rf = []
      let cf = []
      let tf = []
      if (this.dimProp.length > 0) rf.push(this.dimProp[0])
      if (this.dimProp.length > 1) cf.push(this.dimProp[this.dimProp.length - 1])

      for (let k = 0; k < this.dimProp.length; k++) {
        let f = this.dimProp[k]
        f.selection = []

        // if other then single selection else rows and columns: multiple selection
        if (k > 0 && k < this.dimProp.length - 1) {
          tf.push(f)
          f.selection.push(f.enums[0])
        } else {
          for (const e of f.enums) {
            f.selection.push(e)
          }
        }

        f.selLabel = Puih.makeSelLabel(f.label, f.selection)
      }

      this.rowFields = rf
      this.colFields = cf
      this.otherFields = tf

      Pcvt.resetEdit(this.edt) // clear editor state

      // store pivot view
      this.dispatchParamView({
        key: this.routeKey,
        view: Pcvt.pivotState(this.rowFields, this.colFields, this.otherFields, this.ctrl.isRowColControls, this.pvc.rowColMode, this.edt)
      })
    },

    // get page of parameter data from current model run or workset
    async doRefreshDataPage () {
      this.loadDone = false
      this.loadWait = true
      this.msg = 'Loading...'

      // exit if parameter not found in model run or workset
      if (!Mdf.isParamRunSet(this.paramRunSet)) {
        let m = 'Parameter not found in ' + this.nameOrDigest
        this.msg = m
        console.log(m)
        this.loadWait = false
        return
      }

      // save filters: other dimensions selected items
      this.filterState = Puih.makeFilterState(this.otherFields)

      // make parameter read layout and url
      let layout = Puih.makeSelectLayout(this.paramName, this.otherFields, SUB_ID_DIM)
      let u = this.omppServerUrl +
        '/api/model/' + (this.digest || '') +
        (this.isFromWs ? '/workset/' : '/run/') + (this.nameOrDigest || '') +
        '/parameter/value-id'

      // retrieve page from server, it must be: {Layout: {...}, Page: [...]}
      try {
        const response = await axios.post(u, layout)
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
        this.msg = 'Server offline or parameter data not found.'
        console.log('Server offline or parameter data not found.', em)
      }
      this.loadWait = false
    },

    // save page of parameter data into current workset
    async doSaveDataPage () {
      this.saveStarted = true
      this.saveWait = true
      this.msg = 'Saving...'

      // exit if parameter not found in model run or workset
      if (!Mdf.isParamRunSet(this.paramRunSet)) {
        let m = 'Parameter not found in ' + this.nameOrDigest
        this.msg = m
        console.log(m)
        this.saveWait = false
        return
      }

      // prepare parameter data for save, exit with error if no changes found
      let pv = Puih.makePageForSave(
        this.dimProp, this.pvKeyPos, this.paramSize.rank, SUB_ID_DIM, this.isNullable, this.edt.updated
      )
      if (!Mdf.lengthOf(pv)) {
        this.msg = 'No parameter changes, nothing to save.'
        console.log('No parameter changes, nothing to save.')
        this.saveWait = false
        return
      }

      // url to update parameter data
      let u = this.omppServerUrl +
        '/api/model/' + (this.digest || '') +
        '/workset/' + (this.nameOrDigest || '') +
        '/parameter/' + (this.paramName || '') + '/new/value-id'

      // send data page to the server, response body expected to be empty
      try {
        const response = await axios.patch(u, pv)
        const rsp = response.data
        if ((rsp || '') !== '') console.log('Server reply:', rsp)

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
        this.msg = 'Server offline or parameter save failed.'
        console.log('Server offline or parameter save failed.', em)
      }
      this.saveWait = false
    },

    ...mapActions({
      dispatchParamView: DISPATCH.PARAM_VIEW
    })
  },

  mounted () {
    this.initView()
    this.doRefreshDataPage()
    this.$emit('tab-mounted', 'parameter', { digest: this.digest, runOrSet: this.runOrSet, runSetKey: this.nameOrDigest, itemKey: this.paramName })
    this.$nextTick(() => {
      this.$emit('edit-updated', this.edt.isUpdated, this.routeKey)
    })
  }
}
