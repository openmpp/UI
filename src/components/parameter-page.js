import axios from 'axios'
import draggable from 'vuedraggable'
import multiSelect from 'vue-multi-select'
// import 'vue-multi-select/dist/lib/vue-multi-select.css'
import 'vue-multi-select/dist/lib/vue-multi-select.min.css' // 3.15.0
import { mapGetters } from 'vuex'
import OmMcwDialog from '@/om-mcw/OmMcwDialog'
import OmMcwSnackbar from '@/om-mcw/OmMcwSnackbar'

import { GET } from '@/store'
import * as Mdf from '@/modelCommon'
import * as Pcvt from './pivot-cvt'
import * as Puih from './pivot-ui-helper'
import PvTable from './PvTable'
import { default as ParamInfoDialog } from './ParameterInfoDialog'

const SUB_ID_DIM = 'SubId' // sub-value id dminesion name

export default {
  components: { multiSelect, draggable, PvTable, ParamInfoDialog, OmMcwDialog, OmMcwSnackbar },

  props: {
    digest: '',
    paramName: '',
    runOrSet: '',
    nameDigest: ''
  },

  /* eslint-disable no-multi-spaces */
  data () {
    return {
      loadDone: false,
      loadWait: false,
      saveDone: false,
      saveWait: false,
      isNullable: false,  // if true then parameter value can be NULL
      isWsView: false,    // if true then page view is a workset else model run
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
      inpData: [],
      ctrl: {
        isShowPvControls: true,
        isRowColNamesToggle: true,
        isPvTickle: false,
        isPvDimsTickle: false,
        isPvValsTickle: false,
        formatter: void 0,  // disable format() value by default
        formatOpts: void 0  // hide format controls by default
      },
      pvc: {
        isRowColNames: true,
        readValue: (r) => (!r.IsNull ? r.Value : (void 0)),
        processValue: Pcvt.asIsPval,  // default value processing: return as is
        formatValue: void 0,          // disable format() value by default
        cellClass: 'pv-val-num'       // default cell value style: right justified number
      },
      pvKeyPos: [],   // position of each dimension item in cell key
      pvSize: {
        rowCount: 0,  // table row count, expected at least 1 if data not empty
        colCount: 0,  // table coumns count, expected at least 1 if data not empty
        valueLen: 0,  // max length of table body value as string
      },
      edt: {
        isEnabled: false,
        isEdit: false,
        isUpdated: false,
        cell: {
          key: '',
          value: '',
          src: ''
        },
        updated: {},
        history: [],
        lastHistory: 0
      },
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

  computed: {
    routeKey () {
      return [this.digest, this.paramName, this.runOrSet, this.nameDigest].toString()
    },
    ...mapGetters({
      theModel: GET.THE_MODEL,
      theRunText: GET.THE_RUN_TEXT,
      theWorksetText: GET.THE_WORKSET_TEXT,
      omppServerUrl: GET.OMPP_SRV_URL
    })
  },

  watch: {
    routeKey () {
      this.resetEdit()
      this.initView()
      this.doRefreshDataPage()
    }
  },

  methods: {
    paramDescr () { return Mdf.descrOfDescrNote(this.paramText) },

    // show parameter info dialog
    showParamInfo () {
      this.$refs.noteDlg.showParamInfo(this.paramName, this.subCount)
    },
    // show or hide extra controls
    toggleRowColNames () {
      this.pvc.isRowColNames = !this.pvc.isRowColNames
    },
    togglePivotControls () {
      this.ctrl.isShowPvControls = !this.ctrl.isShowPvControls
    },
    // show more decimals or more details in table body
    showMoreFormat () {
      if (!this.ctrl.formatter) return
      this.ctrl.formatter.doMore()
      this.pvc.formatValue = !this.ctrl.formatOpts.isSrcValue ? this.ctrl.formatter.format : void 0
      this.ctrl.isPvValsTickle = !this.ctrl.isPvValsTickle
    },
    // show less decimals or less details in table body
    showLessFormat () {
      if (!this.ctrl.formatter) return
      this.ctrl.formatter.doLess()
      this.pvc.formatValue = !this.ctrl.formatOpts.isSrcValue ? this.ctrl.formatter.format : void 0
      this.ctrl.isPvValsTickle = !this.ctrl.isPvValsTickle
    },
    // reset table view to default
    doResetView () {
      if (this.ctrl.formatter) {
        this.ctrl.formatter.resetOptions()
        this.pvc.formatValue = !this.ctrl.formatOpts.isSrcValue ? this.ctrl.formatter.format : void 0
      }
      this.setDefaultPageView()
      this.doRefreshDataPage()
    },
    // pivot table view updated
    onPvKeyPos (kp) {
      this.pvKeyPos = kp
    },
    onPvSize (size) {
      this.pvSize = size
    },
    // start or stop parameter editing
    doEditToogle () {
      if (this.edt.isEdit && this.edt.isUpdated) {
        this.$refs.paramEditDiscardDlg.open() // ask user to confirm changes discard
        return
      }
      let isEdit = !this.edt.isEdit
      this.resetEdit()
      this.edt.isEdit = isEdit
    },
    onEditDiscardClosed (e) {
      if ((e.action || '') === 'accept') this.resetEdit() // question: "discard changes?", user answer: "yes"
    },
    // save if data editied
    doEditSave () {
      this.doSaveDataPage()
    },

    // start cell edit: enter into input text
    onCellKeyEnter (c) {
      this.cellInputStart(c)
    },
    onCellDblClick (c) {
      this.cellInputStart(c)
    },
    cellInputStart (c) {
      this.edt.cell.key = c.cell.key
      this.edt.cell.value = c.cell.value
      this.edt.cell.src = c.cell.src

      this.$nextTick(() => { this.$refs.cellInput.focus() })
    },

    // cancel input text edit by escape
    onCellInputEscape () {
      let ckey = this.edt.cell.key
      this.edt.cell.key = ''

      this.$nextTick(() => { if (this.$refs[ckey]) this.$refs[ckey].focus() })
    },

    // confirm input text edit: finish cell edit and keep focus at the same cell
    onCellInputConfirm (evt, c) {
      if (evt.target) {
        this.cellInputConfirm((evt.target.value || ''), c) // event target must be input text
      }
      let ckey = this.edt.cell.key
      this.edt.cell.key = ''
      this.$nextTick(() => { if (this.$refs[ckey]) this.$refs[ckey].focus() })
    },
    // confirm input text edit by lost focus
    onCellInputBlur (evt, c) {
      if (evt.target) {
        this.cellInputConfirm((evt.target.value || ''), c) // event target must be input text
      }
      this.edt.cell.key = ''
    },
    cellInputConfirm (val, c) {
      // validate input
      if (this.ctrl.formatter && !this.ctrl.formatter.isValid(val)) {
        this.$refs.paramSnackbarMsg.doOpen({labelText: 'Ivalid (or empty) value entered'})
        return
      }  

      // compare input value with previous
      const now = !!this.ctrl.formatter && !!this.ctrl.formatter.parse ? this.ctrl.formatter.parse(val) : val
      const prev = this.edt.updated.hasOwnProperty(c.cell.key) ? this.edt.updated[c.cell.key] : c.cell.src

      if (now === prev || (now === '' && prev === void 0)) return // exit if value not changed

      // store updated value and append it change history
      this.edt.updated[c.cell.key] = now
      this.edt.isUpdated = true

      if (this.edt.lastHistory < this.edt.history.length) {
        this.edt.history.splice(this.edt.lastHistory)
      }
      this.edt.history.push({
        key: c.cell.key,
        now: now,
        prev: prev
      })
      this.edt.lastHistory = this.edt.history.length
    },

    // undo last edit changes
    doUndo () {
      if (this.edt.lastHistory <= 0) return // exit: entire history already undone

      let n = --this.edt.lastHistory
      let key = this.edt.history[n].key

      let isPrev = false
      for (let k = 0; !isPrev && k < n; k++) {
        isPrev = this.edt.history[k].key === key
      }
      if (isPrev) {
        this.edt.updated[key] = this.edt.history[n].prev
      } else {
        delete this.edt.updated[key]
        this.edt.isUpdated = !!this.edt.updated && this.edt.lastHistory > 0
      }
    },
    // redo most recent undo
    doRedo () {
      if (this.edt.lastHistory >= this.edt.history.length) return // exit: already at the end of history

      let n = this.edt.lastHistory++
      this.edt.updated[this.edt.history[n].key] = this.edt.history[n].now
      this.edt.isUpdated = true
    },

    // clean edit state and history
    resetEdit () {
      this.edt.isEdit = false
      this.edt.isUpdated = false
      this.edt.cell.key = ''
      this.edt.cell.value = ''
      this.edt.cell.src = ''
      this.edt.updated = {}
      this.edt.history = []
      this.edt.lastHistory = 0
    },

    // return updated cell value or default if value not updated
    getUpdatedSrc(key, defaultSrc) {
      return this.edt.isUpdated && this.edt.updated.hasOwnProperty(key) ? this.edt.updated[key] : defaultSrc
    },
    getUpdatedValue(key, defaultVal) {
      if (!this.edt.isUpdated || !this.edt.updated.hasOwnProperty(key)) return defaultVal
      return !!this.pvc.formatValue ? this.pvc.formatValue(this.edt.updated[key]) : this.edt.updated[key]
    },

    onDrag () {
      // drag started
      this.multiSel.dragging = true
    },
    onDrop () {
      // drag completed: drop
      this.multiSel.dragging = false

      // other dimensions: use single-select dropdown
      // change dropdown label: for other dimensions use selected value
      let isSelUpdate = false
      let isSubIdSelUpdate = false
      for (let f of this.otherFields) {
        if (f.selection.length > 1) {
          f.selection.splice(1)
          isSelUpdate = true
          if (f.name === SUB_ID_DIM) isSubIdSelUpdate = true
        }
        f.selLabel = Puih.makeSelLabel(false, f.label, f.selection)
      }
      for (let f of this.colFields) {
        f.selLabel = Puih.makeSelLabel(true, f.label, f.selection)
      }
      for (let f of this.rowFields) {
        f.selLabel = Puih.makeSelLabel(true, f.label, f.selection)
      }
      // make sure at least one item selected in each dimension
      for (let f of this.dimProp) {
        if (f.selection.length < 1) {
          f.selection.push(f.enums[0])
          isSelUpdate = true
          if (f.name === SUB_ID_DIM) isSubIdSelUpdate = true
        }
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
    },

    // initialize current page view on mounted or tab switch
    initView () {
      // find parameter, parameter type and size, including run sub-values count
      this.isWsView = ((this.runOrSet || '') === Mdf.SET_OF_RUNSET)
      this.paramText = Mdf.paramTextByName(this.theModel, this.paramName)
      this.paramSize = Mdf.paramSizeByName(this.theModel, this.paramName)
      this.paramType = Mdf.typeTextById(this.theModel, (this.paramText.Param.TypeId || 0))
      this.paramRunSet = Mdf.paramRunSetByName(
        this.isWsView ? this.theWorksetText : this.theRunText,
        this.paramName)
      this.subCount = this.paramRunSet.SubCount || 0
      this.isNullable = this.paramText.Param.hasOwnProperty('IsExtendable') && (this.paramText.Param.IsExtendable || false)

      // adjust controls
      this.edt.isEnabled = this.isWsView && !this.theWorksetText.IsReadonly

      let isRc = this.paramSize.rank > 0 || this.subCount > 1
      this.pvc.isRowColNames = isRc
      this.ctrl.isRowColNamesToggle = isRc
      this.ctrl.isShowPvControls = isRc
      this.pvSize = { rowCount: 0, colCount: 0, valueLen: 0 }
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
      this.pvc.formatValue = void 0 // disable format() value by default
      this.pvc.cellClass = 'pv-val-num' // numeric cell value style by default
      this.ctrl.formatter = Pcvt.formatDefault({isNullable: this.isNullable})
      this.ctrl.formatOpts = void 0

      if (Mdf.isBuiltIn(this.paramType.Type)) {
        if (Mdf.isFloat(this.paramType.Type)) {
          this.pvc.processValue = Pcvt.asFloatPval
          this.ctrl.formatter = Pcvt.formatFloat({isNullable: this.isNullable, nDecimal: -1, groupSep: ','}) // decimal: -1 is to show source float value
        }
        if (Mdf.isInt(this.paramType.Type)) {
          this.pvc.processValue = Pcvt.asIntPval
          this.ctrl.formatter = Pcvt.formatInt({isNullable: this.isNullable, groupSep: ','})
        }
        if (Mdf.isBool(this.paramType.Type)) {
          this.pvc.processValue = Pcvt.asBoolPval
          this.pvc.cellClass = 'pv-val-center'
          this.ctrl.formatter = Pcvt.formatBool()
        }
        if (Mdf.isString(this.paramType.Type)) {
          this.pvc.cellClass = 'pv-val-text' // no process or format value required for string type
        }
      } else {
        // if parameter is enum-based then value is integer enum id and format(value) should return enum description to display
        const t = this.paramType
        let enumLabels = {}
        for (let j = 0; j < t.TypeEnumTxt.length; j++) {
          let eId = t.TypeEnumTxt[j].Enum.EnumId
          enumLabels[eId] = Mdf.enumDescrOrCodeById(t, eId) || t.TypeEnumTxt[j].Enum.Name || eId.toString()
        }
        this.pvc.processValue = Pcvt.asIntPval
        this.ctrl.formatter = Pcvt.formatEnum({labels: enumLabels})
        this.pvc.cellClass = 'pv-val-text'
      }

      this.ctrl.formatOpts = this.ctrl.formatter.options()
      this.pvc.formatValue = !this.ctrl.formatOpts.isSrcValue ? this.ctrl.formatter.format : void 0

      // set columns layout and refresh the data
      this.setDefaultPageView()
      this.ctrl.isPvDimsTickle = !this.ctrl.isPvDimsTickle
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

        // rows and columns: multiple selection, other: single selection
        let isOther = k > 0 && k < this.dimProp.length - 1
        if (isOther) {
          tf.push(f)
          f.selection.push(f.enums[0])
        } else {
          for (const e of f.enums) {
            f.selection.push(e)
          }
        }

        f.selLabel = Puih.makeSelLabel(!isOther, f.label, f.selection)
      }

      this.rowFields = rf
      this.colFields = cf
      this.otherFields = tf
    },

    // get page of parameter data from current model run or workset
    async doRefreshDataPage () {
      this.loadDone = false
      this.loadWait = true
      this.msg = 'Loading...'

      // exit if parameter not found in model run or workset
      if (!Mdf.isParamRunSet(this.paramRunSet)) {
        let m = 'Parameter not found in ' + this.nameDigest
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
        (this.isWsView ? '/workset/' : '/run/') + (this.nameDigest || '') +
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
      this.saveDone = false
      this.saveWait = true
      this.msg = 'Saving...'

      // exit if parameter not found in model run or workset
      if (!Mdf.isParamRunSet(this.paramRunSet)) {
        let m = 'Parameter not found in ' + this.nameDigest
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
        '/workset/' + (this.nameDigest || '') +
        '/parameter/' + (this.paramName || '') + '/new/value-id'

      // send data page to the server, response body expected to be empty
      try {
        const response = await axios.patch(u, pv)
        const rsp = response.data
        if ((rsp || '') !== '') console.log('Server reply:', rsp)

        // success: clear edit history and refersh data
        this.saveDone = true
        this.resetEdit()

        this.$nextTick(() => { this.doRefreshDataPage() })
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        this.msg = 'Server offline or parameter save failed.'
        console.log('Server offline or parameter save failed.', em)
      }
      this.saveWait = false
    }
  },

  mounted () {
    this.saveDone = true
    this.resetEdit()
    this.initView()
    this.doRefreshDataPage()
    this.$emit('tab-mounted', 'parameter', this.paramName)
  }
}
