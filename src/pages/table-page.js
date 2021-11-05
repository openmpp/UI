/* eslint-disable no-multi-spaces */
import { mapState, mapGetters, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'
import { ReactInVue } from 'vuera'
import PivotReact from 'src/rv/PivotReact.react.jsx'
import RunBar from 'components/RunBar.vue'
import RunInfoDialog from 'components/RunInfoDialog.vue'
import TableInfoDialog from 'components/TableInfoDialog.vue'

const kind = {
  EXPR: 0,  // output table expression(s)
  ACC: 1,   // output table accumulator(s)
  ALL: 2    // output table all-accumultors view
}

const pivotReact = ReactInVue(PivotReact)

export default {
  name: 'TablePage',
  components: { 'pivot-react': pivotReact, RunBar, RunInfoDialog, TableInfoDialog },

  props: {
    digest: { type: String, default: '' },
    runDigest: { type: String, default: '' },
    tableName: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      loadDone: false,
      loadWait: false,
      tableText: Mdf.emptyTableText(),
      tableSize: Mdf.emptyTableSize(),
      runText: Mdf.emptyRunText(),
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
      maxDecimals: 4,
      exprLabels: {},
      accLabels: {},
      colLabels: [],
      totalEnumLabel: '',
      tv: {
        kind: kind.EXPR,
        start: 0,
        size: 0   // unlimited page size
      },
      runInfoTickle: false,
      tableInfoTickle: false
    }
  },

  computed: {
    routeKey () { return Mdf.tablePath(this.digest, this.runDigest, this.tableName) },

    ...mapState('model', {
      theModel: state => state.theModel,
      wordList: state => state.wordList
    }),
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest'
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
    // show output table notes dialog
    doShowTableNote () {
      this.tableInfoTickle = !this.tableInfoTickle
    },
    // show selected run info dialog
    doShowRunNote (modelDgst, runDgst) {
      this.runInfoTickle = !this.runInfoTickle
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
      const nDec = this.pvtState.nDecimals + 1
      this.pvtState.isAllDecimals = nDec > this.maxDecimals
      this.pvtState.nDecimals = !this.pvtState.isAllDecimals ? nDec : this.maxDecimals
      this.pvtState.isDecimalsUpdate = true
    },
    // show more decimals in table body
    showLessDecimals () {
      const nDec = !this.pvtState.isAllDecimals ? this.pvtState.nDecimals - 1 : this.maxDecimals
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
    doRefresh () {
      this.runText = this.runTextByDigest({ ModelDigest: this.digest, RunDigest: this.runDigest })
      this.subCount = this.runText.SubCount || 0
      this.totalEnumLabel = Mdf.wordByCode(this.wordList, Mdf.ALL_WORD_CODE)

      this.initTableProps()
      this.setDefaultPageView()
      this.doRefreshDataPage()
    },

    // initialize table properties: dimensions type and lables, measure lables
    initTableProps () {
      // find table and table size, including run sub-values count
      this.tableText = Mdf.tableTextByName(this.theModel, this.tableName)
      this.tableSize = Mdf.tableSizeByName(this.theModel, this.tableName)

      // find dimension type for each dimension and collect dimension lables
      this.dimProp = []
      for (let j = 0; j < this.tableSize.rank; j++) {
        if (!this.tableText.TableDimsTxt[j].hasOwnProperty('Dim')) continue

        const t = Mdf.typeTextById(this.theModel, (this.tableText.TableDimsTxt[j].Dim.TypeId || 0))
        const dp = {
          name: this.tableText.TableDimsTxt[j].Dim.Name || '',
          label: Mdf.descrOfDescrNote(this.tableText.TableDimsTxt[j]) || this.tableText.TableDimsTxt[j].Dim.Name || '',
          isTotal: this.tableText.TableDimsTxt[j].Dim.IsTotal,
          totalId: t.Type.TotalEnumId || 0,
          typeText: t,
          enumLabels: {}
        }

        for (let k = 0; k < t.TypeEnumTxt.length; k++) {
          const eId = t.TypeEnumTxt[k].Enum.EnumId
          dp.enumLabels[eId] = Mdf.enumDescrOrCodeById(t, eId) || t.TypeEnumTxt[k].Enum.Name || eId.toString()
        }
        if (dp.isTotal) dp.enumLabels[dp.totalId] = this.totalEnumLabel

        this.dimProp.push(dp)
      }

      // expression labels and decimals
      this.exprLabels = {}
      this.exprDecimals = {}
      this.maxDecimals = -1

      for (let j = 0; j < this.tableText.TableExprTxt.length; j++) {
        if (!this.tableText.TableExprTxt[j].hasOwnProperty('Expr')) continue

        const eId = this.tableText.TableExprTxt[j].Expr.ExprId
        this.exprLabels[eId] =
          Mdf.descrOfDescrNote(this.tableText.TableExprTxt[j]) ||
          this.tableText.TableExprTxt[j].Expr.SrcExpr ||
          this.tableText.TableExprTxt[j].Expr.Name ||
          eId.toString()

        const dec = this.tableText.TableExprTxt[j].Expr.Decimals || 0
        this.exprDecimals[eId] = dec
        if (this.maxDecimals < dec) this.maxDecimals = dec
      }
      if (this.maxDecimals < 0) this.maxDecimals = 4 // if model decimals=-1, which is display all then limit maxDecimals = 4 before display all
      this.pvtState.nDecimals = this.maxDecimals

      // accumulator labels
      this.accLabels = {}

      for (let j = 0; j < this.tableText.TableAccTxt.length; j++) {
        if (!this.tableText.TableAccTxt[j].hasOwnProperty('Acc')) continue

        const aId = this.tableText.TableAccTxt[j].Acc.AccId
        this.accLabels[aId] =
          Mdf.descrOfDescrNote(this.tableText.TableAccTxt[j]) ||
          this.tableText.TableAccTxt[j].Acc.SrcAcc ||
          this.tableText.TableAccTxt[j].Acc.Name ||
          aId.toString()
      }
    },

    // set default page view parameters
    setDefaultPageView () {
      this.tv.kind = kind.EXPR
      this.tv.start = 0
      this.tv.size = 0  // unlimited page size

      // if previous page view exist in session store
      // const tv = this.tableView(this.routeKey)
      // const isRestored = !!tv
      // if (isRestored) {
      //   this.tv.kind = tv?.kind || kind.EXPR
      //   this.pvtState.rows = tv?.rows || []
      //   this.pvtState.cols = tv?.cols || [this.colLabels[0]]
      //   this.pvtState.valueFilter = tv?.filter || {}
      // }
      this.setPivotView(false)
    },

    // set pivot table initial layout
    setPivotView (isRestored = false) {
      this.pvtState.isToggleUI = false        // prevent UI controls hide / show toggle
      this.pvtState.isDecimalsUpdate = false  // prevent decimals update in pivot table

      this.makeColLabels()
      const colCount = this.colLabels.length

      // dimensions and measure dimension are ordered as [others, row, column]
      // measure dimension: -1 <= position <= rank, it is inserted as extra dimension at index > measure position
      // expression value view:
      //   dimensions (including measure) on other, last-1 dimension on rows, last dimension on columns
      //   values into body aggregators (pivot.vals[])
      // accumulators view:
      //   sub id on columns, dimensions (including measure) on other, last dimension on rows
      //   sub-values into body aggregators (pivot.vals[])
      // value filters:
      //   include only one value for "other" dimensions
      //   if measure dimension on "other" then include only first expression name or accumulator name
      if (!isRestored) this.makeRowsCols()

      this.pvtState.vals = []
      this.pvtState.hiddenFromAggregators = []
      this.pvtState.hiddenFromDragDrop = []

      // hide values from aggregators: values are in the table body
      if (this.tv.kind === kind.EXPR) {
        const nVal = this.tableSize.rank + 1 // value position

        for (let n = 0; n < nVal; n++) {
          this.pvtState.hiddenFromAggregators.push(this.colLabels[n])
        }

        this.pvtState.vals.push(this.colLabels[nVal])
        this.pvtState.hiddenFromDragDrop.push(this.colLabels[nVal])
      } else {
        // else accumulators view
        const nSub0 = this.tableSize.rank + 2 // first sub-value position

        for (let n = 0; n < nSub0; n++) {
          this.pvtState.hiddenFromAggregators.push(this.colLabels[n])
        }

        for (let n = nSub0; n < colCount; n++) {
          this.pvtState.vals.push(this.colLabels[n])
          this.pvtState.hiddenFromDragDrop.push(this.colLabels[n])
        }
      }

      // sort order: same as enum lables for dimensions
      this.pvtState.sortDefs = []
      const vs = []

      for (let n = 0; n < this.tableSize.rank; n++) {
        const attr = this.colLabels[n]
        const lst = this.dimProp[n].enumLabels
        if (!attr || !lst) continue

        const vl = []
        for (const lbl in lst) {
          if (!lbl || !lst.hasOwnProperty(lbl)) continue
          if (lst[lbl]) vl.push(lst[lbl])
        }
        if (vl.length > 0) vs.push({ name: attr, vals: vl })
      }

      // sort order for measure column: same as expression or accumulator lables
      const mAttr = this.colLabels[this.tableSize.rank]
      if (mAttr) {
        const vl = []
        if (this.tv.kind === kind.EXPR) {
          for (const lbl in this.exprLabels) {
            if (!lbl || !this.exprLabels.hasOwnProperty(lbl)) continue
            if (this.exprLabels[lbl]) vl.push(this.exprLabels[lbl])
          }
        } else {
          for (const lbl in this.accLabels) {
            if (!lbl || !this.accLabels.hasOwnProperty(lbl)) continue
            if (this.accLabels[lbl]) vl.push(this.accLabels[lbl])
          }
        }
        if (vl.length > 0) vs.push({ name: mAttr, vals: vl })
      }
      this.pvtState.sortDefs = vs

      this.pvtState.data = Object.freeze(this.makeEmptyData())

      // store pivot view
      // this.dispatchTableView({
      //   key: this.routeKey,
      //   view: {
      //     kind: this.tv.kind,
      //     rows: this.pvtState.rows,
      //     cols: this.pvtState.cols,
      //     filter: this.pvtState.valueFilter
      //   }
      // })
    },

    // make empty data: column headers and empty row of values
    makeEmptyData () {
      return [this.colLabels.slice(), Array(this.colLabels.length).fill('')]
    },

    // setup make colunm labels (attributes in react-pivottable terms)
    makeColLabels () {
      // add dimension(s) lables
      this.colLabels = []
      for (let j = 0; j < this.tableSize.rank; j++) {
        this.colLabels.push((this.dimProp[j].label || this.dimProp[j].name))
      }
      this.colLabels.push(this.tableText.ExprDescr || this.$t('Measure')) // expression dimension

      // value column or accumulator sub-value column
      if (this.tv.kind === kind.EXPR) {
        this.colLabels.push('Value')   // expression value
      } else {
        this.colLabels.push('Sub #')    // sub id column
        this.colLabels.push('Sub-value') // sub-value column
      }
      return this.colLabels
    },

    // setup rows, columns and value filters
    makeRowsCols () {
      // dimensions and measure dimension are ordered as [others, row, column]
      // measure dimension: -1 <= position <= rank, it is inserted as extra dimension at index > measure position
      // for example: if position = -1 then at index 0 and the rest of dimensions where index >=0 shifted to the index = index+1
      //
      // expression value view:
      //   dimensions (including measure) on other, last-1 dimension on rows, last dimension on columns
      //   values into body aggregators (pivot.vals[])
      // accumulators view:
      //   sub id on columns, dimensions (including measure) on other, last dimension on rows
      //   sub-values into body aggregators (pivot.vals[])
      const nRank = this.tableSize.rank
      const isMcol = this.tv.kind === kind.EXPR && (nRank <= 0 || this.tableText.Table.ExprPos >= nRank - 1)
      const isMrow = !isMcol &&
        (nRank <= 1 ||
          (this.tv.kind === kind.EXPR && this.tableText.Table.ExprPos >= nRank - 2) ||
          (this.tv.kind !== kind.EXPR && this.tableText.Table.ExprPos >= nRank - 1)
        )

      this.pvtState.rows = []
      this.pvtState.cols = []

      if (this.tv.kind === kind.EXPR) {
        if (isMcol) {
          if (nRank > 0) this.pvtState.rows.push(this.colLabels[nRank - 1])
          this.pvtState.cols.push(this.colLabels[nRank]) // measure dimension: expression id
        }
        if (!isMcol && isMrow) {
          this.pvtState.rows.push(this.colLabels[nRank])    // measure dimension: expression id
          if (nRank > 0) this.pvtState.cols.push(this.colLabels[nRank - 1])
        }
        if (!isMcol && !isMrow) {
          if (nRank > 1) this.pvtState.rows.push(this.colLabels[nRank - 2])
          if (nRank > 0) this.pvtState.cols.push(this.colLabels[nRank - 1])
        }
      }
      if (this.tv.kind !== kind.EXPR) {
        this.pvtState.cols.push(this.colLabels[nRank + 1]) // sub-value id
        if (isMrow) {
          this.pvtState.rows.push(this.colLabels[nRank])   // measure dimension: accumulator id
        } else {
          if (nRank > 0) this.pvtState.rows.push(this.colLabels[nRank - 1])
        }
      }

      // setup value filters:
      // for each dimension column create list of items to hide
      //   include only one value for "other" dimensions
      //   if there "All" item then only "All" else first item
      //   if measure dimension on "other" then include only first expression name or accumulator name
      //   due to react-pivottable bug we have to exclude all items except one
      this.pvtState.valueFilter = {}

      let nLast = nRank
      if (this.tv.kind === kind.EXPR) {
        nLast = (isMrow || isMcol) ? nRank - 1 : nRank - 2
      } else {
        nLast = (isMrow || isMcol) ? nRank : nRank - 1
      }

      for (let n = 0; n < nLast; n++) {
        const dcArr = Mdf.enumDescrOrCodeArray(this.dimProp[n].typeText)
        if (!dcArr) continue
        const attr = this.colLabels[n]

        this.pvtState.valueFilter[attr] = dcArr.reduce((r, v, i) => {
          if (i === 0 && !this.dimProp[n].isTotal) return r   // do not exclude first item if no "All" in that dimension
          r[v] = true
          return r
        }, {})
      }

      // filter for measure column: first expression or accumulator lable
      if (!isMrow && !isMcol) {
        const mAttr = this.colLabels[nRank]
        if (mAttr) {
          let isFirst = true
          if (this.tv.kind === kind.EXPR) {
            for (const eId in this.exprLabels) {
              if (!eId || !this.exprLabels.hasOwnProperty(eId)) continue
              if (isFirst) {
                this.pvtState.valueFilter[mAttr] = {}
                isFirst = false
              } else {
                if (this.exprLabels[eId]) this.pvtState.valueFilter[mAttr][this.exprLabels[eId]] = true
              }
            }
          } else {
            for (const eId in this.accLabels) {
              if (!eId || !this.accLabels.hasOwnProperty(eId)) continue
              if (isFirst) {
                this.pvtState.valueFilter[mAttr] = {}
                isFirst = false
              } else {
                if (this.accLabels[eId]) this.pvtState.valueFilter[mAttr][this.accLabels[eId]] = true
              }
            }
          }
        }
      }
    },

    // update table data from response data page
    setData (d) {
      // if response is empty or invalid: clean table
      this.pvtState.data = this.makeEmptyData()
      this.pvtState.isToggleUI = false        // prevent UI controls hide / show toggle
      this.pvtState.isDecimalsUpdate = false  // prevent decimals update in pivot table

      const len = (!!d && (d.length || 0) > 0) ? d.length : 0
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
          console.warn('Invalid kind of table view: must be or of: EXPR, ACC, ALL')
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
        const row = Array(nRank + 2)
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
        const row = Array(nRank + 3)
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
        const rp = Array(nRank)
        for (let j = 0; j < nRank; j++) {
          rp[j] = this.translateDimEnumId(j, d[i].DimIds[j]) || d[i].DimIds[j]
        }
        for (let k = 0; k < nv; k++) {
          const row = Array(nRank + 3)
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
      if (this.pvtState.isAllDecimals) {
        return val.toString()
      }
      const dec = this.exprDecimals[exprId]
      return (dec !== void 0 && dec !== null && dec >= 0) ? val.toFixed(dec) : val
    },

    // get page of table data from current model run: expressions or accumulators
    async doRefreshDataPage () {
      if (!this.digest) {
        console.warn('Unable to refresh output table data: model digest is empty')
        this.$q.notify({ type: 'negative', message: this.$t('Unable to refresh output table data: model digest is empty') })
        return
      }
      if (!this.runDigest || !Mdf.isNotEmptyRunText(this.runText)) {
        console.warn('Unable to refresh output table data: model run not found or not completed')
        this.$q.notify({ type: 'negative', message: this.$t('Unable to refresh output table data: model run not found or not completed') })
        return
      }
      if (!this.tableName) {
        console.warn('Unable to refresh output table data: table name is empty')
        this.$q.notify({ type: 'negative', message: this.$t('Unable to refresh output table data: table name is empty') })
        return
      }

      this.loadDone = false
      this.loadWait = true

      // make output table read layout and url
      const layout = this.makeSelectLayout()
      const u = this.omsUrl + '/api/model/' + this.digest + '/run/' + this.runDigest + '/table/value-id'

      // retrieve page from server, it must be: {Layout: {...}, Page: [...]}
      try {
        const response = await this.$axios.post(u, layout)
        const rsp = response.data
        let d = []
        if (rsp) {
          if ((rsp?.Page?.length || 0) > 0) d = rsp.Page
        }
        const lt = { Offset: 0, Size: 0, IsLastPage: true }
        if (rsp) {
          if ((rsp?.Layout?.Offset || 0) > 0) lt.Offset = rsp.Layout.Offset || 0
          if ((rsp?.Layout?.Size || 0) > 0) lt.Size = rsp.Layout.Size || 0
          lt.IsLastPage = !!rsp?.Layout?.IsLastPage
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
        console.warn('Server offline or output table data not found', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or output table data not found') + ': ' + this.tableName })
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
      const layout = {
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
      const n = this.tv.kind === kind.ACC ? 3 : 2
      for (let k = 0; k < this.tableSize.rank; k++) {
        layout.OrderBy.push({ IndexOne: k + n })
      }
      layout.OrderBy.push({ IndexOne: 1 })
      if (this.tv.kind === kind.ACC) layout.OrderBy.push({ IndexOne: 2 })

      return layout
    },

    ...mapActions('uiState', {
      dispatchTableView: 'tableView'
    })
  },

  mounted () {
    this.doRefresh()
    this.$emit('tab-mounted', 'table', { digest: this.digest, runDigest: this.runDigest, tableName: this.tableName })
  }
}
/* eslint-enable no-multi-spaces */
