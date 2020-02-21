<template>

<div id="model-list-page" class="main-container mdc-typography mdc-typography--body1">

  <div v-if="loadDone" class="main-container">
    <ul class="main-list mdc-list mdc-list--two-line">

      <li v-for="m in modelList" :key="m.Model.Digest" class="mdc-list-item">

        <template v-if="isModel(m)">
          <span
            @click="showModelNote(m)"
            class="om-note-link mdc-list-item__graphic material-icons"
            :title="'About ' + m.Model.Name"
            :alt="'About ' + m.Model.Name">description</span>
          <router-link
            :to="'/model/' + m.Model.Digest"
            class="ahref-model"
            :title="m.Model.Name + ' model'"
            :alt="m.Model.Name + ' model'"
            >
            <span class="mdc-list-item__text">
              <span class="mdc-list-item__primary-text">{{ m.Model.Name }}</span>
              <span class="mdc-list-item__secondary-text">{{ descrOf(m) }}</span>
            </span>
          </router-link>
        </template>

      </li>

    </ul>
  </div>
  <div v-else>
    <span v-if="loadWait" class="material-icons om-mcw-spin">hourglass_empty</span><span class="mdc-typography--caption">{{msg}}</span>
  </div>

  <om-mcw-dialog ref="modelInfoDlg" id="model-info-dlg" :scrollable="true" acceptText="OK">
    <template #header><span>{{titleNoteDlg}}</span></template>
    <div>{{textNoteDlg}}</div>
    <div class="note-table mono">
      <div class="note-row">
        <span class="note-cell">Name:</span><span class="note-cell">{{nameNoteDlg}}</span>
      </div>
      <div class="note-row">
        <span class="note-cell">Version:</span><span class="note-cell">{{versionNoteDlg}}</span>
      </div>
      <div class="note-row">
        <span class="note-cell">Created:</span><span class="note-cell">{{createdNoteDlg}}</span>
      </div>
      <div class="note-row">
        <span class="note-cell">Digest:</span><span class="note-cell">{{digestNoteDlg}}</span>
      </div>
    </div>
  </om-mcw-dialog>

</div>

</template>

<script>
import axios from 'axios'
import { mapGetters, mapActions } from 'vuex'
import { GET, DISPATCH } from '@/store'
import * as Mdf from '@/modelCommon'
import OmMcwDialog from '@/om-mcw/OmMcwDialog'

export default {
  props: {
    refreshTickle: { type: Boolean, defaut: false }
  },

  data () {
    return {
      loadDone: false,
      loadWait: false,
      titleNoteDlg: '',
      textNoteDlg: '',
      nameNoteDlg: '',
      createdNoteDlg: '',
      digestNoteDlg: '',
      versionNoteDlg: '',
      msg: ''
    }
  },

  computed: {
    ...mapGetters({
      uiLang: GET.UI_LANG,
      modelList: GET.MODEL_LIST,
      omppServerUrl: GET.OMPP_SRV_URL
    })
  },

  watch: {
    // refresh button handler
    refreshTickle () {
      this.doRefresh()
    }
  },

  methods: {
    // return true if Model not empty
    isModel (md) { return Mdf.isModel(md) },

    // return description from DescrNote
    descrOf (md) {
      return Mdf.descrOfDescrNote(md)
    },

    // if notes not empty
    isModelNote (md) {
      return Mdf.isNoteOfDescrNote(md)
    },
    // then show model notes
    showModelNote (md) {
      this.titleNoteDlg = Mdf.descrOfDescrNote(md)
      this.textNoteDlg = Mdf.noteOfDescrNote(md)
      this.nameNoteDlg = Mdf.modelName(md)
      this.createdNoteDlg = Mdf.dtStr(md.Model.CreateDateTime)
      this.digestNoteDlg = Mdf.modelDigest(md)
      this.versionNoteDlg = Mdf.isModel(md) ? (md.Model.Version || '') : ''
      this.$refs.modelInfoDlg.open()
    },

    // refersh model list
    async doRefresh () {
      this.loadDone = false
      this.loadWait = true
      this.msg = 'Loading...'
      let u = this.omppServerUrl + '/api/model-list/text' + (this.uiLang !== '' ? '/lang/' + this.uiLang : '')
      try {
        const response = await axios.get(u)
        this.dispatchModelList(response.data) // update model list in store
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        this.msg = 'Server offline or no models published.'
        console.log('Server offline or no models published.', em)
      }
      this.loadWait = false
    },

    ...mapActions({
      dispatchModelList: DISPATCH.MODEL_LIST
    })
  },

  mounted () {
    // if model list already loaded then exit
    if (Mdf.isModelList(this.modelList) && this.modelList.length > 0) {
      this.loadDone = true
      return
    }
    this.doRefresh() // load new model list
  },

  components: { OmMcwDialog }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
  @import "@material/theme/mdc-theme";

  /* model list: containers and list itself */
  .main-container {
    display: block;
    overflow-y: auto;
  }
  .main-list {
    padding-left: 0;
  }

  /* model a link */
  .ahref-model {
    display: block;
    width: 100%;
    height: 100%;
    text-decoration: none;
    @extend .mdc-theme--text-primary-on-background;
    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }
  }

  /* note dialog */
  .note-table {
    display: table;
    margin-top: 0.5rem;
  }
  .note-row {
    display: table-row;
  }
  .note-cell {
    display: table-cell;
    white-space: nowrap;
    &:first-child {
      padding-right: 0.5rem;
    }
  }
</style>
