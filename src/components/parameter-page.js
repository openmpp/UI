import axios from 'axios'
import draggable from 'vuedraggable'
import multiSelect from 'vue-multi-select'
import 'vue-multi-select/dist/lib/vue-multi-select.min.css'
import { mapGetters } from 'vuex'

import { GET } from '@/store'
import * as Mdf from '@/modelCommon'
import * as Pcvt from './pivot-cvt'
import * as Puih from './pivot-ui-helper'
import PvTable from './PvTable'
import { default as ParamInfoDialog } from './ParameterInfoDialog'

const SUB_ID_DIM = 'SubId' // sub-value id dminesion name

export default {
  components: { multiSelect, draggable, PvTable, ParamInfoDialog },

  props: {
    digest: '',
    paramName: '',
    runOrSet: '',
    nameDigest: ''
  },

  data () {
    return {
      loadDone: false,
      loadWait: false,
      saveDone: false,
      saveWait: false,
      isEdit: false,
      isEditUpdated: false,
      isNullable: false, // if true then parameter value can be NULL
      isWsView: false, // if true then page view is a workset else model run
      paramText: Mdf.emptyParamText(),
      paramSize: Mdf.emptyParamSize(),
      paramType: Mdf.emptyTypeText(),
      paramRunSet: Mdf.emptyParamRunSet(),
      subCount: 0,
      dimProp: [],
      colFields: [],
      rowFields: [],
      otherFields: [],
      inpData: [],
      pvt: {
        isShowControls: true,
        isRowColNames: true,
        isPvTickle: false,
        isPvDimsTickle: false,
        filterState: {},
        readValue: (r) => (!r.IsNull ? r.Value : (void 0)),
        processValue: Pcvt.asIsPval
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
      this.initView()
      this.doRefreshDataPage()
    },
    saveDone () {
      let isDone = this.saveDone
      if (isDone) {
        this.isEditUpdated = false
        this.editCount = 0
        this.editRowCol = []
      }
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
      this.pvt.isRowColNames = !this.pvt.isRowColNames
    },
    togglePivotControls () {
      this.pvt.isShowControls = !this.pvt.isShowControls
    },
    // reset table view to default
    doResetView () {
      this.setDefaultPageView()
      this.doRefreshDataPage()
    },
    // save if data editied
    doSave () {
      // this.doSaveDataPage()
    },

    onStart () {
      // drag started
      this.multiSel.dragging = true
    },
    onEnd () {
      // drag completed: drop
      this.multiSel.dragging = false

      // other dimensions: use single-select dropdown
      // change dropdown label: for other dimensions use selected value
      let isSelUpdate = false
      for (let f of this.otherFields) {
        if (f.selection.length > 1) {
          f.selection.splice(1)
          isSelUpdate = true
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
        }
      }

      // update pivot view:
      //   if selection changed then pivot table view updated by multi-select input event
      //   else
      //     if other dimesions filters same as before then update pivot table view now
      //     else refresh data
      if (!isSelUpdate) {
        if (Puih.equalFilterState(this.pvt.filterState, this.otherFields)) {
          this.pvt.isPvTickle = !this.pvt.isPvTickle
        } else {
          this.doRefreshDataPage()
        }
      }
    },

    // multi-select input: drag-and-drop or selection changed
    onSelInput (panel, name, vals) {
      if (this.multiSel.dragging) return // exit: this is drag-and-drop, no changes in selection yet

      // update pivot view:
      //   if other dimesions filters same as before then update pivot table view now
      //   else refresh data
      if (panel !== 'other' || Puih.equalFilterState(this.pvt.filterState, this.otherFields)) {
        this.pvt.isPvTickle = !this.pvt.isPvTickle
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
      // this.isEdit = this.isWsView && !this.theWorksetText.IsReadonly
      this.isEdit = false

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

      // process value:
      //  if parameter type is one of built-in then process value as float, int, boolen or string
      //  else parameter type is enum-based: process value as int enum id
      this.pvt.processValue = Pcvt.asIsPval

      if (Mdf.isBuiltIn(this.paramType.Type)) {
        if (Mdf.isFloat(this.paramType.Type)) this.pvt.processValue = Pcvt.asFloatPval
        if (Mdf.isInt(this.paramType.Type)) this.pvt.processValue = Pcvt.asIntPval
        if (Mdf.isBool(this.paramType.Type)) this.pvt.processValue = Pcvt.asBoolPval
        // built-in string type: return value as is
      } else {
        this.pvt.processValue = Pcvt.asIntPval
      }

      // set columns layout and refresh the data
      this.setDefaultPageView()
      this.pvt.isPvDimsTickle = !this.pvt.isPvDimsTickle
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
        if (!isOther) {
          for (const e of f.enums) {
            f.selection.push(e)
          }
        } else {
          tf.push(f)
          f.selection.push(f.enums[0])
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
      this.pvt.filterState = Puih.makeFilterState(this.otherFields, SUB_ID_DIM)

      // make parameter read layout and url
      let layout = this.makeSelectLayout()
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
        this.pvt.isPvTickle = !this.pvt.isPvTickle
      } catch (e) {
        this.msg = 'Server offline or parameter data not found'
        console.log('Server offline or parameter data not found')
      }
      this.loadWait = false
    },

    // return page layout to read parameter data
    // filter by other dimension(s) selected values
    makeSelectLayout () {
      let layout = {
        Name: this.paramName,
        Offset: 0,
        Size: 0,
        FilterById: []
      }

      // make filters for other dimensions to include selected value
      for (const f of this.otherFields) {
        if (f.name === SUB_ID_DIM) continue // do not filter by "sub-value id" dimension

        let flt = {
          DimName: f.name,
          Op: 'IN_AUTO',
          EnumIds: []
        }
        for (const e of f.selection) {
          flt.EnumIds.push(e.value)
        }
        layout.FilterById.push(flt)
      }
      return layout
    }
  },

  mounted () {
    this.saveDone = true
    this.initView()
    this.doRefreshDataPage()
    this.$emit('tab-mounted', 'parameter', this.paramName)
  }
}
