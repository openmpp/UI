<template>
<q-layout view="hHh Lpr lFf" class="text-body1">

  <q-header>
    <q-toolbar>

      <q-btn
        @click="leftDrawerOpen = !leftDrawerOpen"
        flat
        round
        dense
        icon="menu"
        :title="$t('Menu')"
        :aria-label="$t('Menu')"
        />
      <q-btn
        v-if="isModel"
        @click="doShowModelNote"
        flat
        round
        dense
        icon="mdi-information-outline"
        class="q-ml-sm"
        :title="$t('About') + ' ' + modelName"
        />

      <q-toolbar-title class="q-pl-xs">
        <router-link
          v-if="isModel"
          :to="'/model/' + modelDigest"
          :title="modelName"
          class="full-width ellipsis title-link"
          >
          {{ mainTitle }}
        </router-link>
        <a v-else
          class="title-link"
          href="//github.com/openmpp/UI/discussions" target="_blank"
          :title="$t('Feedback on beta UI version')"
          >
          <span class="full-width ellipsis text-white">
            {{ mainTitle }}<template v-if="isBeta">:<span class="q-mx-sm">{{ $t('Please provide feedback on beta UI version') }}</span><q-icon name="feedback" /></template>
          </span>
        </a>
      </q-toolbar-title>

      <q-btn
        v-if="isBeta && isModel"
        type="a"
        href="//github.com/openmpp/UI/discussions" target="_blank"
        flat
        round
        dense
        :title="$t('Feedback on beta UI version')"
        :aria-label="$t('Feedback on beta UI version')"
        icon="feedback"
        />
      <q-btn
        v-if="loginUrl"
        type="a"
        :href="loginUrl"
        flat
        round
        dense
        :title="$t('Login')"
        :aria-label="$t('Login')"
        icon="mdi-account-key"
        />
      <q-btn
        v-if="logoutUrl"
        type="a"
        :href="logoutUrl"
        flat
        round
        dense
        :title="$t('Logout')"
        :aria-label="$t('Logout')"
        icon="mdi-account-lock"
        />
      <q-btn
        @click="doRefresh"
        flat
        round
        dense
        icon="refresh"
        :title="$t('Refresh')"
        :aria-label="$t('Refresh')"
      />

      <q-btn
        flat
        round
        dense
        icon="more_vert"
        :title="$t('More')"
        :aria-label="$t('More')"
        >
        <q-menu auto-close>
          <q-list>

            <q-item
              v-for="ln in appLanguages"
              :key="ln.isoName"
              @click="onLangMenu(ln.isoName)"
              clickable
              :active="langCode === ln.isoName"
              active-class="primary"
              >
              <q-item-section avatar>{{ ln.isoName }}</q-item-section>
              <q-item-section>{{ ln.nativeName }}</q-item-section>
            </q-item>
            <q-separator />

            <q-item
              clickable
              to="/license"
              >
              <q-item-section avatar>
                <q-icon name="mdi-license" />
              </q-item-section>
              <q-item-section>{{ $t('Licence') }}</q-item-section>
            </q-item>
            <q-separator />

            <q-item
              clickable
              tag="a"
              target="_blank"
              href="//openmpp.org/"
              >
              <q-item-section avatar>
                <q-icon name="link" />
              </q-item-section>
              <q-item-section>OpenM++ {{ $t('website') }}</q-item-section>
            </q-item>
            <q-item
              clickable
              tag="a"
              target="_blank"
              href="//github.com/openmpp/openmpp.github.io/wiki"
              >
              <q-item-section avatar>
                <q-icon name="link" />
              </q-item-section>
              <q-item-section>OpenM++ {{ $t('wiki') }}</q-item-section>
            </q-item>

          </q-list>
        </q-menu>
      </q-btn>

    </q-toolbar>
  </q-header>

  <q-drawer
    v-model="leftDrawerOpen"
    bordered
    content-class="bg-grey-1"
    >
    <q-list>

      <q-item
        clickable
        to="/"
        exact
        >
        <q-item-section avatar>
          <q-icon name="mdi-folder-home-outline" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ $t('Models') }}</q-item-label>
          <q-item-label caption>{{ $t('Models list') }}</q-item-label>
        </q-item-section>
        <q-item-section avatar>
          <q-badge v-if="modelCount" color="secondary" :label="modelCount" />
        </q-item-section>
      </q-item>
      <q-separator />

      <q-item v-if="isModel">
        <q-item-label
          header
          class="ellipsis secondary q-pl-none q-pb-sm"
          >
          {{ modelName }}
        </q-item-label>
      </q-item>

      <q-item
        clickable
        :disable="!isModel || !runTextCount"
        :to="'/model/' + modelDigest + '/run-list'"
        >
        <q-item-section avatar>
          <q-icon name="mdi-folder-table-outline" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ $t('Model Runs') }}</q-item-label>
          <q-item-label caption>{{ $t('List of model runs') }}</q-item-label>
        </q-item-section>
        <q-item-section avatar>
          <q-badge v-if="isModel" color="secondary" :label="runTextCount" />
        </q-item-section>
      </q-item>

      <q-item
        clickable
        :disable="!isModel || !worksetTextCount"
        :to="'/model/' + modelDigest + '/set-list'"
        >
        <q-item-section avatar>
          <q-icon name="mdi-folder-edit-outline" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ $t('Input Scenarios') }}</q-item-label>
          <q-item-label caption>{{ $t('List of input scenarios') }}</q-item-label>
        </q-item-section>
        <q-item-section avatar>
          <q-badge v-if="isModel" color="secondary" :label="worksetTextCount" />
        </q-item-section>
      </q-item>

      <q-item
        clickable
        :disable="!isModel"
        :to="'/model/' + modelDigest + '/set-create'"
        >
        <q-item-section avatar>
          <q-icon name="mdi-notebook-edit-outline" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ $t('New Scenario') }}</q-item-label>
          <q-item-label caption>{{ $t('Create new input scenario') }}</q-item-label>
        </q-item-section>
      </q-item>

      <q-item
        clickable
        :disable="!runDigestSelected && !worksetNameSelected && !taskNameSelected"
        :to="'/model/' + modelDigest + '/new-run'"
        >
        <q-item-section avatar>
          <q-icon name="mdi-run" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ $t('Run the Model') }}</q-item-label>
        </q-item-section>
      </q-item>

      <q-item
        clickable
        :disable="!serverConfig.AllowDownload || !isModel"
        :to="'/model/' + modelDigest + '/download-list'"
        >
        <q-item-section avatar>
          <q-icon name="mdi-file-download-outline" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ $t('Downloads') }}</q-item-label>
          <q-item-label caption>{{ $t('Download model data') }}</q-item-label>
        </q-item-section>
      </q-item>
      <q-separator />

      <q-item
        clickable
        to="/settings"
        >
        <q-item-section avatar>
          <q-icon name="settings" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ $t('Settings') }}</q-item-label>
          <q-item-label caption class="ellipsis secondary">{{ $t('Session state and settings') }}</q-item-label>
        </q-item-section>
      </q-item>

      <q-separator />

      <q-item
        clickable
        disable
        to="/"
        exact
        >
        <q-item-section avatar>
          <q-icon name="mdi-server-network" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ $t('Service Status') }}</q-item-label>
          <q-item-label caption>{{ $t('Service status and model(s) run queue') }}</q-item-label>
        </q-item-section>
      </q-item>

    </q-list>
  </q-drawer>

  <q-page-container>
    <router-view
      :refresh-tickle="refreshTickle"
      @download-select="onDownloadSelect"
      >
    </router-view>
  </q-page-container>

  <model-info-dialog :show-tickle="modelInfoTickle" :digest="modelDigest"></model-info-dialog>

  <q-inner-loading :showing="loadWait">
    <q-spinner-gears size="xl" color="primary" />
  </q-inner-loading>

</q-layout>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import languages from 'quasar/lang/index.json'
import * as Mdf from 'src/model-common'
import ModelInfoDialog from 'components/ModelInfoDialog.vue'

export default {
  name: 'MainLayout',
  components: { ModelInfoDialog },

  data () {
    return {
      leftDrawerOpen: false,
      refreshTickle: false,
      loadDone: false,
      loadWait: false,
      isBeta: true,
      modelInfoTickle: false,
      langCode: this.$q.lang.getLocale(),
      appLanguages: languages.filter(lang => ['fr', 'en-us'].includes(lang.isoName))
    }
  },

  computed: {
    mainTitle () {
      const t = Mdf.modelTitle(this.theModel)
      return (t !== '') ? t : 'OpenM++'
    },
    isModel () { return Mdf.isModel(this.theModel) },
    modelName () { return Mdf.modelName(this.theModel) },
    modelDigest () { return Mdf.modelDigest(this.theModel) },
    runTextCount () { return Mdf.runTextCount(this.runTextList) },
    worksetTextCount () { return Mdf.worksetTextCount(this.worksetTextList) },
    loginUrl () { return Mdf.configEnvValue(this.serverConfig, 'OM_CFG_LOGIN_URL') },
    logoutUrl () { return Mdf.configEnvValue(this.serverConfig, 'OM_CFG_LOGOUT_URL') },

    ...mapState('model', {
      theModel: state => state.theModel,
      runTextList: state => state.runTextList,
      worksetTextList: state => state.worksetTextList
    }),
    ...mapGetters('model', {
      modelCount: 'modelListCount'
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl,
      serverConfig: state => state.config
    }),
    ...mapState('uiState', {
      runDigestSelected: state => state.runDigestSelected,
      worksetNameSelected: state => state.worksetNameSelected,
      taskNameSelected: state => state.taskNameSelected
    })
  },

  watch: {
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
    }
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
      this.refreshTickle = !this.refreshTickle
    },

    // view download page
    onDownloadSelect (digest) {
      if (!digest) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to download model') })
        return
      }
      this.$router.push('/download-list/model/' + digest) // show download model page for model selected from model list
    },

    // receive server configuration, including configuration of model catalog and run catalog
    async doConfigRefresh () {
      this.loadDone = false
      this.loadWait = true

      const u = this.omsUrl + '/api/service/config'
      try {
        // send request to the server
        const response = await this.$axios.get(u)
        this.dispatchServerConfig(response.data) // update server config in store
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or configuration retrive failed.', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or configuration retrive failed.') })
      }

      this.loadWait = false
    },

    ...mapActions('uiState', {
      dispatchUiLang: 'uiLang'
    }),
    ...mapActions('serverState', {
      dispatchServerConfig: 'serverConfig'
    })
  },

  mounted () {
    this.doConfigRefresh()
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
</script>

<style lang="scss" scope="local">
  .title-link {
    text-decoration: none;
    color: white;
    // display: inline-block;
  }
</style>
