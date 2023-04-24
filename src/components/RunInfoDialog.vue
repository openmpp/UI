<template>
<q-dialog full-width v-model="showDlg">
  <q-card>

    <q-card-section class="row text-h6 bg-primary text-white">
      <div>{{ title }}</div><q-space /><q-btn icon="mdi-close" flat dense round v-close-popup />
    </q-card-section>

    <q-card-section class="q-pt-none text-body1">

      <div class="om-note-table mono q-pb-md">
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Name') }}:</span><span class="om-note-cell">{{ runText.Name }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Status') }}:</span>
          <span class="om-note-cell">{{ statusDescr }}<span v-if="isNowArchive" class="text-white bg-negative"> {{ $t('Archiving now') }}</span><span v-if="isSoonArchive" class="bg-warning"> {{ $t('Archiving soon') }}</span></span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Sub-values Count') }}:</span><span class="om-note-cell">{{ runText.SubCount || 0 }}</span>
        </div>
        <div v-if="!isSucess" class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Sub-values completed') }}:</span><span class="om-note-cell">{{ runText.SubCompleted || 0 }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Started') }}:</span><span class="om-note-cell">{{ createDateTime }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ isSucess ? $t('Completed') : $t('Last Updated on') }}:</span><span class="om-note-cell">{{ lastDateTime }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Duration') }}:</span><span class="om-note-cell">{{ duration }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Run Stamp') }}:</span><span class="om-note-cell">{{ runText.RunStamp }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Run Digest') }}:</span><span class="om-note-cell">{{ runText.RunDigest }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Value Digest') }}:</span><span class="om-note-cell">{{ runText.ValueDigest }}</span>
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
import { mapState, mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'
import { marked } from 'marked'
import hljs from 'highlight.js'
import sanitizeHtml from 'sanitize-html'

export default {
  name: 'RunInfoDialog',

  props: {
    showTickle: { type: Boolean, default: false },
    modelDigest: { type: String, default: '' },
    runDigest: { type: String, default: '' }
  },

  data () {
    return {
      showDlg: false,
      runText: Mdf.emptyRunText(),
      title: '',
      notes: '',
      isSucess: false,
      statusDescr: '',
      createDateTime: '',
      lastDateTime: '',
      duration: '',
      isNowArchive: false,
      isSoonArchive: false
    }
  },

  computed: {
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest'
    }),
    ...mapState('serverState', {
      archiveState: state => state.archive
    })
  },

  watch: {
    showTickle () {
      this.runText = this.runTextByDigest({ ModelDigest: this.modelDigest, RunDigest: this.runDigest })
      if (!Mdf.isNotEmptyRunText(this.runText)) {
        console.warn('model run not found by digest:', this.runDigest)
        this.$q.notify({ type: 'negative', message: this.$t('Model run not found') })
        return
      }

      // set basic run info
      this.title = Mdf.descrOfTxt(this.runText) || this.runText.Name
      this.isSucess = this.runText.Status === Mdf.RUN_SUCCESS
      this.statusDescr = this.$t(Mdf.statusText(this.runText.Status))
      this.createDateTime = Mdf.dtStr(this.runText.CreateDateTime)
      this.lastDateTime = Mdf.dtStr(this.runText.UpdateDateTime)
      this.duration = Mdf.toIntervalStr(this.createDateTime, this.lastDateTime)

      // if archive is enabled then check run archive status
      if (this?.archiveState?.IsArchive) {
        this.isNowArchive = Mdf.isArchiveNowRun(this.archiveState, this.modelDigest, this.runDigest)
        this.isSoonArchive = Mdf.isArchiveAlertRun(this.archiveState, this.modelDigest, this.runDigest)
      }

      // run notes: convert from markdown to html
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

      this.notes = marked.parse(sanitizeHtml(Mdf.noteOfTxt(this.runText)))

      this.showDlg = true
    }
  }
}
</script>

<style scope="local">
  @import '~highlight.js/styles/github.css'
</style>
