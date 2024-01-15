<template>
<q-dialog full-width v-model="showDlg">
  <q-card>

    <q-card-section class="row text-h6 bg-primary text-white">
      <div>{{ title }}</div><q-space /><q-btn icon="mdi-close" flat dense round v-close-popup />
    </q-card-section>

    <q-card-section class="q-pt-none text-body1">

      <div class="om-note-table mono q-pb-md">
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Name') }}:</span><span class="om-note-cell">{{ modelName }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Version') }}:</span><span class="om-note-cell">{{ version }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Created') }}:</span><span class="om-note-cell">{{ createDateTime }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Digest') }}:</span><span class="om-note-cell">{{ digest }}</span>
        </div>
        <div v-if="dir" class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Folder') }}:</span><span class="om-note-cell">{{ dir }}</span>
        </div>
      </div>

      <div v-if="docLink" class="q-pb-md">
        <a target="blank" :href="docLink">{{ $t('Model Documentation') }}</a>
      </div>

      <div v-if="notes" v-html="notes" />
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
      this.docLink = ''
      const me = Mdf.modelExtraByDigest(this.digest, this.modelList) // content of ModelName.extra.json file
      const docLst = me?.ModelDoc

      if (Array.isArray(docLst) && docLst.length > 0) {
        const uilc = this.uiLang.toLowerCase() // find link to model documentation in UI language
        const pLst = uilc.split(/[-_]/)
        const flc = (Array.isArray(pLst) && pLst.length > 0) ? pLst[0] : ''
        let fLink = ''

        for (let k = 0; k < docLst.length; k++) {
          const dlc = (docLst[k]?.LangCode || '')
          if (typeof dlc === typeof 'string') {
            if (dlc.toLowerCase() === uilc) {
              this.docLink = docLst[k]?.Link || ''
              break
            }
            if (fLink === '') fLink = (dlc.toLowerCase() === flc) ? (docLst[k]?.Link || '') : ''
          }
        }
        if (this.docLink === '' && fLink !== '') {
          this.docLink = fLink // match UI language by code: en-US => en
        }

        if (this.docLink === '') {
          const mlc = this.modelLanguage.LangCode.toLowerCase() // find link to model documentation in model language

          for (let k = 0; k < docLst.length; k++) {
            const dlc = (docLst[k]?.LangCode || '')
            if ((typeof dlc === typeof 'string') && dlc.toLowerCase() === mlc) {
              this.docLink = docLst[k]?.Link || ''
              break
            }
          }
        }
        // if link to model documentation not found by language then use first link
        if (this.docLink === '') this.docLink = docLst[0]?.Link || ''
      }

      this.showDlg = true
    }
  }
}
</script>

<style scope="local">
  @import '~highlight.js/styles/github.css'
</style>
