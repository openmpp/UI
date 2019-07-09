<template>

<div id="table-page" class="main-container mdc-typography  mdc-typography--body1">

  <div v-if="loadDone" class="hdr-row mdc-typography--body1">

    <span
      @click="showTableInfo()"
      class="cell-icon-link material-icons" :alt="tableName + ' info'" :title="tableName + ' info'">description</span>

    <span v-if="tv.kind!==0"
      @click="doExpressionPage()"
      class="cell-icon-link material-icons" title="View table expressions" alt="View table expressions">functions</span>
    <span v-else
      class="cell-icon-empty material-icons" title="View table expressions" alt="View table expressions">functions</span>

    <span v-if="tv.kind!==1"
      @click="doAccumulatorPage()"
      class="cell-icon-link material-icons" title="View accumulators and sub-values" alt="View accumulators and sub-values">filter_8</span>
    <span v-else
      class="cell-icon-empty material-icons" title="View accumulators and sub-values" alt="View accumulators and sub-values">filter_8</span>

    <span v-if="tv.kind!==2"
      @click="doAllAccumulatorPage()"
      class="cell-icon-link material-icons" title="View all accumulators and sub-values" alt="View all accumulators and sub-values">filter_9_plus</span>
    <span v-else
      class="cell-icon-empty material-icons" title="View all accumulators and sub-values" alt="View all accumulators and sub-values">filter_9_plus</span>

    <span v-if="!pvtState.isAllDecimals"
      @click="showMoreDecimals()"
      class="cell-icon-link material-icons"
      :title="'Show more decimals, now: ' + (!pvtState.isAllDecimals ? pvtState.nDecimals.toString() : 'show all')"
      :alt="'Show more decimals, now: ' + (!pvtState.isAllDecimals ? pvtState.nDecimals.toString() : 'show all')">zoom_in</span>
    <span v-else
      class="cell-icon-empty material-icons" title="Show more decimals" alt="Show more decimals">zoom_in</span>

    <span v-if="pvtState.nDecimals > 0 || pvtState.isAllDecimals"
      @click="showLessDecimals()"
      class="cell-icon-link material-icons"
      :title="'Show less decimals, now: ' + (!pvtState.isAllDecimals ? pvtState.nDecimals.toString() : 'show all')"
      :alt="'Show less decimals, now: ' + (!pvtState.isAllDecimals ? pvtState.nDecimals.toString() : 'show all')">zoom_out</span>
    <span v-else
      class="cell-icon-empty material-icons" title="Show less decimals" alt="Show less decimals">zoom_out</span>

    <span
      @click="togglePivotControls()"
      class="cell-icon-link material-icons" title="Show / hide pivot controls" alt="Show / hide pivot controls">tune</span>
    <span
      @click="doResetView()"
      class="cell-icon-link material-icons" title="Reset table view to default" alt="Reset table view to default">settings_backup_restore</span>

    <span class="medium-wt">{{ tableName }}: </span>
    <span>{{ tableDescr() }}</span>

  </div>
  <div v-else class="hdr-row medium-wt">
    <span class="cell-icon-link material-icons" aria-hidden="true">refresh</span>
    <span v-if="loadWait" class="material-icons om-mcw-spin">hourglass_empty</span>
    <span class="mdc-typography--caption">{{msg}}</span>
  </div>

  <div class="pv-container">
    <pivot-react
      :pvtState="pvtState"
      />
  </div>

  <table-info-dialog ref="noteDlg" id="table-note-dlg"></table-info-dialog>

</div>

</template>

<script>
import axios from 'axios'
import { mapGetters } from 'vuex'
import { GET } from '@/store'
import * as Mdf from '@/modelCommon'
import TableInfoDialog from './TableInfoDialog'
import PivotReact from '@/rv/PivotReact'

/* eslint-disable no-multi-spaces */
const kind = {
  EXPR: 0,  // output table expression(s)
  ACC: 1,   // output table accumulator(s)
  ALL: 2    // output table all-accumultors view
}

export default {
  components: { TableInfoDialog, 'pivot-react': PivotReact },

  props: {
    digest: '',
    tableName: '',
    nameDigest: ''
  },

  data () {
    return {
      loadDone: false,
      loadWait: false,
      tableText: Mdf.emptyTableText(),
      tableSize: Mdf.emptyTableSize(),
      subCount: 0,
      pvtState: {
        data: [],
        rows: [],
        cols: [],
        vals: [],
        hiddenFromAggregators: [],
        hiddenFromDragDrop: [],
        valueFilter: {},
        aggregatorName: 'Average',
        sortDefs: [],
        isShowUI: true,
        isToggleUI: false,
        nDecimals: 2,
        isAllDecimals: false,
        isDecimalsUpdate: false
      },
      dimProp: [],
      exprDecimals: {},
      maxDecimals: 2,
      exprLabels: {},
      accLabels: {},
      colLabels: [],
      totalEnumLabel: '',
      tv: {
        kind: kind.EXPR,
        start: 0,
        size: 0   // unlimited page size
      },
      msg: ''
    }
  },

  computed: {
    routeKey () {
      return [this.digest, this.tableName, this.nameDigest].toString()
    },
    ...mapGetters({
      theModel: GET.THE_MODEL,
      theRunText: GET.THE_RUN_TEXT,
      wordList: GET.WORD_LIST,
      omppServerUrl: GET.OMPP_SRV_URL
    })
  },

  watch: {
    routeKey () { this.refreshView() }
  },

  methods: {
    tableDescr () { return this.tableText.TableDescr || '' },

    // show table info
    showTableInfo () {
      this.$refs.noteDlg.showTableInfo(this.tableName, this.subCount)
    },

    // local refresh button handler, table content only
    doRefresh () {
      this.doRefreshDataPage()
    },
    // show output table expressions
    doExpressionPage () {
      this.tv.kind = kind.EXPR
      this.setPivotView()
      this.doRefreshDataPage()
    },
    // show output table accumulators
    doAccumulatorPage () {
      this.tv.kind = kind.ACC
      this.setPivotView()
      this.doRefreshDataPage()
    },
    // show all-accumulators view
    doAllAccumulatorPage () {
      this.tv.kind = kind.ALL
      this.setPivotView()
      this.doRefreshDataPage()
    },
    // reset table view to default
    doResetView () {
      this.setDefaultPageView()
      this.pvtState.isShowUI = true
      this.pvtState.isToggleUI = true
      this.pvtState.nDecimals = this.maxDecimals
      this.pvtState.isAllDecimals = false
      this.pvtState.isDecimalsUpdate = true
      this.doRefreshDataPage()
    },
    // show more decimals in table body
    showMoreDecimals () {
      let nDec = this.pvtState.nDecimals + 1
      this.pvtState.isAllDecimals = nDec > this.maxDecimals
      this.pvtState.nDecimals = !this.pvtState.isAllDecimals ? nDec : this.maxDecimals
      this.pvtState.isDecimalsUpdate = true
    },
    // show more decimals in table body
    showLessDecimals () {
      let nDec = !this.pvtState.isAllDecimals ? this.pvtState.nDecimals - 1 : this.maxDecimals
      this.pvtState.isAllDecimals = false
      this.pvtState.nDecimals = nDec >= 0 ? nDec : 0
      this.pvtState.isDecimalsUpdate = true
    },
    // show or hide pivot UI controls
    togglePivotControls () {
      this.pvtState.isShowUI = !this.pvtState.isShowUI
      this.pvtState.isToggleUI = true
    },

    // refresh current page view on mounted or tab switch
    refreshView () {
      // find table and table size, including run sub-values count
      this.tableText = Mdf.tableTextByName(this.theModel, this.tableName)
      this.tableSize = Mdf.tableSizeByName(this.theModel, this.tableName)
      this.subCount = this.theRunText.SubCount || 0
      this.totalEnumLabel = Mdf.wordByCode(this.wordList, Mdf.ALL_WORD_CODE)

      // find dimension type for each dimension and collect dimension lables
      this.dimProp = []
      for (let j = 0; j < this.tableSize.rank; j++) {
        if (!this.tableText.TableDimsTxt[j].hasOwnProperty('Dim')) continue

        let t = Mdf.typeTextById(this.theModel, (this.tableText.TableDimsTxt[j].Dim.TypeId || 0))
        let dp = {
          name: this.tableText.TableDimsTxt[j].Dim.Name || '',
          label: Mdf.descrOfDescrNote(this.tableText.TableDimsTxt[j]) || this.tableText.TableDimsTxt[j].Dim.Name || '',
          isTotal: this.tableText.TableDimsTxt[j].Dim.IsTotal,
          totalId: t.Type.TotalEnumId || 0,
          typeText: t,
          enumLabels: {}
        }

        for (let k = 0; k < t.TypeEnumTxt.length; k++) {
          let eId = t.TypeEnumTxt[k].Enum.EnumId
          dp.enumLabels[eId] = Mdf.enumDescrOrCodeById(t, eId) || t.TypeEnumTxt[k].Enum.Name || eId.toString()
        }
        if (dp.isTotal) dp.enumLabels[dp.totalId] = this.totalEnumLabel

        this.dimProp.push(dp)
      }

      // expression labels and decimals
      this.exprLabels = {}
      this.exprDecimals = {}
      this.maxDecimals = 0
      for (let j = 0; j < this.tableText.TableExprTxt.length; j++) {
        if (!this.tableText.TableExprTxt[j].hasOwnProperty('Expr')) continue

        let eId = this.tableText.TableExprTxt[j].Expr.ExprId
        this.exprLabels[eId] =
          Mdf.descrOfDescrNote(this.tableText.TableExprTxt[j]) ||
          this.tableText.TableExprTxt[j].Expr.SrcExpr ||
          this.tableText.TableExprTxt[j].Expr.Name ||
          eId.toString()

        let dec = this.tableText.TableExprTxt[j].Expr.Decimals || 0
        this.exprDecimals[eId] = dec
        if (this.maxDecimals < dec) this.maxDecimals = dec
      }
      this.pvtState.nDecimals = this.maxDecimals

      // accumultor labels
      this.accLabels = {}
      for (let j = 0; j < this.tableText.TableAccTxt.length; j++) {
        if (!this.tableText.TableAccTxt[j].hasOwnProperty('Acc')) continue

        let aId = this.tableText.TableAccTxt[j].Acc.AccId
        this.accLabels[aId] =
          Mdf.descrOfDescrNote(this.tableText.TableAccTxt[j]) ||
          this.tableText.TableAccTxt[j].Acc.SrcAcc ||
          this.tableText.TableAccTxt[j].Acc.Name ||
          aId.toString()
      }

      // set columns layout and refresh the data
      this.setDefaultPageView()
      this.doRefreshDataPage()
    },

    // set default page view parameters
    setDefaultPageView () {
      this.tv.kind = kind.EXPR
      this.tv.start = 0
      this.tv.size = 0  // unlimited page size
      // this.tv.size = 0 Math.min(20, this.tableSize.dimTotal * this.tableSize.exprCount)
      this.setPivotView()
    },

    // set pivot table initial layout
    setPivotView () {
      this.pvtState.isToggleUI = false        // prevent UI controls hide / show toggle
      this.pvtState.isDecimalsUpdate = false  // prevent decimals update in pivot table

      // dimension columns
      this.colLabels = []
      for (let j = 0; j < this.tableSize.rank; j++) {
        this.colLabels.push((this.dimProp[j].label || this.dimProp[j].name))
      }
      this.colLabels.push(this.tableText.ExprDescr || 'Measure') // expression dimension

      // value column or accumulator sub-value column
      if (this.tv.kind === kind.EXPR) {
        this.colLabels.push('Value')   // expression value
      } else {
        this.colLabels.push('Sub #')    // sub id column
        this.colLabels.push('SubValue') // sub-value column
      }
      const colCount = this.colLabels.length

      // expression value view:
      //   measure name on columns, first dimension on rows, rest of dimensions on others
      //   values into body aggregators (pivot.vals[])
      // accumulators view:
      //   sub id on columns, measure name on rows, all dimensions on others
      //   sub-values into body aggregators (pivot.vals[])
      this.pvtState.rows = []
      this.pvtState.cols = []
      this.pvtState.vals = []
      this.pvtState.hiddenFromAggregators = []
      this.pvtState.hiddenFromDragDrop = []

      if (this.tv.kind === kind.EXPR) {
        const nVal = this.tableSize.rank + 1 // value position

        this.pvtState.cols.push(this.colLabels[this.tableSize.rank])

        if (this.tableSize.rank > 0) {
          this.pvtState.rows.push(this.colLabels[0])
        }

        for (let n = 0; n < nVal; n++) {
          this.pvtState.hiddenFromAggregators.push(this.colLabels[n])
        }

        this.pvtState.vals.push(this.colLabels[nVal])
        this.pvtState.hiddenFromDragDrop.push(this.colLabels[nVal])

        // else accumulators view
      } else {
        const nSub0 = this.tableSize.rank + 2 // first sub-value position

        this.pvtState.rows.push(this.colLabels[this.tableSize.rank])
        this.pvtState.cols.push(this.colLabels[this.tableSize.rank + 1])

        for (let n = 0; n < nSub0; n++) {
          this.pvtState.hiddenFromAggregators.push(this.colLabels[n])
        }

        for (let n = nSub0; n < colCount; n++) {
          this.pvtState.vals.push(this.colLabels[n])
          this.pvtState.hiddenFromDragDrop.push(this.colLabels[n])
        }
      }

      // include only one value for "other" dimensions
      // if there "All" item then only "All" else first item
      // due to react-pivottable bug we have to exclude all items except one
      this.pvtState.valueFilter = {}
      const n0 = this.tv.kind === kind.EXPR ? 1 : 0

      for (let n = n0; n < this.tableSize.rank; n++) {
        let dcArr = Mdf.enumDescrOrCodeArray(this.dimProp[n].typeText)
        if (!dcArr) continue
        let attr = this.colLabels[n]

        this.pvtState.valueFilter[attr] = dcArr.reduce((r, v, i) => {
          if (i === 0 && !this.dimProp[n].isTotal) return r   // do not exclude first item if no "All" in that dimension
          r[v] = true
          return r
        }, {})
      }

      // sort order: same as enum lables for dimensions
      this.pvtState.sortDefs = []
      let vs = []

      for (let n = 0; n < this.tableSize.rank; n++) {
        let attr = this.colLabels[n]
        let lst = this.dimProp[n].enumLabels
        if (!attr || !lst) continue

        let vl = []
        for (let lbl in lst) {
          if (!lbl || !lst.hasOwnProperty(lbl)) continue
          if (lst[lbl]) vl.push(lst[lbl])
        }
        if (vl.length > 0) vs.push({name: attr, vals: vl})
      }

      // sort order for measure column: same as expression or accumulator lables
      let mAttr = this.colLabels[this.tableSize.rank]
      if (mAttr) {
        let vl = []
        if (this.tv.kind === kind.EXPR) {
          for (let lbl in this.exprLabels) {
            if (!lbl || !this.exprLabels.hasOwnProperty(lbl)) continue
            if (this.exprLabels[lbl]) vl.push(this.exprLabels[lbl])
          }
        } else {
          for (let lbl in this.accLabels) {
            if (!lbl || !this.accLabels.hasOwnProperty(lbl)) continue
            if (this.accLabels[lbl]) vl.push(this.accLabels[lbl])
          }
        }
        if (vl.length > 0) vs.push({name: mAttr, vals: vl})
      }
      this.pvtState.sortDefs = vs

      // make empty data: column headers and empty row of values
      this.pvtState.data = Object.freeze([this.colLabels.slice(), Array(colCount).fill('')])
    },

    // update table data from response data page
    setData (d) {
      // if response is empty or invalid: clean table
      this.pvtState.data = []
      this.pvtState.isToggleUI = false        // prevent UI controls hide / show toggle
      this.pvtState.isDecimalsUpdate = false  // prevent decimals update in pivot table

      let len = (!!d && (d.length || 0) > 0) ? d.length : 0
      if (!d || len <= 0) {
        return
      }

      // set page data
      let vd = []
      switch (this.tv.kind) {
        case kind.EXPR:
          vd = this.makeExprPage(len, d)
          break
        case kind.ACC:
          vd = this.makeAccPage(len, d)
          break
        case kind.ALL:
          vd = this.makeAllAccPage(len, d)
          break
        default:
          console.log('Invalid kind of table view: must be or of: EXPR, ACC, ALL')
      }
      vd.unshift(this.colLabels)  // add column labels (attributes in pivot table) as first row

      this.pvtState.data = Object.freeze(vd)
    },

    // make expression data page, columns are: dimensions, expression label, value
    // sql: SELECT expr_id, dim0, dim1, value... ORDER BY 2, 3, 1
    makeExprPage (len, d) {
      const nRank = this.tableSize.rank
      const vp = Array(len)

      for (let i = 0; i < len; i++) {
        let row = Array(nRank + 2)
        for (let j = 0; j < nRank; j++) {
          row[j] = this.translateDimEnumId(j, d[i].DimIds[j]) || d[i].DimIds[j]
        }
        row[nRank] = this.translateExprId(d[i].ExprId) || d[i].ExprId
        row[nRank + 1] = this.formatExprValue(d[i].ExprId, d[i].IsNull, d[i].Value)
        vp[i] = row
      }
      return vp
    },

    // make accumulators data page, columns are: dimensions, accumulator label, sub-id, sub-value
    // sql: SELECT acc_id, sub_id, dim0, dim1, value... ORDER BY 3, 4, 1, 2
    makeAccPage (len, d) {
      const nRank = this.tableSize.rank
      const vp = Array(len)

      for (let i = 0; i < len; i++) {
        let row = Array(nRank + 3)
        for (let j = 0; j < nRank; j++) {
          row[j] = this.translateDimEnumId(j, d[i].DimIds[j]) || d[i].DimIds[j]
        }
        row[nRank] = this.translateAccId(d[i].AccId) || d[i].AccId
        row[nRank + 1] = d[i].SubId || 0
        row[nRank + 2] = !d[i].IsNull ? d[i].Value : (void 0)
        vp[i] = row
      }
      return vp
    },

    // make all-accumulators view page, columns are: dimensions, accumulator label, sub-id, sub-value
    // each sub-value is a separate row in source rowset
    // each row has all accumulators
    // sql: SELECT sub_id, dim0, dim1, acc0, acc1... ORDER BY 2, 3, 1
    makeAllAccPage (len, d) {
      const nRank = this.tableSize.rank
      const nv = this.tableSize.allAccCount
      const vp = Array(len * nv)

      for (let i = 0; i < len; i++) {
        let rp = Array(nRank)
        for (let j = 0; j < nRank; j++) {
          rp[j] = this.translateDimEnumId(j, d[i].DimIds[j]) || d[i].DimIds[j]
        }
        for (let k = 0; k < nv; k++) {
          let row = Array(nRank + 3)
          for (let j = 0; j < nRank; j++) {
            row[j] = rp[j]
          }
          row[nRank] = this.translateAccId(this.tableText.TableAccTxt[k].Acc.AccId) || k
          row[nRank + 1] = d[i].SubId || 0
          row[nRank + 2] = !d[i].IsNull[k] ? d[i].Value[k] : (void 0)
          vp[i * nv + k] = row
        }
      }
      return vp
    },

    // translate dimension enum id to label, it does return enum code if label is empty
    // return total enum label if total enabled for dimension and id is total enum id
    translateDimEnumId (dimIdx, enumId) {
      if (enumId === void 0 || enumId === null) return '' // enum id undefined
      return this.dimProp[dimIdx].enumLabels[enumId] || enumId.toString()
    },

    // translate expression id to label or name if label is empty
    // it is expected to be expression id === expression index
    translateExprId (exprId) {
      if (exprId === void 0 || exprId === null || exprId < 0) return '' // expression id undefined
      return this.exprLabels[exprId] || exprId.toString()
    },

    // translate accumulator id to label or name if label is empty
    // it is expected to be accumulator id === accumulator index
    translateAccId (accId) {
      if (accId === void 0 || accId === null || accId < 0) return ''  // accumulator id undefined
      return this.accLabels[accId] || accId.toString()
    },

    // return expression value formatted with specified decimals
    // decimals undefined then default format is used
    formatExprValue (exprId, isNull, val) {
      if (isNull || val === void 0 || val === null) return '' // value is null
      if (exprId === void 0 || exprId === null || exprId < 0) { // expression id undefined
        return val.toString()
      }
      let dec = this.exprDecimals[exprId]
      return (dec !== void 0 && dec !== null) ? val.toFixed(dec) : val.toString()
    },

    // get page of table data from current model run: expressions or accumulators
    async doRefreshDataPage () {
      this.loadDone = false
      this.loadWait = true
      this.msg = 'Loading...'

      // exit if model run empty: must be found (not found run is empty)
      if (!Mdf.isNotEmptyRunText(this.theRunText)) {
        this.msg = 'Model run is not completed'
        console.log('Model run is not completed (empty)')
        this.loadWait = false
        return
      }

      // make output table read layout and url
      let layout = this.makeSelectLayout()
      let u = this.omppServerUrl +
        '/api/model/' + (this.digest || '') + '/run/' + (this.theRunText.Digest || '') + '/table/value-id'

      // retrieve page from server, it must be: {Layout: {...}, Page: [...]}
      try {
        const response = await axios.post(u, layout)
        const rsp = response.data
        let d = []
        if (!!rsp && rsp.hasOwnProperty('Page')) {
          if ((rsp.Page.length || 0) > 0) d = rsp.Page
        }
        let lt = {Offset: 0, Size: 0, IsLastPage: true}
        if (!!rsp && rsp.hasOwnProperty('Layout')) {
          if ((rsp.Layout.Offset || 0) > 0) lt.Offset = rsp.Layout.Offset || 0
          if ((rsp.Layout.Size || 0) > 0) lt.Size = rsp.Layout.Size || 0
          if (rsp.Layout.hasOwnProperty('IsLastPage')) lt.IsLastPage = !!rsp.Layout.IsLastPage
        }

        // set page view state: is next page exist
        this.tv.start = lt.Offset
        if (this.tv.kind !== kind.EXPR) this.tv.start = Math.floor(lt.Offset / this.subCount)

        // update table page
        this.setData(d)
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        this.msg = 'Server offline or output table data not found'
        console.log('Server offline or output table data not found', em)
      }
      this.loadWait = false
    },

    // return page layout to read table data
    makeSelectLayout () {
      //
      // for accumulators each sub-value is a separate row
      let nStart = this.tv.start
      let nSize = this.tv.size
      if (this.tv.kind !== kind.EXPR) {
        nStart *= this.subCount
        nSize *= this.subCount
      }
      let layout = {
        Name: this.tableName,
        Offset: (this.tv.size > 0 ? nStart : 0),
        Size: (this.tv.size > 0 ? nSize : 0),
        IsLastPage: true,
        Filter: [],
        OrderBy: [],
        IsAccum: (this.tv.kind !== kind.EXPR),
        IsAllAccum: this.tv.kind === kind.ALL
      }

      // make deafult order by
      // expressions:      SELECT expr_id, dim0, dim1, value...        ORDER BY 2, 3, 1
      // accumulators:     SELECT acc_id, sub_id, dim0, dim1, value... ORDER BY 3, 4, 1, 2
      // all-accumulators: SELECT sub_id, dim0, dim1, acc0, acc1...    ORDER BY 2, 3, 1
      let n = this.tv.kind === kind.ACC ? 3 : 2
      for (let k = 0; k < this.tableSize.rank; k++) {
        layout.OrderBy.push({IndexOne: k + n})
      }
      layout.OrderBy.push({IndexOne: 1})
      if (this.tv.kind === kind.ACC) layout.OrderBy.push({IndexOne: 2})

      return layout
    }
  },

  mounted () {
    this.refreshView()
    this.$emit('tab-mounted', 'table', this.tableName)
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
  @import "@material/theme/mdc-theme";
  @import "@material/typography/mdc-typography";
  @import "@/om-mcw.scss";

  /* main container, header row and data table */
  .main-container {
    height: 100%;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    overflow-y: hidden;
  }
  .hdr-row {
    flex: 0 0 auto;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    margin-top: 0.5rem;
  }
  .pv-container {
    flex: 1 1 auto;
    overflow: auto;
    margin-top: 0.5rem;
  }

  /* cell material icon: a link or empty (non-link) */
  .cell-icon {
    vertical-align: middle;
    margin: 0;
    padding-left: 0;
    padding-right: 0;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  .cell-icon-link {
    @extend .cell-icon;
    &:hover {
      cursor: pointer;
    }
    @extend .mdc-theme--on-primary;
    @extend .mdc-theme--primary-bg;
  }
  .cell-icon-empty {
    @extend .cell-icon;
    cursor: default;
    @extend .om-theme-primary-light-bg;
    @extend .mdc-theme--on-primary;
  }
</style>
