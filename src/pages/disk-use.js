import { mapState, mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'
import DeleteConfirmDialog from 'components/DeleteConfirmDialog.vue'

export default {
  name: 'DiskUse',
  components: { DeleteConfirmDialog },

  props: {
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      dbUseLst: [],
      upDownToDelete: '',
      showAllDeleteDialogTickle: false
    }
  },

  computed: {
    isDiskUse () { return !!this.serverConfig.IsDiskUse },
    isOver () { return !!this.diskUseState.DiskUse.IsOver },
    updateTs () { return this.diskUseState.DiskUse.UpdateTs },
    isDownloadEnabled () { return this.serverConfig.AllowDownload },
    isUploadEnabled () { return this.serverConfig.AllowUpload },

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
    updateTs () { this.makeDbUse() }
  },

  methods: {
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

    modelNameVer (dgst) {
      const t = Mdf.modelNameVer(Mdf.modelByDigest(dgst, this.modelList))
      return ((t || '') !== '') ? t : dgst
    },
    modelDescr (dgst) {
      return Mdf.descrOfDescrNote(Mdf.modelByDigest(dgst, this.modelList))
    },
    modelDir (dgst) {
      const p = Mdf.modelDirByDigest(dgst, this.modelList)
      if (!p || p === '/' || p === './' || p === '.') return ''

      const t = Mdf.modelName(Mdf.modelByDigest(dgst, this.modelList))

      return p + ' / ' + (((t || '') !== '') ? t : dgst)
    },

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

    // set db usage array: sort by model directory and digest or name
    makeDbUse () {
      if (!this.isDiskUse || !Mdf.isLength(this.diskUseState.DbDiskUse)) {
        this.dbUseLst = []
        return
      }

      // for each model get name, desription and folder
      const du = []

      for (const d of this.diskUseState.DbDiskUse) {
        const m = Mdf.modelByDigest(d.Digest, this.modelList)
        du.push({
          digest: d.Digest,
          size: d.Size,
          modTs: d.ModTs,
          name: Mdf.modelName(m),
          nameVer: Mdf.modelNameVer(m),
          descr: Mdf.descrOfDescrNote(m),
          dir: Mdf.modelDirByDigest(d.Digest, this.modelList)
        })
      }

      // sort models by folder + name, put models without folders at the bottom
      du.sort((left, right) => {
        const nL = left.name.toLowerCase()
        const nR = right.name.toLowerCase()

        if (left.dir && right.dir) {
          const pL = left.dir.toLowerCase() + ' / ' + nL
          const pR = right.dir.toLocaleLowerCase() + ' / ' + nR
          return (pL < pR) ? -1 : ((pL > pR) ? 1 : 0)
        }
        if (left.dir && !right.dir) return -1
        if (!left.dir && right.dir) return 1

        return (nL < nR) ? -1 : ((nL > nR) ? 1 : 0)
      })

      this.dbUseLst = Object.freeze(du)
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
  }
}
