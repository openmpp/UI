import { mapState, mapGetters, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'
import ModelBar from 'components/ModelBar.vue'
import RunBar from 'components/RunBar.vue'
import WorksetBar from 'components/WorksetBar.vue'
import ModelInfoDialog from 'components/ModelInfoDialog.vue'
import RunInfoDialog from 'components/RunInfoDialog.vue'
import WorksetInfoDialog from 'components/WorksetInfoDialog.vue'
import RefreshWorksetList from 'components/RefreshWorksetList.vue'
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
  name: 'UpDownList',
  components: { ModelBar, RunBar, WorksetBar, ModelInfoDialog, RunInfoDialog, WorksetInfoDialog, RefreshWorksetList, DeleteConfirmDialog },

  props: {
    digest: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      upDownStatusLst: [],
      downStatusLst: [],
      upStatusLst: [],
      downloadExpand: false,
      uploadExpand: false,
      folderSelected: '',
      upDownSelected: '',
      totalDownCount: 0,
      readyDownCount: 0,
      progressDownCount: 0,
      errorDownCount: 0,
      totalUpCount: 0,
      readyUpCount: 0,
      progressUpCount: 0,
      errorUpCount: 0,
      loadWait: false,
      loadWsListWait: false,
      refreshWsListTickle: false,
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
      upDownToDelete: '',
      folderTreeData: [],
      isAnyFolderDir: false,
      folderTreeFilter: '',
      isFolderTreeExpanded: false,
      fastDownload: 'yes'
    }
  },

  computed: {
    lastLogTimeStamp () {
      return this.lastLogDt ? Mdf.dtToTimeStamp(new Date(this.lastLogDt)) : ''
    },
    isDownloadEnabled () { return this.serverConfig.AllowDownload },
    isUploadEnabled () { return this.serverConfig.AllowUpload },
    uploadUrl () {
      return (this.serverConfig.AllowUpload && this.digest)
        ? this.omsUrl + '/api/upload/model/' + encodeURIComponent(this.digest) + '/workset'
        : ''
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
    isUploadKind (kind) { return kind === 'upload' },
    isAnyDownloadKind (kind) { return kind === 'model' || kind === 'run' || kind === 'workset' },
    isUnkownKind (kind) { return kind !== 'model' && kind !== 'run' && kind !== 'workset' && kind !== 'delete' && kind !== 'upload' },
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
        if ((this.folderSelected || '') !== '' && (this.upDownSelected || '') !== '') {
          const st = this.statusByUpDownFolder(this.folderSelected, this.upDownSelected)
          if (this.isProgress(st)) this.doFolderFilesRefresh(this.upDownSelected, this.folderSelected)
        }
      }
      this.logRefreshCount++
    },
    // return status by folder
    statusByUpDownFolder (folder, upDown) {
      if (upDown === 'up') {
        const n = this.upStatusLst.findIndex((uds) => uds.Folder === folder)
        return n >= 0 ? this.upStatusLst[n].Status : ''
      }
      // else find in download
      const n = this.downStatusLst.findIndex((uds) => uds.Folder === folder)
      return n >= 0 ? this.downStatusLst[n].Status : ''
    },

    // show or hide folder tree
    onFolderTreeClick (upDown, folder) {
      if (!folder || (upDown !== 'up' && upDown !== 'down')) return

      if (folder === this.folderSelected && upDown === this.upDownSelected) { // collapse: this folder is now open
        this.folderSelected = ''
        this.upDownSelected = ''
      } else {
        this.folderSelected = folder
        this.upDownSelected = upDown
        this.doFolderFilesRefresh(upDown, this.folderSelected)
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
    // open file download url
    onFolderLeafClick (name, path) {
      openURL(path)
    },

    // delete download or upload results by folder name
    onDeleteClick (upDown, folder) {
      this.folderToDelete = folder
      this.upDownToDelete = upDown
      this.showDeleteDialogTickle = !this.showDeleteDialogTickle
    },
    // delete download or upload results by folder name
    onYesUpDownDelete (folder, itemId, upDown) {
      this.doDeleteUpDown(upDown, folder)
      this.logRefreshPauseToggle()
      this.isLogRefreshPaused = false
    },

    // started workset file upload
    onStartUpload (info) {
      const fn = (info && Array.isArray(info?.files) && info?.files.length > 0) ? (info?.files[0]?.name || '') : ''
      this.$q.notify({
        type: 'info', message: this.$t('Upload scenario') + (fn ? ': ' + fn : '') + '\u2026'
      })
      this.uploadExpand = true
      this.downloadExpand = false
    },
    // succees of workset file upload
    onDoneUpload (info) {
      const fn = (info && Array.isArray(info?.files) && info?.files.length > 0) ? (info?.files[0]?.name || '') : ''
      this.$q.notify({
        type: 'info',
        message: this.$t('Import scenario') + (fn ? ': ' + fn : '') + '\u2026'
      })
      // refresh list of uploads
      this.logRefreshPauseToggle()
      this.isLogRefreshPaused = false
      this.uploadExpand = true
      this.downloadExpand = false
    },
    // failed workset file upload
    onFailUpload (info) {
      this.$q.notify({
        type: 'negative',
        message: this.$t('Scenario upload failed') + ((info?.xhr?.responseText && info?.xhr?.responseText) ? ': ' + info?.xhr.responseText : '')
      })
      // refresh list of uploads
      this.logRefreshPauseToggle()
      this.isLogRefreshPaused = false
      this.uploadExpand = true
      this.downloadExpand = false
    },

    // update page view
    initView () {
      if (!this.serverConfig.AllowDownload && !this.serverConfig.AllowUpload) {
        this.$q.notify({ type: 'negative', message: this.$t('Downloads and uploads are not allowed') })
        this.downloadExpand = false
        this.uploadExpand = false
        return
      }
      this.uploadExpand = !this.serverConfig.AllowDownload && this.serverConfig.AllowUpload
      this.downloadExpand = !this.uploadExpand

      this.upDownStatusLst = []
      this.downStatusLst = []
      this.upStatusLst = []
      this.folderSelected = ''
      this.upDownSelected = ''
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

    // retrive list of download and upload log files by model digest
    async doLogListRefresh () {
      this.logSendCount = 0
      const now = Date.now()
      if (now - this.lastLogDt < LOG_REFRESH_TIME) return // protect from timeouts storm
      this.lastLogDt = now

      this.loadWait = true
      let isOk = false
      let dR = []
      let uR = []

      if (this.serverConfig.AllowDownload) { // retrive download status
        const u = this.omsUrl +
          ((this.digest && this.digest !== Mdf.allModelsDownloadLog)
            ? '/api/download/log/model/' + encodeURIComponent(this.digest)
            : '/api/download/log/all')
        try {
          const response = await this.$axios.get(u)
          dR = response.data
          isOk = true
        } catch (e) {
          let em = ''
          try {
            if (e.response) em = e.response.data || ''
          } finally {}
          console.warn('Server offline or download log files retrive failed.', em)
        }
      }
      if (this.serverConfig.AllowUpload) { // retrive upload status
        const u = this.omsUrl +
          ((this.digest && this.digest !== Mdf.allModelsUploadLog)
            ? '/api/upload/log/model/' + encodeURIComponent(this.digest)
            : '/api/upload/log/all')
        try {
          const response = await this.$axios.get(u)
          uR = response.data
          isOk = true
        } catch (e) {
          let em = ''
          try {
            if (e.response) em = e.response.data || ''
          } finally {}
          console.warn('Server offline or upload log files retrive failed.', em)
        }
      }
      const udLst = [].concat(dR, uR)

      this.loadWait = false

      if (!isOk || !udLst || !Array.isArray(udLst) || !Mdf.isUpDownLogList(udLst)) {
        if (this.logNoDataCount++ > MAX_LOG_NO_DATA_COUNT) this.isLogRefreshPaused = true // pause refresh on errors
        return
      }
      if (udLst.length <= 0) {
        if (this.logNoDataCount++ > MAX_LOG_NO_DATA_COUNT) this.isLogRefreshPaused = true // pause refresh if no log files exist
      }

      // check if any changes in log files and update status counts
      let logKey = ''
      let nDownReady = 0
      let nDownProgress = 0
      let nDownError = 0
      let nUpReady = 0
      let nUpProgress = 0
      let nUpError = 0
      let maxTime = 0

      for (let k = 0; k < udLst.length; k++) {
        logKey = logKey + '|' + udLst[k].LogFileName + ':' + udLst[k].LogModTime.toString() + ':' + udLst[k].FolderModTime.toString() + ':' + udLst[k].ZipModTime.toString()

        switch (udLst[k].Status) {
          case 'ready':
            if (this.isAnyDownloadKind(udLst[k].Kind)) nDownReady++
            if (this.isUploadKind(udLst[k].Kind)) nUpReady++
            break

          case 'progress':
            if (this.isAnyDownloadKind(udLst[k].Kind)) nDownProgress++
            if (this.isUploadKind(udLst[k].Kind)) nUpProgress++

            if (udLst[k].LogModTime > maxTime) maxTime = udLst[k].LogModTime
            if (udLst[k].FolderModTime > maxTime) maxTime = udLst[k].FolderModTime
            if (udLst[k].ZipModTime > maxTime) maxTime = udLst[k].ZipModTime
            break

          case 'error':
            if (this.isAnyDownloadKind(udLst[k].Kind)) nDownError++
            if (this.isUploadKind(udLst[k].Kind)) nUpError++
            break
        }
      }

      // pause refresh if no changes in log files, folders and zip files
      // wait longer if there is a "recent" progress
      const isRecent = (nDownProgress > 0 || nUpProgress > 0) && (Date.now() - maxTime < 1000 * MAX_LOG_WAIT_PROGRESS_COUNT)

      if (this.logAllKey === logKey) {
        this.isLogRefreshPaused = this.logNoDataCount++ > (!isRecent ? MAX_LOG_NO_DATA_COUNT : MAX_LOG_RECENT_COUNT)
      } else {
        this.logNoDataCount = 0 // new data found
      }

      // notify on completed downloads or uploads and copy log file show / hide status
      for (let k = 0; k < udLst.length; k++) {
        udLst[k].isShowLog = false
        const n = this.upDownStatusLst.findIndex((st) => st.Folder === udLst[k].Folder)
        if (n < 0) continue

        if (this.isProgress(this.upDownStatusLst[n].Status) && (this.isAnyDownloadKind(udLst[k].Kind))) {
          if (this.isReady(udLst[k].Status)) this.$q.notify({ type: 'info', message: this.$t('Download completed') + (udLst[k].Folder ? (': ' + udLst[k].Folder) : '') })
          if (this.isError(udLst[k].Status)) this.$q.notify({ type: 'negative', message: this.$t('Download error') + (udLst[k].Folder ? (': ' + udLst[k].Folder) : '') })
        }
        if (this.isProgress(this.upDownStatusLst[n].Status) && this.isUploadKind(udLst[k].Kind)) {
          if (this.isReady(udLst[k].Status)) this.$q.notify({ type: 'info', message: this.$t('Upload completed') + (udLst[k].Folder ? (': ' + udLst[k].Folder) : '') })
          if (this.isError(udLst[k].Status)) this.$q.notify({ type: 'negative', message: this.$t('Upload error') + (udLst[k].Folder ? (': ' + udLst[k].Folder) : '') })
        }
        udLst[k].isShowLog = this.upDownStatusLst[n].isShowLog
      }

      // refresh workset list on upload success
      if (nUpReady !== this.readyUpCount) {
        this.refreshWsListTickle = !this.refreshWsListTickle
      }

      // replace download and upload status list
      const dL = []
      const uL = []

      for (const st of udLst) {
        if (this.isAnyDownloadKind(st.Kind)) {
          dL.push(st)
        }
        if (this.isUploadKind(st.Kind)) {
          uL.push(st)
        }
      }
      this.upDownStatusLst = Object.freeze(udLst)
      this.downStatusLst = Object.freeze(dL)
      this.upStatusLst = Object.freeze(uL)

      this.logAllKey = logKey
      this.readyDownCount = nDownReady
      this.progressDownCount = nDownProgress
      this.errorDownCount = nDownError
      this.readyUpCount = nUpReady
      this.progressUpCount = nUpProgress
      this.errorUpCount = nUpError
      this.totalDownCount = this.downStatusLst.length
      this.totalUpCount = this.upStatusLst.length
    },

    // retrive list of files in download or upload folder
    async doFolderFilesRefresh (upDown, folder) {
      if (!folder || !upDown) {
        return // exit on empty folder
      }
      this.loadWait = true
      let isOk = false
      let fLst = []

      const u = this.omsUrl + '/api/' + (upDown === 'up' ? 'upload' : 'download') + '/file-tree/' + encodeURIComponent(folder || '')
      try {
        const response = await this.$axios.get(u)
        fLst = response.data
        isOk = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or file tree retrive failed.', em)
      }
      this.loadWait = false

      if (!isOk || !fLst || !Array.isArray(fLst) || fLst.length <= 0 || !Mdf.isUpDownFileTree(fLst)) {
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

      // make href link: for each part of the path do encodeURIComponent and keep / as is
      const pathEncode = (path) => {
        if (!path || typeof path !== typeof 'string') return ''

        const ps = path.split('/')
        for (let k = 0; k < ps.length; k++) {
          ps[k] = encodeURIComponent(ps[k])
        }
        return ps.join('/')
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
          link: pathEncode(fi.Path),
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
            link: pathEncode(fi.Path),
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

    // delete download or upload by folder name
    async doDeleteUpDown (upDown, folder) {
      if (!folder || !upDown) {
        console.warn('Unable to delete: invalid (empty) folder name or upload-download direction')
        return
      }
      this.$q.notify({ type: 'info', message: this.$t('Deleting') + ': ' + folder })

      this.loadWait = true
      let isOk = false

      const u = this.omsUrl + '/api/' + (upDown === 'up' ? 'upload' : 'download') + '/delete/' + encodeURIComponent(folder || '')
      try {
        // send delete request to the server, response expected to be empty on success
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
    this.$emit('tab-mounted', 'updown-list', { digest: this.digest })
  },
  beforeDestroy () {
    this.stopLogRefresh()
  }
}
