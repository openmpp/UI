import { mapState, mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'
import WorksetParameterList from 'components/WorksetParameterList.vue'
import WorksetInfoDialog from 'components/WorksetInfoDialog.vue'
import ParameterInfoDialog from 'components/ParameterInfoDialog.vue'
import GroupInfoDialog from 'components/GroupInfoDialog.vue'
import DeleteWorkset from 'components/DeleteWorkset.vue'
import DeleteConfirmDialog from 'components/DeleteConfirmDialog.vue'

export default {
  name: 'WorksetList',
  components: {
    WorksetParameterList,
    WorksetInfoDialog,
    ParameterInfoDialog,
    GroupInfoDialog,
    DeleteWorkset,
    DeleteConfirmDialog
  },

  props: {
    digest: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      loadWait: false,
      worksetCurrent: Mdf.emptyWorksetText(), // currently selected workset
      isTreeCollapsed: false,
      isAnyGroup: false,
      treeData: [],
      treeFilter: '',
      isParamTreeShow: false,
      paramTreeCount: 0,
      worksetInfoTickle: false,
      worksetInfoName: '',
      groupInfoTickle: false,
      groupInfoName: '',
      paramInfoTickle: false,
      paramInfoName: '',
      nextId: 100,
      worksetNameToDelete: ',',
      showDeleteDialogTickle: false,
      worksetDeleteName: '',
      deleteWorksetNow: false,
      loadWorksetDelete: false,
      uploadFileSelect: false,
      uploadFile: null
    }
  },

  computed: {
    isNotEmptyWorksetCurrent () { return Mdf.isNotEmptyWorksetText(this.worksetCurrent) },
    descrWorksetCurrent () { return Mdf.descrOfTxt(this.worksetCurrent) },
    isReadonlyWorksetCurrent () { return Mdf.isNotEmptyWorksetText(this.worksetCurrent) && this.worksetCurrent.IsReadonly },
    fileSelected () { return !(this.uploadFile === null) },

    ...mapState('model', {
      theModel: state => state.theModel,
      worksetTextList: state => state.worksetTextList,
      worksetTextListUpdated: state => state.worksetTextListUpdated
    }),
    ...mapGetters('model', {
      worksetTextByName: 'worksetTextByName'
    }),
    ...mapState('uiState', {
      worksetNameSelected: state => state.worksetNameSelected
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl,
      serverConfig: state => state.config
    })
  },

  watch: {
    digest () { this.doRefresh() },
    refreshTickle () { this.doRefresh() },
    worksetTextListUpdated () { this.doRefresh() },
    worksetNameSelected () { this.worksetCurrent = this.worksetTextByName({ ModelDigest: this.digest, Name: this.worksetNameSelected }) }
  },

  methods: {
    dateTimeStr (dt) { return Mdf.dtStr(dt) },

    // update page view
    doRefresh () {
      this.treeData = this.makeWorksetTreeData(this.worksetTextList)
      this.worksetCurrent = this.worksetTextByName({ ModelDigest: this.digest, Name: this.worksetNameSelected })
      this.paramTreeCount = Mdf.worksetParamCount(this.worksetCurrent)
    },

    // click on workset: select this workset as current workset
    onWorksetLeafClick (name) {
      if (this.worksetNameSelected !== name) this.$emit('set-select', name)
    },
    // expand or collapse all workset tree nodes
    doToogleExpandTree () {
      if (this.isTreeCollapsed) {
        this.$refs.worksetTree.expandAll()
      } else {
        this.$refs.worksetTree.collapseAll()
      }
      this.isTreeCollapsed = !this.isTreeCollapsed
    },
    // filter workset tree nodes by name (label), update date-time or description
    doTreeFilter (node, filter) {
      const flt = filter.toLowerCase()
      return (node.label && node.label.toLowerCase().indexOf(flt) > -1) ||
        ((node.lastTime || '') !== '' && node.lastTime.indexOf(flt) > -1) ||
        ((node.descr || '') !== '' && node.descr.toLowerCase().indexOf(flt) > -1)
    },
    // clear workset tree filter value
    resetFilter () {
      this.treeFilter = ''
      this.$refs.filterInput.focus()
    },
    // show workset notes dialog
    doShowWorksetNote (name) {
      this.worksetInfoName = name
      this.worksetInfoTickle = !this.worksetInfoTickle
    },
    // parameters tree updated and leafs counted
    onParamTreeUpdated (cnt) {
      this.paramTreeCount = cnt || 0
    },

    // open create new workset page
    onCreateNewWorkset () {
      this.$emit('new-set-select')
    },
    // open workset edit page
    onEditWorkset (name) {
      this.$emit('set-edit-select', name)
    },
    // new model run using current workset name: open model run tab
    onNewRunClick (name) {
      this.$emit('new-run-select', (this.worksetNameSelected !== name ? name : ''))
    },
    // toggle current workset readonly status: pass event from child up to the next level
    onWorksetReadonlyToggle () {
      this.$emit('set-update-readonly', this.digest, this.worksetNameSelected, !this.worksetCurrent.IsReadonly)
    },

    // show yes/no dialog to confirm workset delete
    onDeleteWorkset (name) {
      this.worksetNameToDelete = name
      this.showDeleteDialogTickle = !this.showDeleteDialogTickle
    },
    // user answer yes to confirm delete model workset
    onYesDeleteWorkset (name) {
      this.worksetDeleteName = name
      this.deleteWorksetNow = true
    },
    // workset delete request completed
    doneDeleteWorkset (isSuccess, dgst, name) {
      this.worksetDeleteName = ''
      this.deleteWorksetNow = false
      this.loadWorksetDelete = false
      //
      // if success and if the same model then refresh workset list from the server
      if (isSuccess && dgst && name && dgst === this.digest) {
        this.$emit('set-list-refresh')
      }
    },

    // click on  workset download: start workset download and show download list page
    onDownloadWorkset (name) {
      // if name is empty or workset is not read-only then do not show rn download page
      if (!name) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to download input scenario, it is not a read-only') })
        return
      }
      const wt = this.worksetTextByName({ ModelDigest: this.digest, Name: name })
      if (!wt || !wt.IsReadonly) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to download input scenario, it is not a read-only') })
        return
      }

      this.startWorksetDownload(name) // start workset download and show download page on success
    },

    // show or hide parameters tree
    onToogleShowParamTree () {
      this.isParamTreeShow = !this.isParamTreeShow
    },
    // click on parameter: open current workset parameter values tab
    onWorksetParamClick (name) {
      this.$emit('set-parameter-select', name)
    },
    // show workset parameter notes dialog
    doShowParamNote (name) {
      this.paramInfoName = name
      this.paramInfoTickle = !this.paramInfoTickle
    },
    // show run parameter notes dialog
    doShowParamRunNote (name) {
      this.paramInfoName = name
      this.paramRunInfoTickle = !this.paramRunInfoTickle
    },
    // show group notes dialog
    doShowGroupNote (name) {
      this.groupInfoName = name
      this.groupInfoTickle = !this.groupInfoTickle
    },

    /*
    // show input scenario upload dialog
    doShowFileSelect () {
      this.uploadFileSelect = true
    },
    // hides input scenario upload dialog
    doCancelFileSelect () {
      this.uploadFileSelect = false
      this.uploadFile = null
    },
    onUploadInputScenario () {},
    onUploadReplaceInputScenario () {},
    */

    // return tree of model worksets
    makeWorksetTreeData (wLst) {
      this.isAnyGroup = false
      this.treeFilter = ''

      if (!Mdf.isLength(wLst)) return [] // empty workset list
      if (!Mdf.isWorksetTextList(wLst)) {
        this.$q.notify({ type: 'negative', message: this.$t('Input scenarios list is empty or invalid') })
        return [] // invalid workset list
      }

      // add worksets which are not included in any group
      const td = []

      for (const wt of wLst) {
        td.push({
          key: 'wtl-' + wt.Name + '-' + this.nextId++,
          label: wt.Name,
          isReadonly: wt.IsReadonly,
          lastTime: Mdf.dtStr(wt.UpdateDateTime),
          descr: Mdf.descrOfTxt(wt),
          children: [],
          disabled: false
        })
      }
      return td
    },

    // start workset download
    async startWorksetDownload (name) {
      let isOk = false
      let msg = ''

      const u = this.omsUrl + '/api/download/model/' + this.digest + '/workset/' + (name || '')
      try {
        // send download request to the server, response expected to be empty on success
        await this.$axios.post(u)
        isOk = true
      } catch (e) {
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Unable to download model workset', msg)
      }
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to download input scenario') + (msg ? (': ' + msg) : '') })
        return
      }

      this.$emit('download-select', this.digest) // download started: show download list page
      this.$q.notify({ type: 'info', message: this.$t('Input scenario download started') })
    }
  },

  mounted () {
    this.doRefresh()
    this.$emit('tab-mounted', 'set-list', { digest: this.digest })
  }
}
