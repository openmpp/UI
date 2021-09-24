<template>
  <q-card-section v-show="noteEditorActive">

    <div class="row items-center q-pb-xs">

      <q-btn
        v-if="!isHideCancel"
        @click="onCancelNote"
        flat
        dense
        class="col-auto text-white bg-primary rounded-borders q-mr-xs"
        icon="mdi-close-circle"
        :title="$t('Discard changes and stop editing')"
      />
      <q-btn
        v-if="!isHideSave"
        @click="onSaveNote"
        flat
        dense
        class="col-auto text-white bg-primary rounded-borders q-mr-xs"
        icon="mdi-content-save-edit"
        :title="$t('Save description and notes')"
      />
      <q-separator v-if="!isHideCancel || !isHideSave" vertical spaced="sm" color="secondary" />

      <span
        v-if="descriptionEditable"
        class="col-auto q-pr-xs"
        > {{ $t('Description') }} :</span>
      <q-input
        v-if="descriptionEditable"
        v-model="descrEdit"
        maxlength="255"
        size="80"
        @blur="onDescrBlur"
        outlined
        dense
        clearable
        hide-bottom-space
        class="col"
        :placeholder="descrPrompt ? descrPrompt : $t('Description of') + ' ' + theName"
        :title="descrPrompt ? descrPrompt : $t('Description of') + ' ' + theName"
      >
      </q-input>
      <div
        v-if="!descriptionEditable"
        class="col om-text-descr-title"
        >{{ theDescr ? theDescr : theName }}</div>

    </div>

    <textarea style="display: none" :id="mdeTextId"></textarea>

    <edit-discard-dialog
      @discard-changes-yes="onYesDiscardChanges"
      :show-tickle="showEditDiscardTickle"
      :dialog-title="$t('Cancel Editing') + '?'"
      >
    </edit-discard-dialog>
  </q-card-section>
</template>

<script>
import EasyMDE from 'easymde'
import hljs from 'highlight.js'
import sanitizeHtml from 'sanitize-html'
import EditDiscardDialog from 'components/EditDiscardDialog.vue'
import * as Mdf from 'src/model-common'

export default {
  name: 'MarkdownEditor',
  components: { EditDiscardDialog },

  props: {
    showTickle: { type: Boolean, default: false, required: true },
    theKey: { type: String, default: '' },
    theName: { type: String, default: '' },
    theNote: { type: String, default: '' },
    notesEditable: { type: Boolean, default: false },
    theDescr: { type: String, default: '' },
    descrPrompt: { type: String, default: '' },
    descriptionEditable: { type: Boolean, default: false },
    saveNoteEdit: { type: String, default: 'save-note-edit' },
    isHideSave: { type: Boolean, default: false },
    cancelNoteEdit: { type: String, default: 'cancel-note-edit' },
    isHideCancel: { type: Boolean, default: false }
  },

  watch: {
    showTickle () { this.doShowEditor() }
  },

  data () {
    return {
      mdeTextId: 'EasyMDE-' + (this.theKey || ''),
      descrEdit: '',
      noteEdit: '',
      noteEditorActive: false,
      showEditDiscardTickle: false
    }
  },

  methods: {
    // show description and notes dialog WORKING HERE
    doShowEditor () {
      if (this.descriptionEditable) this.descrEdit = this.theDescr
      this.noteEditorActive = true
      //
      if (this.notesEditable) {
        this.easyMDE = new EasyMDE({
          element: document.getElementById(this.mdeTextId),
          sideBySideFullscreen: false,
          toolbar: [
            'undo', 'redo', '|',
            'bold', 'italic', 'heading', '|',
            'quote', 'code', '|',
            'unordered-list', 'ordered-list', 'table', '|',
            'side-by-side', '|',
            'guide'],
          renderingConfig: {
            codeSyntaxHighlighting: true,
            sanitizerFunction: (renderedHTML) => { return sanitizeHtml(renderedHTML) },
            markedOptions: {
              highlight: (code, lang) => {
                const language = hljs.getLanguage(lang) ? lang : 'plaintext'
                return hljs.highlight(code, { language }).value
              },
              pedantic: false,
              gfm: true,
              breaks: false,
              smartLists: true
            }
          }
        })
        this.noteEdit = this.theNote
        this.easyMDE.value(this.noteEdit)
      }
    },

    // cleanup description input
    onDescrBlur (e) {
      this.descrEdit = Mdf.cleanTextInput(this.descrEdit)
    },

    // send description and notes to the parent
    onSaveNote () {
      if (this.notesEditable) {
        this.noteEdit = sanitizeHtml(this.easyMDE.value() || '') // remove unsafe html tags
        this.doHideEditor()
      }
      this.$emit(
        this.saveNoteEdit,
        this.descriptionEditable ? this.descrEdit : this.theDescr,
        this.notesEditable ? this.noteEdit : this.theNote,
        this.isUpdated(),
        this.theKey
      )
    },

    // return true if description or notes updated (edited)
    isUpdated () {
      return (this.descriptionEditable && this.theDescr !== this.descrEdit) ||
        (this.notesEditable && this.theNote !== this.easyMDE.value())
    },

    // return description and notes
    getDescrNote () {
      if (this.notesEditable) {
        this.noteEdit = sanitizeHtml(this.easyMDE.value() || '') // remove unsafe html tags
      }
      return {
        descr: this.descriptionEditable ? this.descrEdit : this.theDescr,
        note: this.notesEditable ? this.noteEdit : this.theNote,
        isUpdated: this.isUpdated(),
        key: this.theKey
      }
    },

    // cancel editing description and notes
    onCancelNote () {
      if (this.isUpdated()) {
        this.showEditDiscardTickle = !this.showEditDiscardTickle
      } else {
        this.onYesDiscardChanges()
      }
    },
    // on user selecting "Yes" from "Cancel Editing" pop-up alert
    onYesDiscardChanges () {
      this.doHideEditor()
      this.$emit(this.cancelNoteEdit)
    },
    // hide easyMDE
    doHideEditor () {
      if (!this.notesEditable) return
      this.noteEditorActive = false
      this.easyMDE.toTextArea()
      this.easyMDE = null
    }
  }
}
</script>

<style scoped>
  @import '~easymde/dist/easymde.min.css';
  @import '~highlight.js/styles/github.css';
</style>
