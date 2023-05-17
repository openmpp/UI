import { mapState, mapGetters, mapActions } from 'vuex'
import languages from 'quasar/lang/index.json'
import * as Mdf from 'src/model-common'
import ModelInfoDialog from 'components/ModelInfoDialog.vue'

const ARCHIVE_REFRESH_TIME = 3067 // (60 * 1000) // msec, archive state refresh interval

export default {
  name: 'MainLayout',
  components: { ModelInfoDialog },

  data () {
    return {
      leftDrawerOpen: false,
      refreshTickle: false,
      loadConfigDone: false,
      isBeta: true,
      modelInfoTickle: false,
      toUpDownSection: 'down',
      loadArchiveDone: false,
      isArchive: false,
      nowArchiveCount: 0,
      alertArchiveCount: 0,
      archiveRefreshInt: '',
      langCode: this.$q.lang.getLocale(),
      appLanguages: languages.filter(lang => ['fr', 'en-us'].includes(lang.isoName))
    }
  },

  computed: {
    mainTitle () {
      const t = (this.theModelDir ? this.theModelDir + '/' : '') + Mdf.modelTitle(this.theModel)
      return (t !== '') ? t : 'OpenM++'
    },
    isModel () { return Mdf.isModel(this.theModel) },
    modelDigest () { return Mdf.modelDigest(this.theModel) },
    modelName () { return Mdf.modelName(this.theModel) },
    runTextCount () { return Mdf.runTextCount(this.runTextList) },
    worksetTextCount () { return Mdf.worksetTextCount(this.worksetTextList) },
    loginUrl () { return Mdf.configEnvValue(this.serverConfig, 'OM_CFG_LOGIN_URL') },
    logoutUrl () { return Mdf.configEnvValue(this.serverConfig, 'OM_CFG_LOGOUT_URL') },
    loadWait () {
      return !this.loadConfigDone // || (!this.loadArchiveDone && this.isArchive)
    },

    ...mapState('model', {
      theModel: state => state.theModel,
      theModelDir: state => state.theModelDir,
      runTextList: state => state.runTextList,
      worksetTextList: state => state.worksetTextList
    }),
    ...mapGetters('model', {
      modelCount: 'modelListCount'
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl,
      serverConfig: state => state.config,
      archiveState: state => state.archive
    }),
    ...mapState('uiState', {
      uiLang: state => state.uiLang,
      runDigestSelected: state => state.runDigestSelected,
      worksetNameSelected: state => state.worksetNameSelected,
      taskNameSelected: state => state.taskNameSelected
    })
  },

  watch: {
    // language updated outside of main menu
    uiLang () {
      if (!this.uiLang) {
        let lc = this.$q.lang.getLocale()
        if (this.appLanguages.findIndex((ln) => ln.isoName === lc) < 0) { // language not included in translation pack, use default en-us
          lc = 'en-us'
        }
        this.langCode = lc
        this.$i18n.locale = lc
      }
    },
    // switch app language: Quasar and vue i18n language
    langCode (lc) {
      // dynamic import, so loading on demand only
      import(
        /* webpackInclude: /(fr|en-us)\.js$/ */
        'quasar/lang/' + lc
      ).then(lang => {
        this.$q.lang.set(lang.default) // switch quasar language
        this.$i18n.locale = lc // switch vue app language
      }).catch(err => {
        console.warn('Error at loading language:', lc, err)
      })
    },
    isArchive () { this.restartArchiveRefresh() }
  },

  methods: {
    // show model notes dialog
    doShowModelNote () {
      this.modelInfoTickle = !this.modelInfoTickle
    },
    // new selected language in the menu
    onLangMenu (lc) {
      this.langCode = lc // switch app language by watch
      if (lc) { // use selected language for model text metadata
        this.dispatchUiLang(lc)
        this.refreshTickle = !this.refreshTickle
      }
    },

    doRefresh () {
      this.doConfigRefresh()
      this.restartArchiveRefresh()
      this.refreshTickle = !this.refreshTickle
    },
    restartArchiveRefresh () {
      clearInterval(this.archiveRefreshInt)
      // refersh archive state now and setup refresh by timer
      this.doArchiveRefresh()
      if (this.isArchive) {
        this.archiveRefreshInt = setInterval(this.doArchiveRefresh, ARCHIVE_REFRESH_TIME)
      }
    },

    // view downloads page section
    onDownloadSelect (digest) {
      if (!digest) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to view downloads') })
        return
      }
      // show downloads for model selected from model list
      this.toUpDownSection = 'down'
      this.$router.push('/updown-list/model/' + encodeURIComponent(digest))
    },
    // view uploads page section
    onUploadSelect (digest) {
      if (!digest) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to view uploads') })
        return
      }
      // show uploads for model selected from model list
      this.toUpDownSection = 'up'
      this.$router.push('/updown-list/model/' + encodeURIComponent(digest))
    },

    // receive server configuration, including configuration of model catalog and run catalog
    async doConfigRefresh () {
      this.loadConfigDone = false

      const u = this.omsUrl + '/api/service/config'
      try {
        // send request to the server
        const response = await this.$axios.get(u)
        this.dispatchServerConfig(response.data) // update server config in store
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or configuration retrieve failed.', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or configuration retrieve failed.') })
      }
      this.loadConfigDone = true

      // update archive state if necessary
      this.isArchive = !!this?.serverConfig?.IsArchive
    },

    // receive archive state from server
    async doArchiveRefresh () {
      this.loadArchiveDone = false

      const u = this.omsUrl + '/api/archive/state'
      try {
        // send request to the server
        const response = await this.$axios.get(u)
        this.dispatchArchiveState(response.data) // update archive state in store
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or archive state retrieve failed.', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or archive state retrieve failed.') })
      }
      this.loadArchiveDone = true

      // update archive counts to notify user
      this.nowArchiveCount = 0
      this.alertArchiveCount = 0

      if (Mdf.isArchiveState(this.archiveState)) {
        for (const m of this.archiveState.Model) {
          this.nowArchiveCount = this.nowArchiveCount + m.Run.length + m.Set.length
          this.alertArchiveCount = this.alertArchiveCount + m.RunAlert.length + m.SetAlert.length
        }
      }
    },

    ...mapActions('uiState', {
      dispatchUiLang: 'uiLang'
    }),
    ...mapActions('serverState', {
      dispatchServerConfig: 'serverConfig',
      dispatchArchiveState: 'archiveState'
    })
  },

  mounted () {
    this.doConfigRefresh()
  },
  beforeDestroy () {
    clearInterval(this.archiveRefreshInt)
  },

  created () {
    // if locale for current language not avaliable then
    // find fallback locale (assuming fallback is available)
    let ln = this.langCode

    if (this.$i18n.availableLocales.indexOf(ln) < 0) {
      const fbLoc = this.$i18n.fallbackLocale

      let isFound = false
      for (const lc in fbLoc) {
        isFound = lc === ln
        if (isFound) {
          ln = fbLoc[lc] // assume only one fallback and it is available
          break
        }
      }
      if (!isFound) ln = fbLoc.default || '' // use default fallback
    }

    if (ln && this.langCode !== ln) this.langCode = ln // switch app language
  }
}
