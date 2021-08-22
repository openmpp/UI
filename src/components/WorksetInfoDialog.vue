<template>
<q-dialog v-model="showDlg">
  <q-card>

    <q-card-section class="text-h6 bg-primary text-white">{{ title }}</q-card-section>

    <q-card-section class="q-pt-none text-body1">

      <div class="om-note-table mono q-pb-md">
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Name') }}:</span><span class="om-note-cell">{{ worksetText.Name }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Updated') }}:</span><span class="om-note-cell">{{ lastDateTime }}</span>
        </div>
        <div v-if="worksetText.BaseRunDigest" class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Based on run') }}:</span><span class="om-note-cell">{{ worksetText.BaseRunDigest }}</span>
        </div>
        <div v-if="worksetText.IsReadonly" class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Read only') }}</span><span class="om-note-cell"></span>
        </div>
        <div v-if="!worksetText.BaseRunDigest && paramCount > 0" class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Parameters') }}:</span><span class="om-note-cell">{{ paramCount }}</span>
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
  name: 'WorksetInfoDialog',

  props: {
    showTickle: { type: Boolean, default: false },
    modelDigest: { type: String, default: '' },
    worksetName: { type: String, default: '' }
  },

  data () {
    return {
      showDlg: false,
      worksetText: Mdf.emptyWorksetText(),
      title: '',
      notes: '',
      lastDateTime: '',
      paramCount: 0
    }
  },

  computed: {
    ...mapGetters('model', {
      worksetTextByName: 'worksetTextByName'
    })
  },

  watch: {
    showTickle () {
      this.worksetText = this.worksetTextByName({ ModelDigest: this.modelDigest, Name: this.worksetName })
      if (!Mdf.isNotEmptyWorksetText(this.worksetText)) {
        console.warn('workset not found by name:', this.worksetName)
        this.$q.notify({ type: 'negative', message: this.$t('Input scenario not found') })
        return
      }

      // set basic workset info
      this.title = Mdf.descrOfTxt(this.worksetText) || this.worksetText.Name
      this.lastDateTime = Mdf.dtStr(this.worksetText.UpdateDateTime)
      this.paramCount = Mdf.lengthOf(this.worksetText.Param)

      // workset notes: convert from markdown to html
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

      this.notes = marked(sanitizeHtml(Mdf.noteOfTxt(this.worksetText)))

      this.showDlg = true
    }
  }
}
</script>

<style scope="local">
  @import '~highlight.js/styles/github.css'
</style>
