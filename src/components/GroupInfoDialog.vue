<template>
<q-dialog full-width v-model="showDlg">
  <q-card>

    <q-card-section class="row text-h6 bg-primary text-white">
      <div>{{ title }}</div><q-space /><q-btn icon="mdi-close" flat dense round v-close-popup />
    </q-card-section>

    <q-card-section class="q-pt-none text-body1">
      <div class="om-note-table mono q-pb-md">
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Name') }}:</span><span class="om-note-cell">{{ groupName }}</span>
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
import { mapState } from 'vuex'
import * as Mdf from 'src/model-common'
import { marked } from 'marked'
import hljs from 'highlight.js'
import sanitizeHtml from 'sanitize-html'

export default {
  name: 'GroupInfoDialog',

  props: {
    showTickle: { type: Boolean, default: false },
    groupName: { type: String, default: '' }
  },

  data () {
    return {
      showDlg: false,
      title: '',
      notes: ''
    }
  },

  computed: {
    ...mapState('model', {
      theModel: state => state.theModel
    })
  },

  watch: {
    showTickle () {
      const groupText = Mdf.groupTextByName(this.theModel, this.groupName)
      this.title = Mdf.descrOfDescrNote(groupText) || this.groupName

      // notes: convert from markdown to html
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

      this.notes = marked.parse(sanitizeHtml(Mdf.noteOfDescrNote(groupText)))

      this.showDlg = true
    }
  }
}
</script>

<style scope="local">
  @import '~highlight.js/styles/github.css'
</style>
