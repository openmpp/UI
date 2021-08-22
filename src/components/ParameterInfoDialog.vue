<template>
<q-dialog v-model="showDlg">
  <q-card>

    <q-card-section class="text-h6 bg-primary text-white">{{ title }}</q-card-section>

    <q-card-section class="q-pt-none text-body1">

      <div class="om-note-table mono q-pb-md">
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Name') }}:</span><span class="om-note-cell">{{ paramName }}</span>
        </div>

        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Type') }}:</span><span class="om-note-cell">{{ typeTitle }}</span>
        </div>
        <div v-if="paramSize.rank > 1" class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Size') }}:</span><span class="om-note-cell">{{ paramSize.dimSize }} = {{ paramSize.dimTotal }}</span>
        </div>
        <div v-if="paramSize.rank === 1" class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Size') }}:</span><span class="om-note-cell">{{ paramSize.dimSize }}</span>
        </div>
        <div v-if="paramSize.rank <= 0" class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Rank') }}:</span><span class="om-note-cell">{{ paramSize.rank }}</span>
        </div>
        <div v-if="paramRunSet.SubCount > 1" class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Sub-values Count') }}:</span><span class="om-note-cell">{{ paramRunSet.SubCount || 0 }}</span>
        </div>
        <div v-if="paramRunSet.SubCount > 1" class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Default Sub Id') }}:</span><span class="om-note-cell">{{ paramRunSet.DefaultSubId || 0 }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Digest') }}:</span><span class="om-note-cell">{{ paramText.Param.Digest }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Import Digest') }}:</span><span class="om-note-cell">{{ paramText.Param.ImportDigest }}</span>
        </div>
      </div>

      <div v-if="valueNotes" v-html="valueNotes" />
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
import marked from 'marked'
import hljs from 'highlight.js'
import sanitizeHtml from 'sanitize-html'

export default {
  name: 'ParameterInfoDialog',

  props: {
    showTickle: { type: Boolean, default: false },
    paramName: { type: String, default: '' },
    runDigest: { type: String, default: '' },
    worksetName: { type: String, default: '' }
  },

  data () {
    return {
      showDlg: false,
      paramText: Mdf.emptyParamText(),
      title: '',
      notes: '',
      valueNotes: '',
      typeTitle: '',
      paramSize: Mdf.emptyParamSize(),
      paramRunSet: Mdf.emptyParamRunSet()
    }
  },

  computed: {
    ...mapState('model', {
      theModel: state => state.theModel
    }),
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest',
      worksetTextByName: 'worksetTextByName'
    })
  },

  watch: {
    showTickle () {
      // find parameter in model parameters list
      this.paramText = Mdf.paramTextByName(this.theModel, this.paramName)
      if (!Mdf.isNotEmptyParamText(this.paramText)) {
        console.warn('parameter not found by name:', this.paramName)
        this.$q.notify({ type: 'negative', message: this.$t('Parameter not found') })
        return
      }

      // find parameter sub-values info in model run or workset
      this.paramRunSet = Mdf.emptyParamRunSet()
      if ((this.runDigest || '') !== '') {
        this.paramRunSet = Mdf.paramRunSetByName(
          this.runTextByDigest({ ModelDigest: Mdf.modelDigest(this.theModel), RunDigest: this.runDigest }),
          this.paramName)
      } else {
        if ((this.worksetName || '') !== '') {
          this.paramRunSet = Mdf.paramRunSetByName(
            this.worksetTextByName({ ModelDigest: Mdf.modelDigest(this.theModel), Name: this.worksetName }),
            this.paramName)
        }
      }

      // title: parameter description or name
      this.title = Mdf.descrOfDescrNote(this.paramText) || this.paramText.Param.Name

      // parameter note and value notes: convert from markdown to html
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

      this.notes = marked(sanitizeHtml(Mdf.noteOfDescrNote(this.paramText)))
      this.valueNotes = marked(sanitizeHtml(Mdf.noteOfTxt(this.paramRunSet)))

      // find parameter type
      const t = Mdf.typeTextById(this.theModel, (this.paramText.Param.TypeId || 0))
      this.typeTitle = Mdf.descrOfDescrNote(t)
      if ((this.typeTitle || '') === '') this.typeTitle = t.Type.Name || ''

      // find parameter size info
      this.paramSize = Mdf.paramSizeByName(this.theModel, this.paramName)

      this.showDlg = true
    }
  }
}
</script>

<style scope="local">
  @import '~highlight.js/styles/github.css'
</style>
