<template>
<q-dialog v-model="showDlg">
  <q-card>

    <q-card-section>
      <div class="text-h6">{{ title }}</div>
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
import { mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'
import marked from 'marked'
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
      version: ''
    }
  },

  computed: {
    ...mapGetters('model', {
      modelByDigest: 'modelByDigest'
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

      this.notes = marked(sanitizeHtml(Mdf.noteOfDescrNote(m)))

      this.showDlg = true
    }
  }
}
</script>

<style scope="local">
  @import '~highlight.js/styles/github.css'
</style>
