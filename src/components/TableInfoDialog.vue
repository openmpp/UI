<template>
<q-dialog full-width v-model="showDlg">
  <q-card>

    <q-card-section class="row text-h6 bg-primary text-white">
      <div>{{ title }}</div><q-space /><q-btn icon="mdi-close" flat dense round v-close-popup />
    </q-card-section>

    <q-card-section class="q-pt-none text-body1">

      <div class="om-note-table mono q-pb-md">
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Name') }}:</span><span class="om-note-cell">{{ tableName }}</span>
        </div>
        <div v-if="tableSize.rank > 1" class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Size') }}:</span><span class="om-note-cell">{{ tableSize.dimSize }} = {{ tableSize.dimTotal }}</span>
        </div>
        <div v-if="tableSize.rank === 1" class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Size') }}:</span><span class="om-note-cell">{{ tableSize.dimSize }}</span>
        </div>
        <div v-if="tableSize.rank <= 0" class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Rank') }}:</span><span class="om-note-cell">{{ tableSize.rank }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Expressions') }}:</span><span class="om-note-cell">{{ tableSize.exprCount || 0 }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Accumulators') }}:</span><span class="om-note-cell">{{ tableSize.accCount || 0 }}</span>
        </div>
        <div v-if="(runText.SubCount || 0) > 1" class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Sub-values Count') }}:</span><span class="om-note-cell">{{ runText.SubCount || 0 }}</span>
        </div>
        <template v-if="isRunHasTable">
          <div class="om-note-row">
            <span class="om-note-cell q-pr-sm">{{ $t('Digest') }}:</span><span class="om-note-cell">{{ tableText.Table.Digest }}</span>
          </div>
          <div class="om-note-row">
            <span class="om-note-cell q-pr-sm">{{ $t('Import Digest') }}:</span><span class="om-note-cell">{{ tableText.Table.ImportDigest }}</span>
          </div>
          <div class="om-note-row">
            <span class="om-note-cell q-pr-sm">{{ $t('Value Digest') }}:</span><span class="om-note-cell">{{ valueDigest }}</span>
          </div>
        </template>
      </div>

      <div v-if="tableSize.rank > 0" class="om-note-row">
        <table class="pt-table q-mb-sm">
          <thead>
            <tr>
              <th class="pt-head text-weight-medium">{{ $t('Dimension') }}</th>
              <th class="pt-head text-weight-medium">{{ $t('Size') }}</th>
              <th class="pt-head text-weight-medium">{{ $t('Type of') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d of dimSizeTxt" :key="d.name">
              <td class="pt-cell q-pa-sm">
                <span class="mono">{{ d.name }}</span>
                <template v-if="!!d.descr && d.name !== d.descr"><br /><span>{{ d.descr }}</span></template>
              </td>
              <td class="pt-cell-right q-pa-sm">{{ d.size }}</td>
              <td class="pt-cell q-pa-sm">
                <span class="mono">{{ d.typeName }}</span>
                <template v-if="!!d.typeDescr && d.typeName !== d.typeDescr"><br /><span>{{ d.typeDescr }}</span></template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="tableSize.exprCount > 0" class="om-note-row">
        <table class="pt-table q-mb-sm">
          <thead>
            <tr>
              <th class="pt-head text-weight-medium">{{ $t('Measure') }}</th>
              <th v-if="isAnyExprNote" class="pt-head text-weight-medium">{{ $t('Notes') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ex of exprTxt" :key="ex.name">
              <td class="pt-cell q-pa-sm">
                <span class="mono">{{ ex.name }}</span>
                <template v-if="!!ex.descr && ex.name !== ex.descr"><br /><span>{{ ex.descr }}</span></template>
              </td>
              <td v-if="!!ex.note" class="pt-cell q-pa-sm"><span v-html="ex.note"></span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="runDigest && !isRunHasTable" class="q-pb-md">{{ $t('This table is excluded from model run results') }}</div>
      <div v-if="tableText.ExprDescr" class="q-pb-md">{{ tableText.ExprDescr }}</div>

      <div v-if="exprNotes" v-html="exprNotes" />
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
  name: 'TableInfoDialog',

  props: {
    showTickle: { type: Boolean, default: false },
    tableName: { type: String, default: '' },
    runDigest: { type: String, default: '' }
  },

  data () {
    return {
      showDlg: false,
      tableText: Mdf.emptyTableText(),
      title: '',
      notes: '',
      exprNotes: '',
      tableSize: Mdf.emptyTableSize(),
      dimSizeTxt: [],
      exprTxt: [],
      isAnyExprNote: false,
      isRunHasTable: false,
      valueDigest: '',
      runText: Mdf.emptyRunText()
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
      // find output tables in model tables list
      this.tableText = Mdf.tableTextByName(this.theModel, this.tableName)
      if (!Mdf.isNotEmptyTableText(this.tableText)) {
        console.warn('output table not found by name:', this.tableName)
        this.$q.notify({ type: 'negative', message: this.$t('Output Table not found') })
        return
      }

      // find current model run
      if (this.runDigest) {
        this.runText = this.runTextByDigest({ ModelDigest: Mdf.modelDigest(this.theModel), RunDigest: this.runDigest })
      }

      // title: table description or name
      this.title = this.tableText.TableDescr || this.tableText.Name

      // table note and expression notes: convert from markdown to html
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

      this.notes = marked.parse(sanitizeHtml(this.tableText.TableNote))
      this.exprNotes = marked.parse(sanitizeHtml(this.tableText.ExprNote))

      // find table size info and check is this table included into the run
      this.tableSize = Mdf.tableSizeByName(this.theModel, this.tableName)

      // find dimension names, description, size, type names and description
      this.dimSizeTxt = Array(this.tableSize.rank)

      for (let k = 0; k < this.tableSize.rank; k++) {
        const dt = Mdf.typeTextById(this.theModel, (this.tableText.TableDimsTxt[k].Dim.TypeId || 0))

        this.dimSizeTxt[k] = {
          name: this.tableText.TableDimsTxt[k].Dim.Name,
          descr: Mdf.descrOfDescrNote(this.tableText.TableDimsTxt[k]),
          size: this.tableSize.dimSize[k],
          typeName: dt.Type.Name || '',
          typeDescr: Mdf.descrOfDescrNote(dt)
        }
      }

      this.exprTxt = Array(this.tableSize.exprCount)
      this.isAnyExprNote = false

      for (let k = 0; k < this.tableSize.exprCount; k++) {
        this.exprTxt[k] = {
          name: this.tableText.TableExprTxt[k].Expr.Name,
          descr: Mdf.descrOfDescrNote(this.tableText.TableExprTxt[k]),
          note: marked.parse(sanitizeHtml(Mdf.noteOfDescrNote(this.tableText.TableExprTxt[k])))
        }
        this.isAnyExprNote = this.isAnyExprNote && (this.exprTxt[k].note || '') !== ''
      }

      if (this.runDigest) {
        const rTbl = Mdf.runTableByName(this.runText, this.tableName)
        this.isRunHasTable = Mdf.isNotEmptyRunTable(rTbl)
        if (this.isRunHasTable) {
          this.valueDigest = rTbl?.ValueDigest || this.$t('Empty')
        }
      }

      this.showDlg = true
    }
  }
}
</script>

<style scope="local">
  @import '~highlight.js/styles/github.css'
</style>
