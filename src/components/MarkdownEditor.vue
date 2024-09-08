<template>
  <q-card-section>

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
        > {{ $t('Description') }}:</span>
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
        :placeholder="descrPrompt ? descrPrompt : (theName ? $t('Description of') + ' ' + theName : $t('Description'))"
        :title="descrPrompt ? descrPrompt : (theName ? $t('Description of') + ' ' + theName : $t('Description'))"
      >
      </q-input>
      <div
        v-if="!descriptionEditable"
        class="col om-text-descr-title"
        >{{ theDescr ? theDescr : theName }}</div>

    </div>

    <textarea
      style="display: none"
      :id="mdeTextId"
      :placeholder="notePrompt ? notePrompt : (theName ? $t('Notes for') + ' ' + theName : $t('Notes'))"
      ></textarea>

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
    theKey: { type: String, default: '' },
    theName: { type: String, default: '' },
    theDescr: { type: String, default: '' },
    descrPrompt: { type: String, default: '' },
    descriptionEditable: { type: Boolean, default: false },
    theNote: { type: String, default: '' },
    notePrompt: { type: String, default: '' },
    notesEditable: { type: Boolean, default: false },
    isHideSave: { type: Boolean, default: false },
    isHideCancel: { type: Boolean, default: false },
    langCode: { type: String, default: 'EN' } // MDE default spellchecker support only English US
  },

  data () {
    return {
      theEasyMde: null,
      mdeTextId: 'easy-mde-text-' + (this.theKey || ''),
      descrEdit: '',
      noteEdit: '',
      showEditDiscardTickle: false
    }
  },

  emits: ['save-note', 'cancel-note'],

  methods: {
    // cleanup description input
    onDescrBlur (e) {
      this.descrEdit = Mdf.cleanTextInput(this.descrEdit || '')
    },

    // send description and notes to the parent
    onSaveNote () {
      if (this.notesEditable) {
        this.noteEdit = sanitizeHtml(this.theEasyMde.value() || '') // remove unsafe html tags
      }
      this.$emit(
        'save-note',
        this.descriptionEditable ? this.descrEdit : this.theDescr,
        this.notesEditable ? this.noteEdit : this.theNote,
        this.isUpdated(),
        this.theKey
      )
    },

    // return true if description or notes updated (edited)
    isUpdated () {
      return (this.descriptionEditable && this.theDescr !== this.descrEdit) ||
        (this.notesEditable && this.theNote !== this.theEasyMde.value())
    },

    // return description and notes
    getDescrNote () {
      if (this.notesEditable) {
        this.noteEdit = sanitizeHtml(this.theEasyMde.value() || '') // remove unsafe html tags
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
    // notify parent: user answer is "Yes" to "Cancel Editing" pop-up alert
    onYesDiscardChanges () {
      this.$emit('cancel-note')
    }
  },

  // create description and notes editor
  mounted () {
    if (this.descriptionEditable) this.descrEdit = this.theDescr

    if (this.notesEditable) {
      this.theEasyMde = new EasyMDE({
        element: document.getElementById(this.mdeTextId),
        sideBySideFullscreen: false,
        autoDownloadFontAwesome: false,
        toolbar: [
          'undo', 'redo', '|',
          'bold', 'italic', 'heading-3', 'heading-bigger', 'heading-smaller', '|',
          'quote', 'code', '|',
          'unordered-list', 'ordered-list', 'table', '|',
          'side-by-side', '|',
          'guide'],
        spellChecker: (this.langCode || '').toLocaleLowerCase().startsWith('en'), // EasyMDE spell checker is en-US only
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
      this.theEasyMde.value(this.noteEdit)
    }
  },
  unmounted () {
    if (this.theEasyMde) {
      this.theEasyMde.toTextArea()
      this.theEasyMde = null
    }
  }
}
</script>

<style scoped>
  @import '~easymde/dist/easymde.min.css';
</style>
