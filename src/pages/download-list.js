import { mapState, mapGetters, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'
import ModelBar from 'components/ModelBar.vue'
import RunBar from 'components/RunBar.vue'
import WorksetBar from 'components/WorksetBar.vue'
import ModelInfoDialog from 'components/ModelInfoDialog.vue'
import RunInfoDialog from 'components/RunInfoDialog.vue'
import WorksetInfoDialog from 'components/WorksetInfoDialog.vue'
import DeleteConfirmDialog from 'components/DeleteConfirmDialog.vue'
import { openURL } from 'quasar'

/* eslint-disable no-multi-spaces */
const LOG_REFRESH_TIME = 1000               // msec, log files refresh interval
const MAX_LOG_SEND_COUNT = 4                // max request to send without response
const MAX_LOG_NO_DATA_COUNT = 5             // pause log refresh if no new data or empty response exceed this count (5 = 5 seconds)
const MAX_LOG_RECENT_COUNT = 149            // pause log refresh if "recent" progess and no new data exceed this count
const MAX_LOG_WAIT_PROGRESS_COUNT = 20 * 60 // "recent" progress threshold (20 * 60 = 20 minutes)
/* eslint-enable no-multi-spaces */

export default {
  name: 'DownloadList',
  components: { ModelBar, RunBar, WorksetBar, ModelInfoDialog, RunInfoDialog, WorksetInfoDialog, DeleteConfirmDialog },

  props: {
    digest: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      downloadLst: [],
      folderSelected: '',
      totalLogCount: 0,
      readyLogCount: 0,
      progressLogCount: 0,
      errorLogCount: 0,
      loadWait: false,
      isLogRefreshPaused: false,
      lastLogDt: 0,
      logRefreshInt: '',
      logRefreshCount: 0,
      logSendCount: 0,
      logNoDataCount: 0,
      logAllKey: '',
      refreshFolderTreeTickle: false,
      modelInfoTickle: false,
      modelInfoDigest: '',
      runInfoTickle: false,
      runInfoDigest: '',
      worksetInfoTickle: false,
      worksetInfoName: '',
      showDeleteDialogTickle: false,
      folderToDelete: '',
      folderTreeData: [],
      isAnyFolderDir: false,
      folderTreeFilter: '',
      isFolderTreeExpanded: false,
      fastDownload: 'no'
    }
  },

  computed: {
    lastLogTimeStamp () {
      return this.lastLogDt ? Mdf.dtToTimeStamp(new Date(this.lastLogDt)) : ''
    },

    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest'
    }),
    ...mapState('uiState', {
      noAccDownload: state => state.noAccDownload
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl,
      serverConfig: state => state.config
    })
  },

  watch: {
    refreshTickle () { this.initView() },
    digest () { this.initView() },
    fastDownload (val) {
      this.dispatchNoAccDownload(val === 'yes')
    }
  },

  methods: {
    isReady (status) { return status === 'ready' },
    isProgress (status) { return status === 'progress' },
    isError (status) { return status === 'error' },
    isModelKind (kind) { return kind === 'model' },
    isRunKind (kind) { return kind === 'run' },
    isWorksetKind (kind) { return kind === 'workset' },
    isDeleteKind (kind) { return kind === 'delete' },
    isUnkownKind (kind) { return kind !== 'model' && kind !== 'run' && kind !== 'workset' && kind !== 'delete' },
    fileTimeStamp (t) {
      if (!t || t <= 0) return ''

      const dt = new Date()
      dt.setTime(t)
      return Mdf.dtToTimeStamp(dt)
    },
    fileSizeStr (size) {
      const fs = Mdf.fileSizeParts(size)
      return fs.val + ' ' + this.$t(fs.name)
    },

    // show model notes dialog
    doShowModelNote (modelDgst) {
      this.modelInfoDigest = modelDgst
      this.modelInfoTickle = !this.modelInfoTickle
    },
    // show run notes dialog
    doShowRunNote (modelDgst, runDgst) {
      this.modelInfoDigest = modelDgst
      this.runInfoDigest = runDgst
      this.runInfoTickle = !this.runInfoTickle
    },
    // show current workset notes dialog
    doShowWorksetNote (modelDgst, name) {
      this.modelInfoDigest = modelDgst
      this.worksetInfoName = name
      this.worksetInfoTickle = !this.worksetInfoTickle
    },

    // refersh log files list
    onLogRefresh () {
      if (this.isLogRefreshPaused) return
      //
      if (this.logSendCount++ < MAX_LOG_SEND_COUNT) {
        this.doLogListRefresh()

        // refresh files list in selected folder
        if ((this.folderSelected || '') !== '') {
          const st = this.statusByFolder(this.folderSelected)
          if (this.isProgress(st)) this.doFolderFilesRefresh(this.folderSelected)
        }
      }
      this.logRefreshCount++
    },
    // return downlod status by folder
    statusByFolder (folder) {
      const n = this.downloadLst.findIndex((dl) => dl.Folder === folder)
      return n >= 0 ? this.downloadLst[n].Status : ''
    },

    // show or hide folder tree
    onFolderTreeClick (folder) {
      if (!folder) return

      if (folder === this.folderSelected) { // collapse: this folder is now open
        this.folderSelected = ''
      } else {
        this.folderSelected = folder
        this.doFolderFilesRefresh(this.folderSelected)
        this.isFolderTreeExpanded = false
      }
    },
    // expand or collapse all folder tree nodes
    doToogleExpandFolderTree () {
      if (this.isFolderTreeExpanded) {
        this.$refs.folderTree[0].collapseAll()
      } else {
        this.$refs.folderTree[0].expandAll()
      }
      this.isFolderTreeExpanded = !this.isFolderTreeExpanded
    },
    // filter folder tree nodes by name (label) or description
    doFolderTreeFilter (node, filter) {
      const flt = filter.toLowerCase()
      return (node.label && node.label.toLowerCase().indexOf(flt) > -1) ||
        ((node.descr || '') !== '' && node.descr.toLowerCase().indexOf(flt) > -1)
    },
    // clear folder tree filter value
    resetFolderFilter () {
      this.folderTreeFilter = ''
      this.$refs.folderTreeFilterInput[0].focus()
    },
    // open download url
    onFolderLeafClick (name, path) {
      openURL(path)
    },

    // delete download results by folder name
    onDeleteClick (folder) {
      this.folderToDelete = folder
      this.showDeleteDialogTickle = !this.showDeleteDialogTickle
    },
    // delete download results by folder name
    onYesDownloadDelete (folder) {
      this.doDeleteDownload(folder)
      this.logRefreshPauseToggle()
      this.isLogRefreshPaused = false
    },

    // update page view
    initView () {
      if (!this.serverConfig.AllowDownload) {
        this.$q.notify({ type: 'negative', message: this.$t('Downloads are not allowed') })
        return
      }

      this.downloadLst = []
      this.folderSelected = ''
      this.folderTreeData = []
      this.isAnyFolderDir = false
      this.folderTreeFilter = ''
      this.fastDownload = this.noAccDownload ? 'yes' : 'no'
      this.stopLogRefresh()
      this.startLogRefresh()
    },

    // pause on/off log files refresh
    logRefreshPauseToggle () {
      this.logRefreshCount = 0
      this.logSendCount = 0
      this.logNoDataCount = 0
      this.isLogRefreshPaused = !this.isLogRefreshPaused
    },
    startLogRefresh () {
      this.isLogRefreshPaused = false
      this.logRefreshCount = 0
      this.logSendCount = 0
      this.logNoDataCount = 0
      this.lastLogDt = Date.now() - (LOG_REFRESH_TIME + 2)
      this.logRefreshInt = setInterval(this.onLogRefresh, LOG_REFRESH_TIME)
    },
    stopLogRefresh () {
      this.logRefreshCount = 0
      clearInterval(this.logRefreshInt)
    },

    // retrive list of download log files by model digest
    async doLogListRefresh () {
      this.logSendCount = 0
      const now = Date.now()
      if (now - this.lastLogDt < LOG_REFRESH_TIME) return // protect from timeouts storm
      this.lastLogDt = now

      this.loadWait = true
      let isOk = false
      let dLst = []
      const u = this.omsUrl +
        ((this.digest && this.digest !== Mdf.allModelsDownloadLog)
          ? '/api/download/log/model/' + this.digest
          : '/api/download/log/all')
      try {
        const response = await this.$axios.get(u)
        dLst = response.data
        isOk = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or download log files retrive failed.', em)
      }
      this.loadWait = false

      if (!isOk || !dLst || !Array.isArray(dLst) || !Mdf.isDownloadLogList(dLst)) {
        if (this.logNoDataCount++ > MAX_LOG_NO_DATA_COUNT) this.isLogRefreshPaused = true // pause refresh on errors
        return
      }
      if (dLst.length <= 0) {
        if (this.logNoDataCount++ > MAX_LOG_NO_DATA_COUNT) this.isLogRefreshPaused = true // pause refresh if no log files exist
      }

      // check if any changes in log files and update status counts
      let logKey = ''
      let nReady = 0
      let nProgress = 0
      let nError = 0
      let maxTime = 0

      for (let k = 0; k < dLst.length; k++) {
        logKey = logKey + '|' + dLst[k].LogFileName + ':' + dLst[k].LogModTime.toString() + ':' + dLst[k].FolderModTime.toString() + ':' + dLst[k].ZipModTime.toString()

        switch (dLst[k].Status) {
          case 'ready':
            nReady++
            break
          case 'progress':
            nProgress++
            if (dLst[k].LogModTime > maxTime) maxTime = dLst[k].LogModTime
            if (dLst[k].FolderModTime > maxTime) maxTime = dLst[k].FolderModTime
            if (dLst[k].ZipModTime > maxTime) maxTime = dLst[k].ZipModTime
            break
          case 'error':
            nError++
            break
        }
      }

      // pause refresh if no changes in log files, folders and zip files
      // wait longer if there is a "recent" progress
      const isRecent = nProgress > 0 && (Date.now() - maxTime < 1000 * MAX_LOG_WAIT_PROGRESS_COUNT)

      if (this.logAllKey === logKey) {
        this.isLogRefreshPaused = this.logNoDataCount++ > (!isRecent ? MAX_LOG_NO_DATA_COUNT : MAX_LOG_RECENT_COUNT)
      } else {
        this.logNoDataCount = 0 // new data found
      }

      // notify on completed downloads and copy log file show / hide status
      for (let k = 0; k < dLst.length; k++) {
        dLst[k].isShowLog = false
        const n = this.downloadLst.findIndex((dl) => dl.Folder === dLst[k].Folder)
        if (n < 0) continue

        if (this.isProgress(this.downloadLst[n].Status) && (this.isModelKind(dLst[k].Kind) || this.isRunKind(dLst[k].Kind) || this.isWorksetKind(dLst[k].Kind))) {
          if (this.isReady(dLst[k].Status)) this.$q.notify({ type: 'info', message: this.$t('Download completed') + (dLst[k].Folder ? (': ' + dLst[k].Folder) : '') })
          if (this.isError(dLst[k].Status)) this.$q.notify({ type: 'negative', message: this.$t('Download error') + (dLst[k].Folder ? (': ' + dLst[k].Folder) : '') })
        }
        dLst[k].isShowLog = this.downloadLst[n].isShowLog
      }

      // replace download log list
      this.downloadLst = dLst

      this.logAllKey = logKey
      this.readyLogCount = nReady
      this.progressLogCount = nProgress
      this.errorLogCount = nError
      this.totalLogCount = this.downloadLst.length
    },

    // retrive list of files in download folder
    async doFolderFilesRefresh (folder) {
      if (!folder) {
        return // exit on empty folder
      }
      this.loadWait = true
      let isOk = false
      let fLst = []

      const u = this.omsUrl + '/api/download/file-tree/' + (folder || '')
      try {
        const response = await this.$axios.get(u)
        fLst = response.data
        isOk = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or download file tree retrive failed.', em)
      }
      this.loadWait = false

      if (!isOk || !fLst || !Array.isArray(fLst) || fLst.length <= 0 || !Mdf.isDownloadFileTree(fLst)) {
        return
      }

      // update folder files tree
      const td = this.makeFolderTreeData(fLst)
      this.isAnyFolderDir = td.isAnyDir
      this.folderTreeData = Object.freeze(td.tree)
    },

    // return tree of model parameters
    makeFolderTreeData (fLst) {
      if (!fLst || !Array.isArray(fLst) || fLst.length <= 0) { // empty file list
        return { isAnyDir: false, tree: [] }
      }

      // make files (and folders) map: map file path to folder name and item name (file name or sub-folder name)
      const fPath = {}
      let isAnyDir = false

      for (let k = 0; k < fLst.length; k++) {
        if (!fLst[k].Path || fLst[k].Path === '.' || fLst[k].Path === '..') continue

        isAnyDir = isAnyDir || fLst[k].IsDir

        // if root folder
        if (fLst[k].Path === '/') {
          fPath[fLst[k].Path] = { base: '', name: '/', label: '/' }
          continue
        }

        // remove trailing / from path
        if (fLst[k].Path.endsWith('/')) fLst[k].Path = fLst[k].Path.substr(0, fLst[k].Path.length - 1)

        // split path to the base folder and name, use name without leading / as label
        const n = fLst[k].Path.lastIndexOf('/')

        fPath[fLst[k].Path] = {
          base: n >= 0 ? fLst[k].Path.substr(0, n) : '',
          name: n >= 0 ? fLst[k].Path.substr(n) : fLst[k].Path,
          label: n >= 0 ? fLst[k].Path.substr(n + 1) : fLst[k].Path
        }
      }

      // add top level folders and files as starting point into the tree
      const fTree = []
      const fProc = []
      const fDone = {}
      const fTopFiles = []

      for (const fi of fLst) {
        if (!fi.Path || fi.Path === '.' || fi.Path === '..') continue

        if (fPath[fi.Path].base !== '') continue // not a top level folder or file

        // make tree node
        const fn = {
          key: 'fi-' + fi.Path + '-' + (fi.ModTime || 0).toString(),
          Path: fi.Path,
          label: fPath[fi.Path].label,
          descr: this.fileTimeStamp(fi.ModTime) + (!fi.IsDir ? ' : ' + this.fileSizeStr(fi.Size) : ''),
          children: [],
          isGroup: fi.IsDir
        }
        fDone[fi.Path] = fn

        // if this is top level folder then add it to list of root folders
        if (fi.IsDir) {
          fTree.push(fn)
          fProc.push(fn)
        } else { // this is top level file
          fTopFiles.push(fn)
        }
      }

      // build folders and files tree
      while (fProc.length > 0) {
        const fNow = fProc.pop()

        // make all children of current item
        for (const fi of fLst) {
          if (!fi.Path || fi.Path === '.' || fi.Path === '..') continue
          if (fDone[fi.Path]) continue

          if (fPath[fi.Path].base !== fNow.Path) continue

          const fn = {
            key: 'fi-' + fi.Path + '-' + (fi.ModTime || 0).toString(),
            Path: fi.Path,
            label: fPath[fi.Path].label,
            descr: this.fileTimeStamp(fi.ModTime) + (!fi.IsDir ? ' : ' + this.fileSizeStr(fi.Size) : ''),
            children: [],
            isGroup: fi.IsDir
          }
          fNow.children.push(fn)
          fDone[fi.Path] = fn

          if (fi.IsDir) fProc.push(fn)
        }
      }

      // update description
      for (const p in fDone) {
        const fn = fDone[p]
        if (fn.isGroup) fn.descr = fn.descr + ' : ' + (fn.children.length || 0).toString() + ' ' + this.$t('file(s)')
      }

      // push top level files after top level folders
      fTree.push(...fTopFiles)

      return { isAnyDir: isAnyDir, tree: fTree }
    },

    // delete download by folder name
    async doDeleteDownload (folder) {
      if (!folder) {
        console.warn('Unable to delete: invalid (empty) folder name')
        return
      }
      this.$q.notify({ type: 'info', message: this.$t('Deleting') + ': ' + folder })

      this.loadWait = true
      let isOk = false

      const u = this.omsUrl + '/api/download/delete/' + (folder || '')
      try {
        // send download request to the server, response expected to be empty on success
        await this.$axios.delete(u)
        isOk = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Error at delete of:', folder, em)
      }
      this.loadWait = false

      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to delete') + ': ' + folder })
        return
      }

      this.$q.notify({ type: 'info', message: this.$t('Deleted') + ': ' + folder })
    },

    ...mapActions('uiState', {
      dispatchNoAccDownload: 'noAccDownload'
    })
  },

  mounted () {
    this.initView()
    this.$emit('tab-mounted', 'download-list', { digest: this.digest })
  },
  beforeDestroy () {
    this.stopLogRefresh()
  }
}
