import { mapState, mapGetters, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'
import * as Idb from 'src/idb/idb'
import RunBar from 'components/RunBar.vue'
import RefreshRun from 'components/RefreshRun.vue'
import RunInfoDialog from 'components/RunInfoDialog.vue'
import EntityInfoDialog from 'components/EntityInfoDialog.vue'
import draggable from 'vuedraggable'
import * as Pcvt from 'components/pivot-cvt'
import * as Puih from './pivot-ui-helper'
import PvTable from 'components/PvTable'
import { openURL } from 'quasar'

/* eslint-disable no-multi-spaces */
const ATTR_DIM_NAME = 'ATTRIBUTES_DIM'          // attributes measure dimension name
const KEY_DIM_NAME = 'ENTITY_KEY_DIM'           // entity key dimension name
const SMALL_PAGE_SIZE = 10                      // small page size: do not show page controls
const LAST_PAGE_OFFSET = 2 * 1024 * 1024 * 1024 // large page offset to get the last page
/* eslint-enable no-multi-spaces */

export default {
  name: 'EntityPage',
  components: { draggable, PvTable, RunBar, RefreshRun, RunInfoDialog, EntityInfoDialog },

  props: {
    digest: { type: String, default: '' },
    runDigest: { type: String, default: '' },
    entityName: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false }
  },

  /* eslint-disable no-multi-spaces */
  data () {
    return {
      loadDone: false,
      loadWait: false,
      isNullable: true,       // entity always nullabale, value can be NULL
      isScalar: false,        // microdata never scalar, it always has at least one attribute
      rank: 0,                // entity key dimension + number of enum-based attributes
      attrCount: 0,           // number of attributes of built-in types: int, float, bool, string
      entityText: Mdf.emptyEntityText(),
      runEntity: Mdf.emptyRunEntity(),
      runText: Mdf.emptyRunText(),
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
        formatOpts: void 0      // hide format controls by default
      },
      pvc: {
        rowColMode: Pcvt.SPANS_AND_DIMS_PVT,  // rows and columns mode: 2 = use spans and show dim names
        isShowNames: false,                   // if true then show dimension names and item names instead of labels
        reader: void 0,                       // return row reader: if defined then methods to read next row, read() dimension items and readValue()
        processValue: Pcvt.asIsPval,          // default value processing: return as is
        formatter: Pcvt.formatDefault,        // disable format(), parse() and validation by default
        cellClass: 'pv-cell-right'            // default cell value style: right justified number
      },
      pvKeyPos: [],               // position of each dimension item in cell key
      isDragging: false,          // if true then user is dragging dimension select control
      isOtherDropDisabled: false, // if true then others drop area disabled
      isPages: false,
      pageStart: 0,
      pageSize: 0,
      isLastPage: false,
      isHidePageControls: false,
      loadRunWait: false,
      refreshRunTickle: false,
      runInfoTickle: false,
      entityInfoTickle: false
    }
  },
  /* eslint-enable no-multi-spaces */

  computed: {
    routeKey () { return Mdf.microdataPath(this.digest, this.runDigest, this.entityName) },
    entityDescr () { return this?.entityText?.EntityDescr || '' },

    ...mapState('model', {
      theModel: state => state.theModel
    }),
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest'
    }),
    ...mapState('uiState', {
      uiLang: state => state.uiLang
    }),
    ...mapGetters('uiState', {
      microdataView: 'microdataView'
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
      // check if model run exists and run entity microdata is included in model run results
      if (!this.initRunEntity()) return // exit on error

      this.isPages = this.runEntity.RowCount > SMALL_PAGE_SIZE // disable pages for small microdata
      this.pageStart = 0
      this.pageSize = this.isPages ? SMALL_PAGE_SIZE : 0

      this.isNullable = true // entity always nullabale, value can be NULL
      this.isScalar = false // microdata never scalar, it always has at least one attribute

      // adjust controls
      this.pvc.rowColMode = !this.isScalar ? Pcvt.SPANS_AND_DIMS_PVT : Pcvt.NO_SPANS_NO_DIMS_PVT
      this.ctrl.isRowColModeToggle = !this.isScalar
      this.ctrl.isRowColControls = !this.isScalar
      this.pvKeyPos = []

      // default pivot table options
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
      this.pvc.formatter = Pcvt.formatDefault({ isNullable: this.isNullable, locale: lc })
      this.pvc.cellClass = 'pv-cell-right' // numeric cell value style by default
      this.ctrl.formatOpts = void 0

      this.pvc.processValue = Pcvt.asIsPval // no value conversion required, only formatting

      // make dimensions:
      //  [0]           entity key dimension
      //  [1, rank - 1] enum-based dimensions
      //  [rank]        measure attributes dimension: list of non-enum based attributes, e.g. int, double,... attributes
      this.attrCount = 0
      this.rank = 0
      this.dimProp = []

      // entity key dimension at [0] position: initially empty
      const fk = {
        name: KEY_DIM_NAME,
        label: (Mdf.descrOfDescrNote(this.entityText) || this.$t('Entity')) + ' ' + this.$t('keys'),
        enums: [],
        isBool: false,
        selection: [],
        singleSelection: {},
        filter: (val, update, abort) => {}
      }
      this.dimProp.push(fk)

      // measure attributes dimension
      const fa = {
        name: ATTR_DIM_NAME,
        label: Mdf.descrOfDescrNote(this.entityText) || this.$t('Attribute'),
        enums: [],
        isBool: false,
        options: [],
        selection: [],
        singleSelection: {},
        filter: (val, update, abort) => {}
      }
      const aEnums = []
      const aFmt = {} // formatters for built-in attributes
      let nPos = 0 // attribute position in microdata row

      for (const ea of this.entityText.EntityAttrTxt) {
        if (!Mdf.isNotEmptyEntityAttr(ea)) continue
        if (this.runEntity.Attr.findIndex(name => ea.Attr.Name === name) < 0) continue // skip: this attribute is not included in run microdata

        // find attribute type text
        const tTxt = Mdf.typeTextById(this.theModel, ea.Attr.TypeId)

        if (!Mdf.isBuiltIn(tTxt.Type) || Mdf.isBool(tTxt.Type)) { // enum based attribute or bool: use it as dimension
          const f = {
            name: ea.Attr.Name || '',
            label: Mdf.descrOfDescrNote(ea) || ea.Attr.Name || '',
            enums: [],
            isBool: Mdf.isBool(tTxt.Type),
            options: [],
            selection: [],
            singleSelection: {},
            filter: (val, update, abort) => {},
            attrPos: nPos++
          }

          const eLst = Array(Mdf.typeEnumSize(tTxt))
          for (let j = 0; j < eLst.length; j++) {
            eLst[j] = Mdf.enumItemByIdx(tTxt, j)
          }
          f.enums = Object.freeze(eLst)
          f.options = f.enums
          f.filter = Puih.makeFilter(f)

          this.dimProp.push(f)
        } else { // built-in attribute type: add to attributes measure dimension
          const aId = ea.Attr.AttrId

          aEnums.push({
            value: aId,
            name: ea.Attr.Name || aId.toString(),
            label: Mdf.descrOfDescrNote(ea) || ea.Attr.Name || '' || aId.toString(),
            attrPos: nPos++
          })

          // setup process value and format value handlers:
          //  if parameter type is one of built-in then process and format value as float, int, boolen or string
          if (Mdf.isFloat(tTxt.Type)) {
            // this.pvc.processValue = Pcvt.asFloatPval
            aFmt[aId] = Pcvt.formatFloat({ isNullable: this.isNullable, locale: lc, isAllDecimal: true }) // show all deciamls for the float value
            this.pvc.cellClass = 'pv-cell-right' // numeric cell value style by default
          }
          if (Mdf.isInt(tTxt.Type)) {
            // this.pvc.processValue = Pcvt.asIntPval
            aFmt[aId] = Pcvt.formatInt({ isNullable: this.isNullable, locale: lc })
            this.pvc.cellClass = 'pv-cell-right' // numeric cell value style by default
          }
          if (Mdf.isBool(tTxt.Type)) {
            // this.pvc.processValue = Pcvt.asBoolPval
            aFmt[aId] = Pcvt.formatBool({})
            this.pvc.cellClass = 'pv-cell-center'
          }
          if (Mdf.isString(tTxt.Type)) {
            // this.pvc.processValue = Pcvt.asIsPval
            aFmt[aId] = Pcvt.formatDefault({ isNullable: this.isNullable, locale: lc })
            this.pvc.cellClass = 'pv-cell-left' // no process or format value required for string type
          }
        }
      }
      this.rank = this.dimProp.length
      this.attrCount = aEnums.length

      // if there are any attributes of built-in type then
      // append measure dimension to dimension list at [rank] position
      if (this.attrCount > 0) {
        fa.enums = Object.freeze(aEnums)
        fa.options = fa.enums
        fa.filter = Puih.makeFilter(fa)

        this.dimProp.push(fa) // measure attributes dimension at [rank] position
      }

      // setup formatter
      this.pvc.formatter = Pcvt.formatByKey({
        isNullable: this.isNullable,
        isByKey: true,
        isRawUse: true,
        isRawValue: false,
        locale: lc,
        formatter: aFmt
      })
      this.ctrl.formatOpts = this.pvc.formatter.options()
      this.pvc.dimItemKeys = Pcvt.dimItemKeys(ATTR_DIM_NAME)
      this.pvc.cellClass = 'pv-cell-right' // numeric cell value style by default
      this.pvc.processValue = Pcvt.asIsPval // no value conversion required, only formatting

      // read microdata rows, each row is { Key: integer, Attr:[{IsNull: false, Value: 19},...] }
      // array of attributes:
      //   dimensions are enum-based attributes or boolean
      //   meausre dimension values are values of built-in types attributes
      this.pvc.reader = (src) => {
        // no data to read: if source rows are empty or invalid return undefined reader
        if (!src || (src?.length || 0) <= 0) return void 0

        // entity key dimension is at [0] position
        // attribute id's: [1, rank - 1] enum based dimensions
        let dimPos = []
        if (this.rank > 1) {
          dimPos = Array(this.rank - 1)

          for (let k = 1; k < this.rank; k++) {
            dimPos[k - 1] = this.dimProp[k].attrPos
          }
        }

        // measure dimension at [rank] position: attribute id's are enum values of measure dimension
        const mIds = Array(this.attrCount)
        const attrPos = Array(this.attrCount)

        if (this.attrCount > 0) {
          let n = 0
          for (const e of this.dimProp[this.rank].enums) {
            mIds[n] = e.value
            attrPos[n++] = e.attrPos
          }
        }

        const srcLen = src.length
        let nSrc = 0
        let nAttr = -1 // after first read row must be nAttr = 0

        const rd = { // reader to return
          readRow: () => {
            nAttr++
            if (nAttr >= this.attrCount) {
              nAttr = 0
              nSrc++
            }
            return (nSrc < srcLen) ? (src[nSrc] || void 0) : void 0 // microdata row: key and array of enum-based attributes as dimensions and buit-in types attributes as values
          },
          readDim: {},
          readValue: (r) => {
            const a = r?.Attr || void 0
            const v = (a && !a[attrPos[nAttr]].IsNull) ? a[attrPos[nAttr]].Value : void 0 // measure value: built-in type attribute value
            return v
          }
        }

        // read entity key dimension
        rd.readDim[KEY_DIM_NAME] = (r) => r?.Key

        // read dimension item value: enum id for enum-based attributes
        for (let n = 1; n < this.rank; n++) {
          if (!this.dimProp[n].isBool) { // enum-based dimension
            rd.readDim[this.dimProp[n].name] = (r) => {
              const a = r?.Attr || void 0
              const cv = (a && dimPos[n - 1] < a.length) ? a[dimPos[n - 1]] : void 0
              return (cv && !cv.IsNull) ? cv.Value : void 0
            }
          } else { // boolean dimension: enum id's: 0 = false, 1 = true
            rd.readDim[this.dimProp[n].name] = (r) => {
              const a = r?.Attr || void 0
              const cv = (a && dimPos[n - 1] < a.length) ? a[dimPos[n - 1]] : void 0
              return (cv && !cv.IsNull) ? (cv.Value ? 1 : 0) : void 0
            }
          }
        }

        // read measure dimension: attribute id
        rd.readDim[ATTR_DIM_NAME] = (r) => (nAttr < mIds.length ? mIds[nAttr] : void 0)

        return rd
      }
    },

    // set page view: use previous page view from store or default
    async setPageView () {
      // if previous page view exist in session store
      let mv = this.microdataView(this.routeKey)
      if (!mv) {
        await this.restoreDefaultView() // restore default microdata view, if exist
        mv = this.microdataView(this.routeKey) // check if default view of microdata restored
        if (!mv) {
          this.setInitialPageView() // setup and use initial view of microdata
          return
        }
      }
      // else: restore previous view

      // restore rows, columns, others layout and items selection
      const restore = (edSrc) => {
        const dst = []
        for (const ed of edSrc) {
          const f = this.dimProp.find((d) => d.name === ed.name)
          if (!f) continue

          f.selection = []
          for (const v of ed.values) {
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
      this.rowFields = restore(mv.rows)
      this.colFields = restore(mv.cols)
      this.otherFields = restore(mv.others)

      // if there are any dimensions which are not in rows, columns or others then push it to others
      for (const f of this.dimProp) {
        if (this.rowFields.findIndex((d) => f.name === d.name) >= 0) continue
        if (this.colFields.findIndex((d) => f.name === d.name) >= 0) continue
        if (this.otherFields.findIndex((d) => f.name === d.name) >= 0) continue

        // append to other fields, select first enum
        f.selection = []
        f.selection.push(f.enums[0])
        f.singleSelection = (f.selection.length > 0) ? f.selection[0] : {}
        this.otherFields.push(f)
      }

      // if entity key dimensions on others then move it to rows last position
      const n = this.otherFields.findIndex(f => f.name === KEY_DIM_NAME)
      if (n >= 0) {
        this.otherFields.splice(n, 1)
        this.rowFields.push(this.dimProp[0])
      }
      // entity dimension page: all keys always selected
      if (this.dimProp.length > 0) {
        this.dimProp[0].selection = Array.from(this.dimProp[0].enums)
        this.dimProp[0].singleSelection = (this.dimProp[0].selection.length > 0) ? this.dimProp[0].selection[0] : {}
      }

      // restore controls view state
      this.ctrl.isRowColControls = !!mv.isRowColControls
      this.pvc.rowColMode = typeof mv.rowColMode === typeof 1 ? mv.rowColMode : Pcvt.SPANS_AND_DIMS_PVT

      // restore page offset and size
      if (this.isPages) {
        this.pageStart = (typeof mv?.pageStart === typeof 1) ? (mv?.pageStart || 0) : 0
        this.pageSize = (typeof mv?.pageSize === typeof 1 && mv.pageSize >= 0) ? mv.pageSize : SMALL_PAGE_SIZE
      } else {
        this.pageStart = 0
        this.pageSize = 0
      }

      // refresh pivot view: both dimensions labels and table body
      this.ctrl.isPvDimsTickle = !this.ctrl.isPvDimsTickle
      this.ctrl.isPvTickle = !this.ctrl.isPvTickle
    },

    // set initial page view for microdata
    setInitialPageView () {
      // all dimensions on rows, entity key dimension is at last row, measure dimension on columns
      const rf = []
      const cf = []
      const tf = []

      // rows: rank dimensions
      for (let nDim = 1; nDim < this.rank; nDim++) {
        rf.push(this.dimProp[nDim])
      }
      if (this.dimProp.length > 0) rf.push(this.dimProp[0]) // entity key dimension at rows on last position

      // columns: measure attribute dimension, it is at [rank] position in dimensions array
      if (this.dimProp.length > this.rank) cf.push(this.dimProp[this.rank])

      // for rows and columns select all items
      for (const f of cf) {
        f.selection = Array.from(f.enums)
        f.singleSelection = (f.selection.length > 0) ? f.selection[0] : {}
      }
      for (const f of rf) {
        f.selection = Array.from(f.enums)
        f.singleSelection = (f.selection.length > 0) ? f.selection[0] : {}
      }
      // other dimensions are empty by default
      this.rowFields = rf
      this.colFields = cf
      this.otherFields = tf

      // default row-column mode: row-column headers without spans
      // as it is today microdata cannot be scalar, always has at least one attribute
      this.pvc.rowColMode = !this.isScalar ? Pcvt.SPANS_AND_DIMS_PVT : Pcvt.NO_SPANS_NO_DIMS_PVT

      // store pivot view
      const vs = Pcvt.pivotStateFromFields(this.rowFields, this.colFields, this.otherFields, this.ctrl.isRowColControls, this.pvc.rowColMode, KEY_DIM_NAME)
      vs.pageStart = 0
      vs.pageSize = this.isPages ? ((typeof this.pageSize === typeof 1 && this.pageSize >= 0) ? this.pageSize : SMALL_PAGE_SIZE) : 0

      this.dispatchMicrodataView({
        key: this.routeKey,
        view: vs,
        digest: this.digest || '',
        modelName: Mdf.modelName(this.theModel),
        runDigest: this.runDigest || '',
        entityName: this.entityName || ''
      })

      // refresh pivot view: both dimensions labels and table body
      this.ctrl.isPvDimsTickle = !this.ctrl.isPvDimsTickle
      this.ctrl.isPvTickle = !this.ctrl.isPvTickle
    },

    // find model run and check if run entity exist in the model run
    initRunEntity () {
      if (!this.checkRunEntity()) return false // return error if model, run or entity name is empty

      this.runText = this.runTextByDigest({ ModelDigest: this.digest, RunDigest: this.runDigest })
      if (!Mdf.isNotEmptyRunText(this.runText)) {
        console.warn('Model run not found:', this.digest, this.runDigest)
        this.$q.notify({ type: 'negative', message: this.$t('Model run not found' + ': ' + this.runDigest) })
        return false
      }

      this.entityText = Mdf.entityTextByName(this.theModel, this.entityName)
      if (!Mdf.isNotEmptyEntityText(this.entityText)) {
        console.warn('Model entity not found:', this.entityName)
        this.$q.notify({ type: 'negative', message: this.$t('Model entity not found' + ': ' + this.entityName) })
        return false
      }
      this.runEntity = Mdf.runEntityByName(this.runText, this.entityName)
      if (!Mdf.isNotEmptyRunEntity(this.runEntity)) {
        console.warn('Entity microdata not found in model run:', this.entityName, this.runDigest)
        this.$q.notify({ type: 'negative', message: this.$t('Entity microdata not found in model run' + ': ' + this.entityName + ' ' + this.runDigest) })
        return false
      }
      return true
    },
    // check if model digeset, run digest and entity name is not empty
    checkRunEntity () {
      if (!this.digest) {
        console.warn('Invalid (empty) model digest')
        this.$q.notify({ type: 'negative', message: this.$t('Invalid (empty) model digest') })
        return false
      }
      if (!this.runDigest) {
        console.warn('Unable to show microdata: run digest is empty')
        this.$q.notify({ type: 'negative', message: this.$t('Unable to show microdata: run digest is empty') })
        return false
      }
      if (!this.entityName) {
        console.warn('Unable to show microdata: entity name is empty')
        this.$q.notify({ type: 'negative', message: this.$t('Unable to show microdata: entity name is empty') })
        return false
      }
      return true
    },

    // show entity notes dialog
    doShowEntityNote () {
      this.entityInfoTickle = !this.entityInfoTickle
    },
    // show run notes dialog
    doShowRunNote (modelDgst, runDgst) {
      this.runInfoTickle = !this.runInfoTickle
    },

    // show or hide row/column/other bars
    onToggleRowColControls () {
      this.ctrl.isRowColControls = !this.ctrl.isRowColControls
      this.dispatchMicrodataView({ key: this.routeKey, isRowColControls: this.ctrl.isRowColControls })
    },
    onSetRowColMode (mode) {
      this.pvc.rowColMode = (4 + mode) % 4
      this.dispatchMicrodataView({ key: this.routeKey, rowColMode: this.pvc.rowColMode })
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

    // download microdata as csv file
    onDownload () {
      // api/model/:model/run/:run/microdata/:name/csv
      const u = this.omsUrl +
        '/api/model/' + encodeURIComponent(this.digest) +
        '/run/' + encodeURIComponent(this.runDigest) +
        '/microdata/' + encodeURIComponent(this.entityName) +
        ((this.$q.platform.is.win) ? '/csv-bom' : '/csv')

      openURL(u)
    },

    // reload microdata data and reset pivot view to default
    async onReloadDefaultView () {
      if (this.pvc.formatter) {
        this.pvc.formatter.resetOptions()
      }
      this.dispatchMicrodataViewDelete(this.routeKey) // clean current view
      await this.restoreDefaultView()
      await this.setPageView()
      this.doRefreshDataPage()
    },
    // save current view as default microdata view
    async onSaveDefaultView () {
      const mv = this.microdataView(this.routeKey)
      if (!mv) {
        console.warn('Microdata view not found:', this.routeKey)
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

          if (ed.name !== KEY_DIM_NAME) { // skip items if it is entity key dimension
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
          }

          dst.push({
            name: ed.name,
            values: cArr
          })
        }
        return dst
      }

      // convert microdata view to "default" view: replace enum Ids with enum codes
      const dv = {
        rows: enumIdsToCodes(mv.rows),
        cols: enumIdsToCodes(mv.cols),
        others: enumIdsToCodes(mv.others),
        isRowColControls: this.ctrl.isRowColControls,
        rowColMode: this.pvc.rowColMode,
        pageStart: this.isPages ? this.pageStart : 0,
        pageSize: this.isPages ? this.pageSize : 0
      }

      // save into indexed db
      try {
        const dbCon = await Idb.connection()
        const rw = await dbCon.openReadWrite(Mdf.modelName(this.theModel))
        await rw.put(this.entityName, dv)
      } catch (e) {
        console.warn('Unable to save default microdata view', e)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to save default microdata view') })
        return
      }

      this.$q.notify({ type: 'info', message: this.$t('Default view of microdata saved') + ': ' + this.entityName })
      this.$emit('entity-view-saved', this.entityName)
    },

    // restore default microdata view
    async restoreDefaultView () {
      // select default microdata view from inxeded db
      let dv
      try {
        const dbCon = await Idb.connection()
        const rd = await dbCon.openReadOnly(Mdf.modelName(this.theModel))
        dv = await rd.getByKey(this.entityName)
      } catch (e) {
        console.warn('Unable to restore default microdata view', this.entityName, e)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to restore default microdata view') + ': ' + this.entityName })
        return
      }
      // exit if not found or empty
      if (!dv || !dv?.rows || !dv?.cols || !dv?.others) {
        return
      }

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

          if (ed.name !== KEY_DIM_NAME) { // skip items if it is entity key dimension
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
        this.pageSize = (typeof dv?.pageSize === typeof 1 && dv?.pageSize >= 0) ? dv.pageSize : SMALL_PAGE_SIZE
      } else {
        this.pageStart = 0
        this.pageSize = 0
      }

      // if is not empty any of selection rows, columns, other dimensions
      // then store pivot view: do insert or replace of the view
      if (Mdf.isLength(rows) || Mdf.isLength(cols) || Mdf.isLength(others)) {
        const vs = Pcvt.pivotState(rows, cols, others, dv.isRowColControls, dv.rowColMode || Pcvt.SPANS_AND_DIMS_PVT)
        vs.pageStart = this.isPages ? this.pageStart : 0
        vs.pageSize = this.isPages ? this.pageSize : 0

        this.dispatchMicrodataView({
          key: this.routeKey,
          view: vs,
          digest: this.digest || '',
          modelName: Mdf.modelName(this.theModel),
          runDigest: this.runDigest || '',
          entityName: this.entityName || ''
        })
      }
    },

    // pivot table view updated: item keys layout updated
    onPvKeyPos (keyPos) { this.pvKeyPos = keyPos },

    // dimensions drag, drop and selection filter
    //
    onChoose (e) {
      if (e?.item?.id === 'item-draggable-' + KEY_DIM_NAME) {
        this.isOtherDropDisabled = true // disable drop of entity key dimension on others
      }
    },
    onUnchoose (e) {
      this.isOtherDropDisabled = false
    },
    onDrag (e) {
      // drag started
      this.isDragging = true
    },
    onDrop (e) {
      // drag completed: drop
      this.isDragging = false

      // make sure at least one item selected in each dimension
      // other dimensions: use single-select dropdown
      let isMeasure = false
      for (const f of this.dimProp) {
        if (f.selection.length < 1) {
          f.selection.push(f.enums[0])
          if (f.name === ATTR_DIM_NAME) isMeasure = true
        }
      }
      for (const f of this.otherFields) {
        if (f.selection.length > 1) {
          f.selection = [f.selection[0]]
          if (f.name === ATTR_DIM_NAME) isMeasure = true
        }
      }
      for (const f of this.dimProp) {
        f.singleSelection = f.selection[0]
      }

      // update pivot view:
      //  if other dimesion(s) filters same as before
      //  then update pivot table view now
      //  else refresh data
      if (Puih.equalFilterState(this.filterState, this.otherFields, [KEY_DIM_NAME, ATTR_DIM_NAME])) {
        this.ctrl.isPvTickle = !this.ctrl.isPvTickle
        if (isMeasure) {
          this.filterState = Puih.makeFilterState(this.otherFields)
        }
      } else {
        this.doRefreshDataPage()
      }
      // update pivot view rows, columns, other dimensions
      this.dispatchMicrodataView({
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
      if (panel !== 'other' || Puih.equalFilterState(this.filterState, this.otherFields, [KEY_DIM_NAME, ATTR_DIM_NAME])) {
        this.ctrl.isPvTickle = !this.ctrl.isPvTickle
        if (name === ATTR_DIM_NAME) {
          this.filterState = Puih.makeFilterState(this.otherFields)
        }
      } else {
        this.doRefreshDataPage()
      }
      // update pivot view rows, columns, other dimensions
      this.dispatchMicrodataView({
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
      if (name === ATTR_DIM_NAME) {
        this.filterState = Puih.makeFilterState(this.otherFields)
      }
      // update pivot view rows, columns, other dimensions
      this.dispatchMicrodataView({
        key: this.routeKey,
        rows: Pcvt.pivotStateFields(this.rowFields),
        cols: Pcvt.pivotStateFields(this.colFields),
        others: Pcvt.pivotStateFields(this.otherFields)
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

    // get page of microdata data from current model run
    async doRefreshDataPage (isFullPage = false) {
      if (!this.checkRunEntity()) return // exit on error

      this.loadDone = false
      this.loadWait = true

      // save filters: other dimensions selected items
      this.filterState = Puih.makeFilterState(this.otherFields)

      // make microdata read layout and url
      const layout = Puih.makeSelectLayout(this.entityName, this.otherFields, [KEY_DIM_NAME, ATTR_DIM_NAME])
      layout.Offset = 0
      layout.Size = 0
      layout.IsFullPage = false
      if (this.isPages) {
        layout.Offset = this.pageStart || 0
        layout.Size = (!!this.pageSize && typeof this.pageSize === typeof 1) ? (this.pageSize || 0) : 0
        layout.IsFullPage = !!isFullPage
      }

      const u = this.omsUrl +
        '/api/model/' + encodeURIComponent(this.digest) +
        '/run/' + encodeURIComponent(this.runDigest) + '/microdata/value-id'

      // retrieve page from server, it must be: {Layout: {...}, Page: [...]}
      let isOk = false
      try {
        const response = await this.$axios.post(u, layout)
        const rsp = response.data

        if (!Mdf.isPageLayoutRsp(rsp)) {
          console.warn('Invalid response to:', u)
          this.$q.notify({ type: 'negative', message: this.$t('Server offline or microdata not found') + ': ' + this.entityName })
        } else {
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

          // update pivot table view and set entity key dimension enums
          this.inpData = Object.freeze(d)

          const eLst = Array(this.inpData.length)
          for (let j = 0; j < this.inpData.length; j++) {
            eLst[j] = {
              value: this.inpData[j]?.Key || 0,
              name: this.inpData[j]?.Key.toString() || 'Invalid',
              label: this.inpData[j]?.Key.toString() || this.$t('Invalid key')
            }
          }
          this.dimProp[0].enums = Object.freeze(eLst)
          this.dimProp[0].selection = Array.from(eLst)
          this.dimProp[0].singleSelection = (this.dimProp[0].selection.length > 0) ? this.dimProp[0].selection[0] : {}

          this.loadDone = true
          this.ctrl.isPvDimsTickle = !this.ctrl.isPvDimsTickle
          this.ctrl.isPvTickle = !this.ctrl.isPvTickle
          isOk = true
        }
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or microdata not found', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or microdata not found') + ': ' + this.entityName })
      }

      this.loadWait = false
      if (isOk) {
        this.dispatchMicrodataView({
          key: this.routeKey,
          pageStart: this.isPages ? this.pageStart : 0,
          pageSize: this.isPages ? this.pageSize : 0
        })
      }
    },

    ...mapActions('uiState', {
      dispatchMicrodataView: 'microdataView',
      dispatchMicrodataViewDelete: 'microdataViewDelete'
    })
  },

  mounted () {
    this.doRefresh()
    this.$emit('tab-mounted', 'entity', { digest: this.digest, runDigest: this.runDigest, entityName: this.entityName })
  }
}
