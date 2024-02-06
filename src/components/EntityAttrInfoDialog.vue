<template>
<q-dialog full-width v-model="showDlg">
  <q-card>

    <q-card-section class="row text-h6 bg-primary text-white">
      <div>{{ title }}</div><q-space /><q-btn icon="mdi-close" flat dense round v-close-popup />
    </q-card-section>

    <q-card-section class="q-pt-none text-body1">
      <div class="om-note-table mono q-pb-md">
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Entity') }}:</span><span class="om-note-cell">{{ entityName }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Attribute') }}:</span><span class="om-note-cell">{{ attrName }}</span>
        </div>
        <div v-if="typeName" class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Type of') }}:</span><span class="om-note-cell">{{ typeName }}</span>
        </div>
        <div v-if="isInternal" class="om-note-row">
          <span class="om-note-cell q-pr-sm">&nbsp;</span><span class="om-note-cell">{{ $t('Internal attribute') }}</span>
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
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import sanitizeHtml from 'sanitize-html'

export default {
  name: 'EntityAttrInfoDialog',

  props: {
    showTickle: { type: Boolean, default: false },
    entityName: { type: String, default: '' },
    attrName: { type: String, default: '' }
  },

  data () {
    return {
      showDlg: false,
      title: '',
      typeName: '',
      isInternal: false,
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
      const ea = Mdf.entityAttrTextByName(this.theModel, this.entityName, this.attrName)

      this.title = Mdf.descrOfDescrNote(ea) || this.attrName

      if (Mdf.isNotEmptyEntityAttr(ea)) {
        this.isInternal = ea.Attr.IsInternal

        // find attribute type
        const t = Mdf.typeTextById(this.theModel, ea.Attr.TypeId)
        this.typeName = t.Type.Name

        // notes: convert from markdown to html
        marked.setOptions({
          renderer: new marked.Renderer(),
          pedantic: false,
          gfm: true,
          breaks: false,
          smartLists: true
        })
        marked.use(
          markedHighlight({
            langPrefix: 'hljs language-',
            highlight: (code, lang, info) => {
              const language = hljs.getLanguage(lang) ? lang : 'plaintext'
              return hljs.highlight(code, { language }).value
            }
          })
        )
        this.notes = marked.parse(sanitizeHtml(Mdf.noteOfDescrNote(ea)))
      }

      this.showDlg = true
    }
  }
}
</script>

<style scope="local">
  @import '~highlight.js/styles/github.css'
</style>
