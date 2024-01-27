import { mapState, mapGetters, mapActions } from 'vuex'
import languages from 'quasar/lang/index.json'
import * as Mdf from 'src/model-common'
import ModelInfoDialog from 'components/ModelInfoDialog.vue'

const DISK_USE_REFRESH_TIME = 5701 // msec, disk space usage refresh interval
// const DISK_USE_REFRESH_TIME = (131 * 1000) // msec, disk space usage refresh interval

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
      loadDiskUseDone: false,
      isDiskUse: false,
      diskUseRefreshInt: '',
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
    modelDocLink () {
      return this.serverConfig.IsModelDoc ? Mdf.modelDocLink(this.modelDigest, this.modelList, this.uiLang, this.modelLanguage) : ''
    },
    runTextCount () { return Mdf.runTextCount(this.runTextList) },
    worksetTextCount () { return Mdf.worksetTextCount(this.worksetTextList) },
    loginUrl () { return Mdf.configEnvValue(this.serverConfig, 'OM_CFG_LOGIN_URL') },
    logoutUrl () { return Mdf.configEnvValue(this.serverConfig, 'OM_CFG_LOGOUT_URL') },
    loadWait () {
      return !this.loadConfigDone // || (!this.loadDiskUseDone && this.isDiskUse)
    },

    ...mapState('model', {
      theModel: state => state.theModel,
      modelList: state => state.modelList,
      theModelDir: state => state.theModelDir,
      runTextList: state => state.runTextList,
      worksetTextList: state => state.worksetTextList
    }),
    ...mapGetters('model', {
      modelCount: 'modelListCount',
      modelLanguage: 'modelLanguage'
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl,
      serverConfig: state => state.config,
      diskUseState: state => state.diskUse
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
    isDiskUse () { this.restartDiskUseRefresh() }
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
      this.restartDiskUseRefresh()
      this.refreshTickle = !this.refreshTickle
    },
    restartDiskUseRefresh () {
      clearInterval(this.diskUseRefreshInt)
      // refersh disk space usage now and setup refresh by timer
      if (this.isDiskUse) {
        this.doDiskUseRefresh()
        this.diskUseRefreshInt = setInterval(this.doDiskUseRefresh, DISK_USE_REFRESH_TIME)
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

      // update disk space usage if necessary
      this.isDiskUse = !!this?.serverConfig?.IsDiskUse
    },

    // receive disk space usage from server
    async doDiskUseRefresh () {
      this.loadDiskUseDone = false

      const u = this.omsUrl + '/api/disk-use'
      try {
        // send request to the server
        const response = await this.$axios.get(u)
        this.dispatchDiskUseState(response.data) // update disk space usage in store
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or disk usage retrieve failed.', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or disk space usage retrieve failed.') })
      }
      this.loadIsDiskUseDone = true

      // update disk space usage to notify user
    },

    ...mapActions('uiState', {
      dispatchUiLang: 'uiLang'
    }),
    ...mapActions('serverState', {
      dispatchServerConfig: 'serverConfig',
      dispatchDiskUseState: 'diskUseState'
    })
  },

  mounted () {
    this.doConfigRefresh()
  },
  beforeDestroy () {
    clearInterval(this.diskUseRefreshInt)
  },

  created () {
    // if locale for current language not avaliable then
    // find fallback locale (assuming fallback is available)
    let ln = this.langCode

    // match first part of lanuage code to avaliable locales
    if (this.$i18n.availableLocales.indexOf(ln) < 0) {
      const ui2p = Mdf.splitLangCode(ln)

      if (ui2p.first !== '') {
        for (const lcIdx in this.$i18n.availableLocales) {
          const lc = this.$i18n.availableLocales[lcIdx]

          const av2p = Mdf.splitLangCode(lc)
          if (av2p.first === ui2p.first) {
            ln = lc
            break
          }
        }
      }
    }

    if (ln && this.langCode !== ln) {
      this.langCode = ln // switch app language
    }
  }
}
