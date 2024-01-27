<template>
<q-dialog full-width v-model="showDlg">
  <q-card>

    <q-card-section class="row text-h6 bg-primary text-white">
      <div>{{ title }}</div><q-space /><q-btn icon="mdi-close" flat dense round v-close-popup />
    </q-card-section>

    <q-card-section class="text-body1">

      <table class="pt-table">
        <tbody>
          <tr>
            <td class="pt-col-head-left">{{ $t('Name') }}</td>
            <td class="pt-cell-left mono">{{ modelName }}</td>
          </tr>
          <tr>
            <td class="pt-col-head-left">{{ $t('Version') }}</td>
            <td class="pt-cell-left mono">{{ version }}</td>
          </tr>
          <tr>
            <td class="pt-col-head-left">{{ $t('Created') }}</td>
            <td class="pt-cell-left mono">{{ createDateTime }}</td>
          </tr>
          <tr>
            <td class="pt-col-head-left">{{ $t('Digest') }}</td>
            <td class="pt-cell-left mono">{{ digest }}</td>
          </tr>
          <tr v-if="dir">
            <td class="pt-col-head-left">{{ $t('Folder') }}</td>
            <td class="pt-cell-left mono">{{ dir }}</td>
          </tr>
          <tr v-if="docLink">
            <td class="pt-col-head-center"><q-icon name="mdi-book-open" size="md" color="primary"/></td>
            <td class="pt-cell-left">
              <a target="_blank" :href="'doc/' +docLink" class="file-link"><q-icon name="mdi-book-open" size="md" color="primary" class="q-pr-sm"/>{{ $t('Model Documentation') }}</a>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="notes" class="q-pt-md" v-html="notes" />

    </q-card-section>

    <q-card-actions align="right">
      <q-btn flat label="OK" color="primary" v-close-popup />
    </q-card-actions>

  </q-card>
</q-dialog>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'
import { marked } from 'marked'
import hljs from 'highlight.js'
import sanitizeHtml from 'sanitize-html'

export default {
  name: 'ModelInfoDialog',

  props: {
    showTickle: { type: Boolean, default: false },
    digest: { type: String, default: '' }
  },

  data () {
    return {
      showDlg: false,
      title: '',
      notes: '',
      modelName: '',
      createDateTime: '',
      version: '',
      dir: '',
      docLink: ''
    }
  },

  computed: {
    ...mapState('model', {
      modelList: state => state.modelList
    }),
    ...mapGetters('model', {
      modelByDigest: 'modelByDigest',
      modelLanguage: 'modelLanguage'
    }),
    ...mapState('serverState', {
      serverConfig: state => state.config
    }),
    ...mapState('uiState', {
      uiLang: state => state.uiLang
    })
  },

  watch: {
    showTickle () {
      // find model in model list by digest
      const m = this.modelByDigest(this.digest)
      if (!Mdf.isModel(m)) {
        console.warn('model not found by digest:', this.digest)
        this.$q.notify({ type: 'negative', message: this.$t('Model not found') })
        return
      }

      // set basic model info
      this.title = Mdf.modelTitle(m)
      this.modelName = Mdf.modelName(m)
      this.createDateTime = Mdf.dtStr(m.Model.CreateDateTime)
      this.version = m.Model.Version || ''
      this.dir = Mdf.modelDirByDigest(this.digest, this.modelList)

      // model notes: convert from markdown to html
      marked.setOptions({
        renderer: new marked.Renderer(),
        highlight: (code, lang) => {
          const language = hljs.getLanguage(lang) ? lang : 'plaintext'
          return hljs.highlight(code, { language }).value
        },
        pedantic: false,
        gfm: true,
        breaks: false,
        smartLists: true
        // smartypants: true
      })

      this.notes = marked.parse(sanitizeHtml(Mdf.noteOfDescrNote(m)))

      // get link to model documentation
      this.docLink = this.serverConfig.IsModelDoc ? Mdf.modelDocLink(this.digest, this.modelList, this.uiLang, this.modelLanguage) : ''

      this.showDlg = true
    }
  }
}
</script>

<style scope="local">
  @import '~highlight.js/styles/github.css'
</style>

<style lang="scss" scope="local">
  .file-link {
    text-decoration: none;
  }
  .pt-table {
    text-align: left;
    border-collapse: collapse;
  }
  .pt-cell {
    padding: 0.25rem;
    // font-size: 0.875rem;
    border: 1px solid lightgrey;
  }
  .pt-head {
    @extend .pt-cell;
    text-align: center;
    background-color: whitesmoke;
  }
  .pt-row-head {
    @extend .pt-cell;
    background-color: whitesmoke;
  }
  .pt-col-head {
    @extend .pt-cell;
    background-color: whitesmoke;
  }
  .pt-col-head-left {
    @extend .pt-col-head;
    background-color: whitesmoke;
  }
  .pt-col-head-center {
    @extend .pt-col-head;
    background-color: whitesmoke;
  }
  .pt-cell-left {
    text-align: left;
    @extend .pt-cell;
  }
  .pt-cell-right {
    text-align: right;
    @extend .pt-cell;
  }
  .pt-cell-center {
    text-align: center;
    @extend .pt-cell;
  }
</style>
