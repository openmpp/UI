<template>

<div id="app" class="mdc-typography">

  <header class="topbar-container mdc-top-app-bar mdc-top-app-bar--fixed" >
    <div class="mdc-top-app-bar__row">

      <section class="mdc-top-app-bar__section mdc-top-app-bar__section--align-start">

        <button
          @click="toggleDrawer"
          class="material-icons mdc-top-app-bar__navigation-icon mdc-icon-button" title="Menu" alt="Menu">menu</button>

        <router-link
          v-if="isModel"
          :to="'/model/' + modelDigest"
          :title="modelName"
          :alt="modelName"
          class="mdc-top-app-bar__title topbar-title-link">
          {{ mainTitle }}
        </router-link>
        <span v-else class="mdc-top-app-bar__title">{{ mainTitle }}</span>

      </section>

      <section class="topbar-last-section mdc-top-app-bar__section mdc-top-app-bar__section--align-end">

        <button
          v-if="isModel"
          @click="showModelNote"
          class="material-icons mdc-top-app-bar__action-item mdc-icon-button"
          :alt="modelName + ' notes'"
          :title="modelName + ' notes'">description</button>
        <button
          @click="doRefresh"
          class="material-icons mdc-top-app-bar__action-item mdc-icon-button"
          title="Refresh"
          alt="Refresh">refresh</button>
        <a v-if="loginUrl" :href="loginUrl"
          class="material-icons mdc-top-app-bar__action-item mdc-icon-button"
          title="Login" alt="Login">account_circle</a>
        <a v-if="logoutUrl" :href="logoutUrl"
          class="material-icons mdc-top-app-bar__action-item mdc-icon-button"
          title="Logout" alt="Logout">perm_identity</a>
        <span id="top-bar-more-menu" class="mdc-menu-surface--anchor">
          <button
            @click="toggleMore"
            class="material-icons mdc-top-app-bar__action-item mdc-icon-button"
            title="More"
            alt="More">more_vert</button>

          <om-mcw-menu ref="more">
            <a href="#" @click="onLangClick('EN')" class="mdc-list-item" alt="English" role="menuitem" tabindex="0">
              <span class="mdc-list-item__text">EN English</span>
            </a>
            <a href="#" @click="onLangClick('FR')" class="mdc-list-item" alt="Français" role="menuitem" tabindex="0">
              <span class="mdc-list-item__text">FR Français</span>
            </a>
            <hr class="mdc-list-divider" role="separator" />
            <router-link to="/settings" class="mdc-list-item" alt="Settings" role="menuitem" tabindex="0">
              <i class="menu-start mdc-list-item__graphic material-icons" aria-hidden="true">settings</i>
              <span class="mdc-list-item__text">Settings</span>
            </router-link>
            <router-link to="/license" class="mdc-list-item" alt="OpenM++ licence" role="menuitem" tabindex="0">
              <i class="menu-start mdc-list-item__graphic material-icons" aria-hidden="true">info_outline</i>
              <span class="mdc-list-item__text">Licence</span>
            </router-link>
            <hr class="mdc-list-divider" role="separator" />
            <a href="//openmpp.org/" target="_blank" class="mdc-list-item" alt="OpenM++ website" role="menuitem" tabindex="0">
              <i class="menu-start mdc-list-item__graphic material-icons" aria-hidden="true">link</i>
              <span class="mdc-list-item__text">OpenM++ website</span>
            </a>
            <a href="//ompp.sourceforge.io/wiki/" target="_blank" class="mdc-list-item" alt="OpenM++ wiki" role="menuitem" tabindex="0">
              <i class="menu-start mdc-list-item__graphic material-icons" aria-hidden="true">link</i>
              <span class="mdc-list-item__text">OpenM++ wiki</span>
            </a>
          </om-mcw-menu>
        </span>

      </section>
    </div>

  </header>

  <om-mcw-drawer ref="drawer" class="mdc-drawer--dismissible mdc-top-app-bar--fixed-adjust">
    <div class="mdc-list-group" role="menu">

      <nav class="mdc-list">
        <router-link to="/" class="mdc-list-item" alt="Models list" role="menuitem">
          <i class="menu-start mdc-list-item__graphic material-icons" aria-hidden="true">home</i>
          <span class="mdc-list-item__text">Models</span>
          <span v-if="modelCount > 0" class="menu-count mdc-list-item__meta">{{modelCount}}</span>
        </router-link>
      </nav>
      <hr class="mdc-list-divider" role="separator" />

      <nav class="mdc-list" :class="{'disable-model-menu': !isModel}">

        <router-link
          :to="'/model/' + modelDigest + '/run-list'"
          :class="{'disable-item': !isModel}" class="mdc-list-item"
          alt="Model runs"
          role="menuitem">
          <i :class="{'disable-icon': !isModel}" class="menu-start mdc-list-item__graphic material-icons" aria-hidden="true">folder</i>
          <span class="mdc-list-item__text">Model Runs</span>
          <span v-if="isModel" class="menu-count mdc-list-item__meta">{{runTextCount}}</span>
        </router-link>

        <router-link
          :to="'/model/' + modelDigest + '/run/' + (theSelected.run ? theSelected.run.RunDigest || '' : '') + '/parameter-list'"
          :class="{'disable-item': !isRunSelected}" class="mdc-list-item"
          alt="Model parameters"
          role="menuitem">
          <i :class="{'disable-icon': !isRunSelected}" class="menu-start mdc-list-item__graphic material-icons" aria-hidden="true">input</i>
          <span class="mdc-list-item__text">Parameters</span>
          <span v-if="isModel" class="menu-count mdc-list-item__meta">{{modelParamCount}}</span>
        </router-link>

        <router-link
          :to="'/model/' + modelDigest + '/run/'+ (theSelected.run ? theSelected.run.RunDigest || '' : '') + '/table-list'"
          :class="{'disable-item': !isRunSelected}" class="mdc-list-item"
          alt="Output tables"
          role="menuitem">
          <i :class="{'disable-icon': !isRunSelected}" class="menu-start mdc-list-item__graphic material-icons" aria-hidden="true">grid_on</i>
          <span class="mdc-list-item__text">Output Tables</span>
          <span v-if="isModel" class="menu-count mdc-list-item__meta">{{modelTableCount}}</span>
        </router-link>
        <hr class="mdc-list-divider menu-divider-inset" role="separator" />

        <router-link
          :to="'/model/' + modelDigest + '/set-list'"
          :class="{'disable-item': !isModel}" class="mdc-list-item"
          alt="Input sets"
          role="menuitem">
          <i :class="{'disable-icon': !isModel}" class="menu-start mdc-list-item__graphic material-icons" aria-hidden="true">folder</i>
          <span class="mdc-list-item__text">Input Sets</span>
          <span v-if="isModel" class="menu-count mdc-list-item__meta">{{worksetTextCount}}</span>
        </router-link>

        <router-link
          :to="'/model/' + modelDigest + '/set/' + (theSelected.ws ? theSelected.ws.Name || '' : '') + '/parameter-list'"
          :class="{'disable-item': !isWorksetSelected}" class="mdc-list-item"
          alt="Model parameters"
          role="menuitem">
          <i :class="{'disable-icon': !isWorksetSelected}" class="menu-start mdc-list-item__graphic material-icons" aria-hidden="true">mode_edit</i>
          <span class="mdc-list-item__text">Edit Parameters</span>
          <span v-if="isModel" class="menu-count mdc-list-item__meta">{{modelParamCount}}</span>
        </router-link>
        <hr class="mdc-list-divider menu-divider-inset" role="separator" />

        <router-link
          :to="'/model/' + modelDigest + '/new-run-model/set/'+ (theSelected.ws ? theSelected.ws.Name || '' : '')"
          :class="{'disable-item': !isWorksetSelected}" class="mdc-list-item"
          alt="Run the model"
          role="menuitem">
          <i :class="{'disable-icon': !isWorksetSelected}" class="menu-start mdc-list-item__graphic material-icons" aria-hidden="true">directions_run</i>
          <span class="mdc-list-item__text">Run the Model</span>
        </router-link>

      </nav>
      <!--
      <hr class="mdc-list-divider" role="separator" />

      <nav class="mdc-list">
        <router-link to="/service" class="mdc-list-item" alt="Service status and model(s) run queue" role="menuitem">
          <i class="menu-start mdc-list-item__graphic material-icons" aria-hidden="true">cloud_queue</i>
          <span class="mdc-list-item__text">Service Status</span>
        </router-link>
      </nav>
      -->

    </div>
  </om-mcw-drawer>

  <div class="app-content mdc-drawer-app-content mdc-top-app-bar--fixed-adjust">
    <main class="main-content">

      <div v-if="!loadDone" class="mdc-typography--caption">{{msgLoad}}</div>

      <router-view :refresh-tickle="refreshTickle"></router-view>

      <om-mcw-dialog ref="theModelInfoDlg" id="the-model-info-dlg" :scrollable="true" acceptText="OK">
        <template #header><span>{{titleNoteDlg}}</span></template>
        <div>{{textNoteDlg}}</div>
        <br/>
        <div class="mono">Name:&nbsp;&nbsp;&nbsp;&nbsp;{{nameNoteDlg}}</div>
        <div class="mono">Created:&nbsp;{{createdNoteDlg}}</div>
        <div class="mono">Digest:&nbsp;&nbsp;{{digestNoteDlg}}</div>
      </om-mcw-dialog>

    </main>
  </div>

</div>

</template>

<script>
import axios from 'axios'
import { mapGetters, mapActions } from 'vuex'
import { GET, DISPATCH } from './store'
import * as Mdf from './modelCommon'
import OmMcwDrawer from '@/om-mcw/OmMcwDrawer'
import OmMcwMenu from '@/om-mcw/OmMcwMenu'
import OmMcwDialog from '@/om-mcw/OmMcwDialog'

export default {
  components: { OmMcwDrawer, OmMcwMenu, OmMcwDialog },

  name: 'App',
  data () {
    return {
      refreshTickle: false,
      titleNoteDlg: '',
      textNoteDlg: '',
      nameNoteDlg: '',
      createdNoteDlg: '',
      digestNoteDlg: '',
      loadDone: false,
      loadWait: false,
      msgLoad: ''
    }
  },

  computed: {
    mainTitle () {
      let t = Mdf.modelTitle(this.theModel)
      return (t !== '') ? t : 'OpenM++'
    },
    isModel () { return Mdf.isModel(this.theModel) },
    modelName () { return Mdf.modelName(this.theModel) },
    modelDigest () { return Mdf.modelDigest(this.theModel) },
    isModelNote () { return Mdf.isNoteOfDescrNote(this.theModel) },
    modelCount () { return this.modelListCount },
    modelParamCount () { return Mdf.paramCount(this.theModel) },
    modelTableCount () { return Mdf.outTableCount(this.theModel) },
    runTextCount () { return Mdf.runTextCount(this.runTextList) },
    worksetTextCount () { return Mdf.worksetTextCount(this.worksetTextList) },
    isRunSelected () { return this.theSelected.ModelDigest && this.theSelected.run && this.theSelected.run.RunDigest },
    isWorksetSelected () { return this.theSelected.ModelDigest && this.theSelected.ws && this.theSelected.ws.Name },
    loginUrl () { return this.serverConfig.LoginUrl },
    logoutUrl () { return this.serverConfig.LogoutUrl },

    ...mapGetters({
      omppServerUrl: GET.OMPP_SRV_URL,
      serverConfig: GET.CONFIG,
      theModel: GET.THE_MODEL,
      modelListCount: GET.MODEL_LIST_COUNT,
      runTextList: GET.RUN_TEXT_LIST,
      worksetTextList: GET.WORKSET_TEXT_LIST,
      theSelected: GET.THE_SELECTED
    })
  },

  methods: {
    toggleDrawer () {
      this.$refs.drawer.toggle()
    },
    toggleMore () {
      this.$refs.more.toggle()
    },
    doRefresh () {
      this.doConfigRefresh()
      this.refreshTickle = !this.refreshTickle
    },

    // more menu: change language
    onLangClick (lc) {
      if (lc) {
        this.dispatchUiLang(lc)
        this.refreshTickle = !this.refreshTickle
      }
    },

    // show model notes
    showModelNote () {
      const md = this.theModel
      this.titleNoteDlg = Mdf.descrOfDescrNote(md)
      this.textNoteDlg = Mdf.noteOfDescrNote(md)
      this.nameNoteDlg = Mdf.modelName(md)
      this.createdNoteDlg = Mdf.dtStr(md.Model.CreateDateTime)
      this.digestNoteDlg = Mdf.modelDigest(md)
      this.$refs.theModelInfoDlg.open()
    },

    // receive server configuration, including configuration of model catalog and run catalog
    async doConfigRefresh () {
      this.loadDone = false
      this.loadWait = true
      this.msgLoad = ''

      let u = this.omppServerUrl + '/api/service/config'
      try {
        // send request to the server
        const response = await axios.get(u)
        this.dispatchConfig(response.data) // update server config in store
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        this.msgLoad = '<Server offline or run status retrive failed>'
        console.log('Server offline or run status retrive failed.', em)
      }
      this.loadWait = false
    },

    ...mapActions({
      dispatchConfig: DISPATCH.CONFIG,
      dispatchUiLang: DISPATCH.UI_LANG
    })
  },

  mounted () {
    this.doConfigRefresh()
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
  @import "@material/theme/mdc-theme";
  @import "@material/list/mdc-list";
  @import "@/om-mcw.scss";

  /* app body: drawer on left side and content */
  #app {
    height: 100%;
    width: 100%;
    display: flex;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    overflow-y: hidden;
  }

  /* content: topbar and main page body */
  .app-content {
    flex: auto;
    overflow: hidden;
    position: relative;
  }
  .main-content {
    overflow: auto;
    height: 100%;
    padding-left: 1rem;
  }
  .topbar-container {
    flex: 0 0 auto;
    z-index: 7; // from MCW documentation
  }

  /* disable drawer model menu and links if no current model selected */
  .disable-model-menu {
    @extend .mdc-theme--text-disabled-on-background;
  }
  a.disable-item, div.disable-item {
    pointer-events: none;
    cursor: default;
    @extend .mdc-list-item--disabled;
  }
  .disable-icon {
    @extend .mdc-theme--text-disabled-on-background;
  }

  /* adjust drawer model menu margins */
  .menu-start {
    margin-right: 0.5rem;
  }
  span.menu-count.mdc-list-item__meta {
    width: 3rem;
    text-align: right;
    padding-right: 1px;
    @extend .mdc-theme--on-primary;
    @extend .mdc-theme--primary-bg;
    @extend .medium-wt;
  }
  hr.menu-divider-inset {
    margin-left: 3rem;
    /* @extend .mdc-list-divider--inset; */
  }

  /* main title: model a link */
  .topbar-title-link {
    @extend .mdc-theme--on-primary;
  }

  /* topbar links */
  .mdc-top-app-bar a {
    text-decoration: none;
  }

  /* topbar last section: shrink to fit */
  .topbar-last-section {
    flex: none;
  }
</style>

<!-- import refresh spin animation shared style -->
<style lang="scss">
  @import "./refresh-spin.scss";
  @import "./om-mcw.scss";
</style>

<!-- import MDC styles -->
<style lang="scss">
  @import "@material/theme/mdc-theme";
  @import "@material/typography/mdc-typography";
  @import "@material/button/mdc-button";
  @import '@material/icon-button/mdc-icon-button';
  @import "@material/dialog/mdc-dialog";
  @import "@material/top-app-bar/mdc-top-app-bar";
  @import "@material/drawer/mdc-drawer";
  @import "@material/list/mdc-list";
  @import "@material/menu/mdc-menu";
</style>
