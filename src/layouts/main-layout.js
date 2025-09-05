import { mapState, mapActions } from 'pinia'
import { useModelStore } from '../stores/model'
import { useServerStateStore } from '../stores/server-state'
import { useUiStateStore } from '../stores/ui-state'
import languages from 'quasar/lang/index.json'
import * as Mdf from 'src/model-common'
import ModelInfoDialog from 'components/ModelInfoDialog.vue'

const DISK_USE_MIN_REFRESH_TIME = (17 * 1000) // msec, minimum disk space usage refresh interval
const DISK_USE_MAX_ERR = 5 // max error count to stop disk use retrival and block model runs

export default {
  name: 'MainLayout',
  components: { ModelInfoDialog },

  data () {
    return {
      leftDrawerOpen: false,
      refreshTickle: false,
      loadConfigDone: false,
      loadDiskUseDone: false,
      nDiskUseErr: 0, // disk use error count
      loginUrl: '',
      logoutUrl: '',
      orgTitle: 'OpenM++',
      orgLink: 'https://openmpp.org',
      isLoginCatch: false,
      modelInfoTickle: false,
      toUpDownSection: 'down',
      isDiskUse: false,
      diskUseRefreshInt: '',
      diskUseMs: DISK_USE_MIN_REFRESH_TIME,
      langCode: this.$q.lang.getLocale(),
      appLanguages: languages.filter(lang => ['fr', 'en-US'].includes(lang.isoName))
    }
  },

  computed: {
    mainTitle () {
      const t = (this.theModelDir ? this.theModelDir + '/' : '') + Mdf.modelTitle(this.theModel)
      return (t !== '') ? t : this.orgTitle
    },
    isModel () { return Mdf.isModel(this.theModel) },
    modelDigest () { return Mdf.modelDigest(this.theModel) },
    modelName () { return Mdf.modelName(this.theModel) },
    modelDocLink () {
      return this.serverConfig.IsModelDoc ? Mdf.modelDocLinkByDigest(this.modelDigest, this.modelList, this.uiLang, this.modelLanguage) : ''
    },
    runTextCount () { return Mdf.runTextCount(this.runTextList) },
    worksetTextCount () { return Mdf.worksetTextCount(this.worksetTextList) },
    loadWait () {
      return !this.loadConfigDone
    },

    ...mapState(useModelStore, [
      'theModel',
      'theModelDir',
      'modelList',
      'runTextList',
      'worksetTextList',
      'modelCount',
      'modelLanguage'
    ]),
    ...mapState(useServerStateStore, {
      omsUrl: 'omsUrl',
      serverConfig: 'config',
      diskUseState: 'diskUse'
    }),
    ...mapState(useUiStateStore, [
      'uiLang',
      'runDigestSelected',
      'worksetNameSelected',
      'taskNameSelected'
    ])
  },

  watch: {
    // language updated outside of main menu
    uiLang () {
      if (!this.uiLang) {
        let lc = this.$q.lang.getLocale()
        if (this.appLanguages.findIndex((ln) => ln.isoName === lc) < 0) { // language not included in translation pack, use default en-US
          lc = 'en-US'
        }
        this.langCode = lc
        this.$i18n.locale = lc
      }
      this.doOrgTitle()
    },
    // switch app language: Quasar and vue i18n language
    langCode (lc) {
      // dynamic import, so loading on demand only
      import(
        /* webpackInclude: /(fr|en-US)\.js$/ */
        'quasar/lang/' + lc
      ).then(lang => {
        this.$q.lang.set(lang.default) // switch quasar language
        this.$i18n.locale = lc // switch vue app language
      }).catch(err => {
        console.warn('Error at loading language:', lc, err)
      })
    },

    isDiskUse () { this.restartDiskUseRefresh() },
    diskUseMs () { this.restartDiskUseRefresh() },

    // set 401 and 403 interceptor: open login page
    loginUrl () {
      if (this.isLoginCatch || !this.loginUrl || typeof this.loginUrl !== typeof 'string') return // use only first non-empty login url

      this.$nextTick(() => {
        this.$axios.interceptors.response.use(
          (response) => response,
          (error) => {
            if (error.response) {
              if (error.response.status === 401 || error.response.status === 403) { // open login URL
                console.warn('Authentication session expired, status:', error.response.status)
                this.$q.notify({ type: 'negative', message: this.$t('Login session expired or authorization error.') })
                setTimeout(
                  () => window.location.assign(this.loginUrl),
                  5000)
              }
            }
            return Promise.reject(error)
          })
      })
      this.isLoginCatch = true
    }
  },

  methods: {
    ...mapActions(useServerStateStore, [
      'dispatchServerConfig',
      'dispatchDiskUse'
    ]),
    ...mapActions(useUiStateStore, [
      'dispatchUiLang',
      'dispatchSortModelTree'
    ]),

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
    // update org title and link on language switch
    doOrgTitle () {
      if (!this.serverConfig?.UiExtra || !Array.isArray(this.serverConfig.UiExtra?.DefaultTitle)) return

      const ulc = this.uiLang || this.$q.lang.getLocale()

      for (const m of this.serverConfig.UiExtra.DefaultTitle) {
        if (m.LangCode === ulc) {
          this.orgTitle = m?.Label || 'OpenM++'
          this.orgLink = m?.Link || 'https://openmpp.org'
          return
        }
        const m2p = Mdf.splitLangCode(m.LangCode)
        const ui2p = Mdf.splitLangCode(ulc)
        if (m2p.isEmpty || ui2p.isEmpty) {
          continue
        }
        if (m2p.lower === ui2p.lower) {
          this.orgTitle = m?.Label || 'OpenM++'
          this.orgLink = m?.Link || 'https://openmpp.org'
          return
        }
        if (m2p.first === ui2p.first) {
          this.orgTitle = m?.Label || 'OpenM++'
          this.orgLink = m?.Link || 'https://openmpp.org'
          return
        }
      }
    },
    // return more menu extra items array for current UI language
    moreMenu () {
      if (!this.serverConfig?.UiExtra || !Array.isArray(this.serverConfig.UiExtra?.MoreMenu)) return []

      const ulc = this.uiLang || this.$q.lang.getLocale()
      const mm = []
      for (const m of this.serverConfig.UiExtra.MoreMenu) {
        if (m.LangCode === ulc) {
          mm.push(m)
          continue
        }
        const m2p = Mdf.splitLangCode(m.LangCode)
        const ui2p = Mdf.splitLangCode(ulc)
        if (m2p.isEmpty || ui2p.isEmpty) {
          continue
        }
        if (m2p.lower === ui2p.lower) {
          mm.push(m)
          continue
        }
        if (m2p.first === ui2p.first) {
          mm.push(m)
          continue
        }
      }
      return mm
    },

    doRefresh () {
      this.doConfigRefresh()
      this.restartDiskUseRefresh()
      this.refreshTickle = !this.refreshTickle
    },
    restartDiskUseRefresh () {
      this.nDiskUseErr = 0
      clearInterval(this.diskUseRefreshInt)
      // refersh disk space usage now and setup refresh by timer
      if (this.isDiskUse) {
        this.doRefreshDiskUse()
        this.diskUseRefreshInt = setInterval(this.doGetDiskUse, this.diskUseMs)
      }
    },
    // refresh disk use by request
    onDiskUseRefresh () {
      if (this.isDiskUse) {
        this.doRefreshDiskUse()
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
      this.loginUrl = Mdf.configEnvValue(this.serverConfig, 'OM_CFG_LOGIN_URL')
      this.logoutUrl = Mdf.configEnvValue(this.serverConfig, 'OM_CFG_LOGOUT_URL')

      // update disk space usage if necessary
      this.isDiskUse = !!this?.serverConfig?.IsDiskUse
      this.diskUseMs = this.getDiskUseRefreshMs(this?.serverConfig?.DiskScanMs)

      // update UI poperties
      const isTsort = (typeof this.serverConfig.UiExtra?.ModelTreeDescending === typeof true)
      const isTdesc = isTsort && !!this.serverConfig.UiExtra?.ModelTreeDescending
      this.dispatchSortModelTree({ isSort: isTsort, isDesc: isTdesc })

      this.doOrgTitle()
    },
    // get interval of disk use configuration refresh
    getDiskUseRefreshMs (ms) {
      return (!!ms && typeof ms === typeof 1 && ms >= DISK_USE_MIN_REFRESH_TIME) ? ms : DISK_USE_MIN_REFRESH_TIME
    },
    // return file size as translated string for example: 12 MB or 34 GB
    fileSizeStr (size) {
      const fs = Mdf.fileSizeParts(size)
      return fs.val + ' ' + this.$t(fs.name)
    },

    // receive disk space usage from server
    async doGetDiskUse () {
      if (this.nDiskUseErr > DISK_USE_MAX_ERR) return // get disk use failed

      this.loadDiskUseDone = false
      let isOk = false

      const u = this.omsUrl + '/api/service/disk-use'
      try {
        // send request to the server
        const response = await this.$axios.get(u)
        this.dispatchDiskUse(response.data) // update disk space usage in store
        isOk = Mdf.isDiskUseState(response.data) // validate disk usage info
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or disk usage retrieve failed.', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or disk space usage retrieve failed.') })
      }
      this.loadDiskUseDone = true

      // update disk space usage to notify user
      if (isOk) {
        this.isDiskUse = this.diskUseState.IsDiskUse
        this.diskUseMs = this.getDiskUseRefreshMs(this.diskUseState.DiskUse.DiskScanMs)
        this.nDiskUseErr = 0
      } else {
        this.nDiskUseErr++
      }

      if (this.nDiskUseErr > DISK_USE_MAX_ERR) {
        clearInterval(this.diskUseRefreshInt)

        const du = Mdf.emptyDiskUseState()
        du.DiskUse.IsOver = true
        this.dispatchDiskUse(du) // block model runs

        console.warn('Disk usage retrieve failed:', this.nDiskUseErr)
        this.$q.notify({ type: 'negative', message: this.$t('Disk space usage retrieve failed') })
      }
    },

    // send request to refersh disk space usage
    async doRefreshDiskUse () {
      if (this.nDiskUseErr > DISK_USE_MAX_ERR) return // get disk use failed

      const u = this.omsUrl + '/api/service/disk-use/refresh'
      try {
        await this.$axios.post(u) // ignore response on success
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or disk usage refresh failed.', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or disk space usage refresh failed.') })
      }

      // get disk usage from the server
      setTimeout(() => this.doGetDiskUse(), 1231)
    }
  },

  mounted () {
    this.doConfigRefresh()
  },

  beforeUnmount () {
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
