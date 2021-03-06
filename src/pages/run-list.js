import { mapState, mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'
import RunParameterList from 'components/RunParameterList.vue'
import TableList from 'components/TableList.vue'
import RunInfoDialog from 'components/RunInfoDialog.vue'
import ParameterInfoDialog from 'components/ParameterInfoDialog.vue'
import TableInfoDialog from 'components/TableInfoDialog.vue'
import GroupInfoDialog from 'components/GroupInfoDialog.vue'

export default {
  name: 'RunList',
  components: { RunParameterList, TableList, RunInfoDialog, ParameterInfoDialog, TableInfoDialog, GroupInfoDialog },

  props: {
    digest: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      runCurrent: Mdf.emptyRunText(), // currently selected run
      isRunTreeCollapsed: false,
      isAnyRunGroup: false,
      runTreeData: [],
      runFilter: '',
      isParamTreeShow: false,
      isTableTreeShow: false,
      runInfoTickle: false,
      runInfoDigest: '',
      groupInfoTickle: false,
      groupInfoName: '',
      paramInfoTickle: false,
      paramInfoName: '',
      tableInfoTickle: false,
      tableInfoName: '',
      nextId: 100
    }
  },

  computed: {
    isNotEmptyRunCurrent () { return Mdf.isNotEmptyRunText(this.runCurrent) },
    descrRunCurrent () { return Mdf.descrOfTxt(this.runCurrent) },

    modelParamCount () { return Mdf.paramCount(this.theModel) },
    modelTableCount () { return Mdf.tableCount(this.theModel) },

    ...mapState('model', {
      theModel: state => state.theModel,
      runTextList: state => state.runTextList,
      runTextListUpdated: state => state.runTextListUpdated
    }),
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest'
    }),
    ...mapState('uiState', {
      runDigestSelected: state => state.runDigestSelected
    })
  },

  watch: {
    digest () { this.doRefresh() },
    refreshTickle () { this.doRefresh() },
    runTextListUpdated () { this.doRefresh() },
    runDigestSelected () {
      this.runCurrent = this.runTextByDigest({ ModelDigest: this.digest, RunDigest: this.runDigestSelected })
    }
  },

  methods: {
    isSuccess (status) { return status === Mdf.RUN_SUCCESS },
    isInProgress (status) { return status === Mdf.RUN_IN_PROGRESS || status === Mdf.RUN_INITIAL },
    dateTimeStr (dt) { return Mdf.dtStr(dt) },

    // update page view
    doRefresh () {
      this.runTreeData = this.makeRunTreeData(this.runTextList)
      this.runCurrent = this.runTextByDigest({ ModelDigest: this.digest, RunDigest: this.runDigestSelected })
    },

    // expand or collapse all run tree nodes
    doToogleExpandRunTree () {
      if (this.isRunTreeCollapsed) {
        this.$refs.runTree.expandAll()
      } else {
        this.$refs.runTree.collapseAll()
      }
      this.isRunTreeCollapsed = !this.isRunTreeCollapsed
    },
    // filter run tree nodes by name (label), update date-time or description
    doRunTreeFilter (node, filter) {
      const flt = filter.toLowerCase()
      return (node.label && node.label.toLowerCase().indexOf(flt) > -1) ||
        ((node.lastTime || '') !== '' && node.lastTime.indexOf(flt) > -1) ||
        ((node.descr || '') !== '' && node.descr.toLowerCase().indexOf(flt) > -1)
    },
    // clear run tree filter value
    resetRunFilter () {
      this.runFilter = ''
      this.$refs.runFilterInput.focus()
    },
    // click on run: select this run as current run
    onRunLeafClick (dgst) {
      this.$emit('run-select', dgst)
    },
    // show run notes dialog
    doShowRunNote (dgst) {
      this.runInfoDigest = dgst
      this.runInfoTickle = !this.runInfoTickle
    },
    // click on run log: show run log page
    doRunLogClick (stamp) {
      // if run stamp is empty then log is not available
      if (!stamp) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to show run log: run stamp is empty') })
        return
      }
      this.$emit('run-log-select', stamp)
    },

    // show or hide parameters tree
    onToogleShowParamTree () {
      this.isParamTreeShow = !this.isParamTreeShow
      if (this.isParamTreeShow) this.isTableTreeShow = false
    },
    // click on parameter: open current run parameter values tab
    onParamLeafClick (key, name) {
      this.$emit('run-parameter-select', name)
    },
    // show run parameter notes dialog
    doShowParamNote (key, name) {
      this.paramInfoName = name
      this.paramInfoTickle = !this.paramInfoTickle
    },
    // show group notes dialog
    doShowGroupNote (key, name) {
      this.groupInfoName = name
      this.groupInfoTickle = !this.groupInfoTickle
    },

    // show or hide output tables tree
    onToogleShowTableTree () {
      this.isTableTreeShow = !this.isTableTreeShow
      if (this.isTableTreeShow) this.isParamTreeShow = false
    },
    // click on output table: open current run output table values tab
    onTableLeafClick (key, name) {
      this.$emit('table-select', name)
    },
    // show run output table notes dialog
    doShowTableNote (key, name) {
      this.tableInfoName = name
      this.tableInfoTickle = !this.tableInfoTickle
    },

    // return tree of model runs
    makeRunTreeData (rLst) {
      this.isAnyRunGroup = false
      this.runFilter = ''

      if (!Mdf.isLength(rLst)) return [] // empty run list
      if (!Mdf.isRunTextList(rLst)) {
        this.$q.notify({ type: 'negative', message: this.$t('Model run list is empty or invalid') })
        return [] // invalid run list
      }

      // add runs which are not included in any group
      const td = []

      for (const r of rLst) {
        td.push({
          key: 'rtl-' + r.RunDigest + '-' + this.nextId++,
          digest: r.RunDigest,
          label: r.Name,
          stamp: r.RunStamp,
          status: r.Status,
          lastTime: Mdf.dtStr(r.UpdateDateTime),
          descr: Mdf.descrOfTxt(r),
          children: [],
          disabled: false
        })
      }
      return td
    }
  },

  mounted () {
    this.doRefresh()
    this.$emit('tab-mounted', 'run-list', { digest: this.digest })
  }
}
