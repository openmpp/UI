<template>
<q-dialog full-width v-model="showDlg">
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
        <div v-if="paramCount > 0" class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Parameters') }}:</span><span class="om-note-cell">{{ paramCount }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ worksetText.IsReadonly ? $t('Read only') : $t('Read and write') }}</span><span class="om-note-cell"></span>
        </div>
      </div>

      <div v-if="notes" v-html="notes" />
    </q-card-section>

    <q-card-actions align="right">
      <q-btn flat label="OK" color="primary" v-close-popup />
    </q-card-actions>

  </q-card>

  <refresh-workset v-if="(modelDigest || '') !== '' && (wsName || '') !== ''"
    :model-digest="modelDigest"
    :workset-name="wsName"
    :refresh-workset-tickle="refreshWsTickle"
    @done="doneWsLoad"
    @wait="loadWsWait = true"
    >
  </refresh-workset>

</q-dialog>
</template>

<script>
import { mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'
import RefreshWorkset from 'components/RefreshWorkset.vue'
import marked from 'marked'
import hljs from 'highlight.js'
import sanitizeHtml from 'sanitize-html'

export default {
  name: 'WorksetInfoDialog',
  components: { RefreshWorkset },

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
      paramCount: 0,
      refreshWsTickle: false,
      loadWsWait: false,
      wsName: ''
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
      this.wsName = '' // clear refresh workset

      // set basic workset info
      this.title = Mdf.descrOfTxt(this.worksetText) || this.worksetText.Name
      this.lastDateTime = Mdf.dtStr(this.worksetText.UpdateDateTime)

      this.paramCount = Mdf.lengthOf(this.worksetText.Param)
      if (this.paramCount <= 0) this.wsName = this.worksetName // start refresh workset

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
  },

  methods: {
    // update workset info on refresh workset completed
    doneWsLoad (isSuccess, name) {
      this.loadWsWait = false
      this.wsName = ''

      if (isSuccess && (name || '') === this.worksetName) {
        const wsText = this.worksetTextByName({ ModelDigest: this.modelDigest, Name: this.worksetName })

        if (Mdf.isNotEmptyWorksetText(wsText)) {
          this.paramCount = Mdf.lengthOf(wsText.Param)
        } else {
          console.warn('workset not found by name:', name)
        }
      }
    }
  }
}
</script>

<style scope="local">
  @import '~highlight.js/styles/github.css'
</style>
