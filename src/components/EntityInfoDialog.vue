<template>
<q-dialog full-width v-model="showDlg">
  <q-card>

    <q-card-section class="row text-h6 bg-primary text-white">
      <div>{{ title }}</div><q-space /><q-btn icon="mdi-close" flat dense round v-close-popup />
    </q-card-section>

    <q-card-section class="q-pt-none text-body1">
      <div class="om-note-table mono q-pb-md">
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Entity Name') }}:</span><span class="om-note-cell">{{ entityName }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Attributes Count') }}:</span><span class="om-note-cell">{{ totalAttrCount }}</span>
        </div>
        <div v-if="internalAttrCount" class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Internal Attributes') }}:</span><span class="om-note-cell">{{ internalAttrCount }}</span>
        </div>
        <template v-if="runDigest">
          <div class="om-note-row">
            <span class="om-note-cell q-pr-sm">{{ $t('Run Attributes Count') }}:</span><span class="om-note-cell">{{ runAttrCount }}</span>
          </div>
          <div v-if="internalRunAttrCount || internalAttrCount" class="om-note-row">
            <span class="om-note-cell q-pr-sm">{{ $t('Run Internal Attributes') }}:</span><span class="om-note-cell">{{ internalRunAttrCount }}</span>
          </div>
        </template>
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
  name: 'EntityInfoDialog',

  props: {
    showTickle: { type: Boolean, default: false },
    entityName: { type: String, default: '' },
    runDigest: { type: String, default: '' }
  },

  data () {
    return {
      showDlg: false,
      title: '',
      totalAttrCount: 0,
      internalAttrCount: 0,
      runAttrCount: 0,
      internalRunAttrCount: 0,
      notes: '',
      runCurrent: Mdf.emptyRunText() // currently selected run
    }
  },

  computed: {
    ...mapState('model', {
      theModel: state => state.theModel
    }),
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest'
    })
  },

  watch: {
    showTickle () {
      const entText = Mdf.entityTextByName(this.theModel, this.entityName)
      this.title = Mdf.descrOfDescrNote(entText) || this.entityName

      // if run specified then include only entity.attribute from this model run
      const aUse = {}
      if (this.runDigest) {
        this.runCurrent = this.runTextByDigest({ ModelDigest: Mdf.modelDigest(this.theModel), RunDigest: this.runDigest })
      }
      const isRun = this.runDigest && Mdf.isNotEmptyRunText(this.runCurrent)

      if (isRun) {
        for (const e of this.runCurrent.Entity) {
          if (e?.Name && e.Name === this.entityName && Array.isArray(e?.Attr)) {
            for (const a of e.Attr) {
              aUse[a] = true
            }
          }
        }
      }

      // count regular attributes and internal attributes
      if (entText?.EntityAttrTxt && Array.isArray(entText?.EntityAttrTxt)) {
        this.totalAttrCount = 0
        this.internalAttrCount = 0
        this.runAttrCount = 0
        this.internalRunAttrCount = 0

        for (const ea of entText.EntityAttrTxt) {
          this.totalAttrCount++
          const isInternal = ea?.Attr?.IsInternal

          if (isInternal) this.internalAttrCount++

          if (isRun && aUse[ea?.Attr?.Name]) {
            this.runAttrCount++
            if (isInternal) this.internalRunAttrCount++
          }
        }
      }

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

      this.notes = marked.parse(sanitizeHtml(Mdf.noteOfDescrNote(entText)))

      this.showDlg = true
    }
  }
}
</script>

<style scope="local">
  @import '~highlight.js/styles/github.css'
</style>
