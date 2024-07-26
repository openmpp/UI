import { mapState, mapGetters, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'
import ConfirmDialog from 'components/ConfirmDialog.vue'
import DeleteConfirmDialog from 'components/DeleteConfirmDialog.vue'

const DISK_USE_REFRESH_TIME = (17 * 1000) // msec, disk space usage refresh interval

export default {
  name: 'DiskUse',
  components: { ConfirmDialog, DeleteConfirmDialog },

  props: {
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      dbUseLst: [],
      cleanupLogLst: [],
      loadWait: false,
      diskUseRefreshInt: '',
      upDownToDelete: '',
      showAllDeleteDialogTickle: false,
      nameVerCloseDb: '',
      digestCloseDb: '',
      showCloseDbDialogTickle: false,
      pathCleanupDb: '',
      showCleanupDbDialogTickle: false,
      titleCleanupLog: '',
      nameCleanupLog: '',
      dtCleanupLog: '',
      linesCleanupLog: [],
      showCleanupLog: false
    }
  },

  computed: {
    isDiskUse () { return !!this.serverConfig.IsDiskUse },
    isOver () { return !!this.diskUseState.DiskUse.IsOver },
    updateTs () { return this.diskUseState.DiskUse.UpdateTs },
    isDownloadEnabled () { return this.serverConfig.AllowDownload },
    isUploadEnabled () { return this.serverConfig.AllowUpload },
    isCleanupLogList () { return Mdf.lengthOf(this.cleanupLogLst) > 0 },

    ...mapState('model', {
      modelList: state => state.modelList
    }),
    ...mapGetters('model', {
      modelByDigest: 'modelByDigest',
      modelLanguage: 'modelLanguage'
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl,
      serverConfig: state => state.config,
      diskUseState: state => state.diskUse
    }),
    ...mapState('uiState', {
      uiLang: state => state.uiLang
    })
  },

  watch: {
    refreshTickle () { this.$emit('disk-use-refresh') },
    updateTs () {
      this.makeDbUse()
      this.getCleanupLogList()
    }
  },

  methods: {
    ...mapActions('model', {
      dispatchModelList: 'modelList'
    }),
    fileTimeStamp (t) { return Mdf.modTsToTimeStamp(t) },
    fileSizeStr (size) {
      const fs = Mdf.fileSizeParts(size)
      return fs.val + ' ' + this.$t(fs.name)
    },
    fromTimeStamp (ts) { return Mdf.fromUnderscoreTimeStamp(ts) },

    // delete all download files for all models
    onAllDownloadDelete () {
      this.upDownToDelete = 'down'
      this.showAllDeleteDialogTickle = !this.showAllDeleteDialogTickle
    },
    // delete all upload files for all models
    onAllUploadDelete () {
      this.upDownToDelete = 'up'
      this.showAllDeleteDialogTickle = !this.showAllDeleteDialogTickle
    },
    // user answer Yes to delete all download files or all upload files
    onYesAllUpDownDelete (itemName, itemId, upDown) {
      this.doAllDeleteUpDown(upDown)
    },

    // close model database
    onCloseDb (dbu) {
      if (!dbu.digest) {
        console.warn('Invalid (empty) model digest:', dbu)
        this.$q.notify({ type: 'negative', message: this.$t('Invalid (empty) model digest') })
        return
      }
      this.digestCloseDb = dbu.digest
      this.nameVerCloseDb = dbu.nameVer || dbu.digest
      this.showCloseDbDialogTickle = !this.showCloseDbDialogTickle
    },
    // user answer Yes to close model database
    onYesCloseDb (nameVer, digest, kind) {
      this.doCloseDb(digest, nameVer)
    },
    // open database file by path
    onOpenDb (dbu) {
      this.doOpenDb(dbu.path)
    },
    // do database cleanup
    onCleanupDb (dbu) {
      if (!dbu.path) {
        console.warn('Invalid (empty) path to database file:', dbu)
        this.$q.notify({ type: 'negative', message: this.$t('Invalid (empty) path to database file') })
        return
      }
      this.pathCleanupDb = dbu.path
      this.showCleanupDbDialogTickle = !this.showCleanupDbDialogTickle
    },
    // user answer Yes to cleanup database file
    onYesCleanupDb (path, itemId, kind) {
      this.doCleanupDb(path)
    },

    // set db usage array: sort by model directory and digest or name
    makeDbUse () {
      if (!this.isDiskUse || !Mdf.isLength(this.diskUseState.DbDiskUse)) {
        this.dbUseLst = []
        return
      }

      // for each model get name, desription and folder
      const du = []

      for (const d of this.diskUseState.DbDiskUse) {
        if (!Mdf.isDbDiskUse(d)) continue

        const m = Mdf.modelByDigest(d.Digest, this.modelList)
        const plc = d.DbPath ? d.DbPath.toLowerCase() : ''

        du.push({
          digest: d.Digest,
          size: d.Size,
          modTs: d.ModTs,
          name: Mdf.modelName(m),
          nameVer: Mdf.modelNameVer(m),
          descr: Mdf.descrOfDescrNote(m),
          path: d.DbPath,
          isOn: ((d.Digest || '') !== '') && plc.endsWith('.sqlite'),
          isOff: ((d.Digest || '') === '') && plc.endsWith('.sqlite'),
          isWork: plc.endsWith('.db')
        })
      }

      // sort models by folder + name, put models without folders at the bottom
      du.sort((left, right) => {
        const nL = left.name.toLowerCase()
        const nR = right.name.toLowerCase()
        const pL = left.path.toLowerCase()
        const pR = right.path.toLocaleLowerCase()

        if (pL !== nL && pR === nR) return -1
        if (pL === nL && pR !== nR) return 1

        return (pL < pR) ? -1 : ((pL > pR) ? 1 : 0)
      })

      this.dbUseLst = Object.freeze(du)
    },

    // close model database
    async doCloseDb (digest, nameVer) {
      if (!digest) {
        console.warn('Invalid (empty) model digest:', digest, ': nameVer:', nameVer)
        this.$q.notify({ type: 'negative', message: this.$t('Invalid (empty) model digest') })
        return
      }

      this.loadWait = true
      let isOk = false

      let u = this.omsUrl + '/api/admin/model/' + encodeURIComponent(digest) + '/close'
      try {
        await this.$axios.post(u) // ignore response on success
        isOk = true
      } catch (e) {
        let msg = ''
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Error at model database close', msg)
      }
      if (!isOk) {
        this.loadWait = false
        this.$q.notify({ type: 'negative', message: this.$t('Error at model database close: ') + nameVer + ' ' + digest })
        return
      }

      // refresh model list
      isOk = false
      u = this.omsUrl + '/api/model-list/text' + (this.uiLang !== '' ? '/lang/' + encodeURIComponent(this.uiLang) : '')
      try {
        const response = await this.$axios.get(u)
        if (Mdf.isModelList(response.data)) {
          this.dispatchModelList(response.data) // update model list in store
          isOk = true
        }
      } catch (e) {
        let msg = ''
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Server offline or no models published', msg)
      }
      this.loadWait = false
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or no models published') })
      }

      // refresh disk usage from the server
      setTimeout(() => this.$emit('disk-use-refresh'), 1051)
    },

    // open database file
    async doOpenDb (path) {
      if (!path) {
        console.warn('Invalid (empty) path to database file:', path)
        this.$q.notify({ type: 'negative', message: this.$t('Invalid (empty) path to database file') })
        return
      }
      this.$q.notify({ type: 'info', message: this.$t('Open') + ' ' + path })

      this.loadWait = true
      let isOk = false

      // POST /api/admin/db-file-open/AllCancers-123*OncoSimX-allcancers.sqlite
      const p = path.replaceAll('/', '*')
      let u = this.omsUrl + '/api/admin/db-file-open/' + encodeURIComponent(p)
      try {
        await this.$axios.post(u) // ignore response on success
        isOk = true
      } catch (e) {
        let msg = ''
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Error at database file open', p, msg)
      }
      if (!isOk) {
        this.loadWait = false
        this.$q.notify({ type: 'negative', message: this.$t('Error at database file open: ') + path })
        return
      }

      // refresh model list
      isOk = false
      u = this.omsUrl + '/api/model-list/text' + (this.uiLang !== '' ? '/lang/' + encodeURIComponent(this.uiLang) : '')
      try {
        const response = await this.$axios.get(u)
        if (Mdf.isModelList(response.data)) {
          this.dispatchModelList(response.data) // update model list in store
          isOk = true
        }
      } catch (e) {
        let msg = ''
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Server offline or no models published', msg)
      }
      this.loadWait = false
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or no models published') })
      }

      // refresh disk usage from the server
      setTimeout(() => this.$emit('disk-use-refresh'), 1051)
    },

    // cleanup database file
    async doCleanupDb (path) {
      if (!path) {
        console.warn('Invalid (empty) path to database file:', path)
        this.$q.notify({ type: 'negative', message: this.$t('Invalid (empty) path to database file') })
        return
      }
      this.$q.notify({ type: 'info', message: this.$t('Starting cleanup of: ') + path })

      this.loadWait = true
      let isOk = false
      let logName = ''

      // POST /api/admin/db-cleanup/AllCancers-123*OncoSimX-allcancers.sqlite
      const p = path.replaceAll('/', '*')
      const u = this.omsUrl + '/api/admin/db-cleanup/' + encodeURIComponent(p)
      try {
        const response = await this.$axios.post(u)
        // expected response:
        //  { LogFileName: "db-cleanup.2024_03_05_00_30_37_568.modelOne.sqlite.console.txt" }
        if (response.data) {
          logName = response.data?.LogFileName
          isOk = !!logName && (typeof logName === typeof 'string') && ((logName || '') !== '')
        }
      } catch (e) {
        let msg = ''
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Error at database file cleanup', p, msg)
      }
      this.loadWait = false
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Error at database file cleanup: ') + path })
        return
      }
      // notify user about log file
      this.$q.notify({ type: 'info', message: this.$t('Cleanup log: ') + logName })

      // refresh disk usage from the server and refresh list of log cleanup files
      setTimeout(() => this.$emit('disk-use-refresh'), 2777)
      setTimeout(() => this.getCleanupLogList(), 1051)
    },

    // get list of database cleanup log files
    async getCleanupLogList () {
      let isOk = false
      let lst = []

      const u = this.omsUrl + '/api/admin/db-cleanup/log-all'
      try {
        const response = await this.$axios.get(u)
        if (response.data) {
          isOk = !!response.data && Array.isArray(response.data)
          if (isOk) lst = response.data
        }
      } catch (e) {
        let msg = ''
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Unable to get list of cleanup log files', msg)
      }
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to get list of cleanup log files') })
        return
      }
      // expected response:
      /*
      [{
          "DbName": "modelOne.sqlite",
          "LogStamp": "2024_03_05_01_31_56_780",
          "LogFileName": "db-cleanup.2024_03_05_01_31_56_780.modelOne.sqlite.console.txt"
        }
      ]
      */
      this.cleanupLogLst = []

      for (let k = lst.length - 1; k >= 0; k--) { // in reverse time order
        const f = lst[k]
        if (!f.hasOwnProperty('DbName') || typeof f.DbName !== typeof 'string') continue
        if (!f.hasOwnProperty('LogStamp') || typeof f.LogStamp !== typeof 'string') continue
        if (!f.hasOwnProperty('LogFileName') || typeof f.LogFileName !== typeof 'string') continue

        if ((f.DbName || '') !== '' && (f.LogStamp || '') !== '' && (f.LogFileName || '') !== '') this.cleanupLogLst.push(f)
      }
    },

    // get cleanup log file content and show it to the user
    async doShowCleanupLog (logName) {
      if (!logName) {
        console.warn('Invalid (empty) log file name:', logName)
        this.$q.notify({ type: 'negative', message: this.$t('Invalid (empty) log file name') })
        return
      }

      let isOk = false
      let fc = {}

      const u = this.omsUrl + '/api/admin/db-cleanup/log/' + encodeURIComponent(logName)
      try {
        const response = await this.$axios.get(u)
        if (response.data) {
          fc = response.data
          if (fc.hasOwnProperty('DbName') && typeof fc.DbName === typeof 'string' &&
            fc.hasOwnProperty('LogStamp') && typeof fc.LogStamp === typeof 'string' &&
            fc.hasOwnProperty('LogFileName') && typeof fc.LogFileName === typeof 'string' &&
            fc.hasOwnProperty('ModTs') && typeof fc.ModTs === typeof 1 &&
            fc.hasOwnProperty('Lines') && Array.isArray(fc.Lines)) {
            isOk = (fc.DbName || '') !== '' && (fc.LogStamp || '') !== '' && (fc.LogFileName || '') !== ''
          }
        }
      } catch (e) {
        let msg = ''
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Unable to get cleanup log file', logName, msg)
      }
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to get cleanup log file: ') + logName })
        return
      }
      // expected response:
      /*
      "DbName": "modelOne.sqlite",
      "LogStamp": "2024_03_05_01_31_56_780",
      "LogFileName": "db-cleanup.2024_03_05_01_31_56_780.modelOne.sqlite.console.txt",
      "Size": 185,
      "ModTs": 1709620320883,
      "Lines": ["2024-03-05 01:31:56.786 , "......"]
      */
      this.titleCleanupLog = fc.DbName
      this.nameCleanupLog = fc.LogFileName
      this.dtCleanupLog = this.fileTimeStamp(fc.ModTs)
      this.linesCleanupLog = fc.Lines
      this.showCleanupLog = true
    },

    // delete all download files or all upload files
    async doAllDeleteUpDown (upDown) {
      if (!upDown) {
        console.warn('Unable to delete: invalid (empty) upload-download direction')
        return
      }
      this.$q.notify({ type: 'info', message: (upDown === 'up' ? this.$t('Deleting all upload files') : this.$t('Deleting all download files')) })

      this.loadWait = true
      let isOk = false

      const u = this.omsUrl + '/api/' + (upDown === 'up' ? 'upload' : 'download') + '/delete-all'
      try {
        // send delete request to the server, response expected to be empty on success
        await this.$axios.delete(u)
        isOk = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Error at delete all files:', em)
      }
      this.loadWait = false

      if (!isOk) {
        this.$q.notify({ type: 'negative', message: (upDown === 'up' ? this.$t('Unable to delete upload files') : this.$t('Unable to delete download files')) })
        return
      }

      this.$q.notify({ type: 'info', message: this.$t('Files deleted.') })

      // refresh disk usage from the server
      setTimeout(() => this.$emit('disk-use-refresh'), 2777)
    }
  },

  mounted () {
    this.makeDbUse()
    this.getCleanupLogList()
    this.diskUseRefreshInt = setInterval(() => { this.$emit('disk-use-refresh') }, DISK_USE_REFRESH_TIME)
  },
  beforeDestroy () {
    clearInterval(this.diskUseRefreshInt)
  }
}
