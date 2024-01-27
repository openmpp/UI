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
          <span class="om-note-cell" :class="isDeleted ? 'text-white bg-negative' : ''">{{ statusDescr }}</span>
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
    </q-card-section>

    <q-card-section v-if="isCompare" class="q-pt-none text-body1">
      <table class="pt-table">
        <tbody>
          <tr v-if="!!compareRuns && compareRuns.length">
            <th class="pt-row-head" colspan="2">{{ $t('Model runs to compare') }}</th>
          </tr>
          <tr v-for="crt of compareRuns" :key="'cr-' + crt.name">
            <td class="pt-cell-left">{{ crt.name }}</td>
            <td class="pt-cell-left om-text-descr">{{ crt.descr }}</td>
          </tr>
          <tr v-if="!!diffParam && diffParam.length">
            <th class="pt-row-head" colspan="2">{{ $t('Different parameters') }}</th>
          </tr>
          <tr v-else>
            <th class="pt-row-head" colspan="2">{{ $t('All parameters values identical') }}</th>
          </tr>
          <tr v-for="par of diffParam" :key="'dp-' + par.name">
            <td class="pt-cell-left">{{ par.name }}</td>
            <td class="pt-cell-left om-text-descr">{{ par.descr }}</td>
          </tr>
          <tr v-if="!!diffTable && diffTable.length">
            <th class="pt-row-head" colspan="2">{{ $t('Different output tables') }}</th>
          </tr>
          <tr v-if="(!diffTable || !diffTable.length) && (!suppTable || !suppTable.length)">
            <th class="pt-row-head" colspan="2">{{ $t('All output tables values identical') }}</th>
          </tr>
          <tr v-for="tbl of diffTable" :key="'dt-' + tbl.name">
            <td class="pt-cell-left">{{ tbl.name }}</td>
            <td class="pt-cell-left om-text-descr">{{ tbl.descr }}</td>
          </tr>
          <tr v-if="!!suppTable && suppTable.length">
            <th class="pt-row-head" colspan="2">{{ $t('Suppressed output tables') }}</th>
          </tr>
          <tr v-for="tbl of suppTable" :key="'ds-' + tbl.name">
            <td class="pt-cell-left">{{ tbl.name }}</td>
            <td class="pt-cell-left om-text-descr">{{ tbl.descr }}</td>
          </tr>
          <template v-if="isMicrodata && !!runText.Entity.length">
            <tr v-if="!!diffEntity && diffEntity.length">
              <th class="pt-row-head" colspan="2">{{ $t('Different microdata') }}</th>
            </tr>
            <tr v-if="(!diffEntity || !diffEntity.length) && (!missEntity || !missEntity.length)">
              <th class="pt-row-head" colspan="2">{{ $t('All microdata values identical') }}</th>
            </tr>
            <tr v-for="ent of diffEntity" :key="'de-' + ent.name">
              <td class="pt-cell-left">{{ ent.name }}</td>
              <td class="pt-cell-left om-text-descr">{{ ent.descr }}</td>
            </tr>
            <tr v-if="!!missEntity && missEntity.length">
              <th class="pt-row-head" colspan="2">{{ $t('Microdata not found') }}</th>
            </tr>
            <tr v-for="ent of missEntity" :key="'em-' + ent.name">
              <td class="pt-cell-left">{{ ent.name }}</td>
              <td class="pt-cell-left om-text-descr">{{ ent.descr }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </q-card-section>

    <q-card-section v-if="notes" class="q-pt-none text-body1">
      <div v-html="notes" />
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
      isDeleted: false,
      isCompare: false,
      compareRuns: [],
      diffParam: [],
      diffTable: [],
      suppTable: [],
      diffEntity: [],
      missEntity: []
    }
  },

  computed: {
    isMicrodata () { return !!this.serverConfig.AllowMicrodata && Mdf.entityCount(this.theModel) > 0 },

    ...mapState('model', {
      theModel: state => state.theModel,
      runTextList: state => state.runTextList
    }),
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest'
    }),
    ...mapState('uiState', {
      runDigestSelected: state => state.runDigestSelected
    }),
    ...mapGetters('uiState', {
      modelViewSelected: 'modelViewSelected'
    }),
    ...mapState('serverState', {
      serverConfig: state => state.config
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
      this.isDeleted = Mdf.isRunDeletedStatus(this.runText.Status, this.runText.Name)

      // if it is a base run of run comparison (if there is not empty list of digests to compare)
      // then make run compare info
      this.isCompare = false
      this.compareRuns = []
      this.diffParam = []
      this.diffTable = []
      this.suppTable = []
      this.diffEntity = []
      this.missEntity = []

      if (this.runDigest === this.runDigestSelected) {
        const mv = this.modelViewSelected(this.modelDigest)
        this.isCompare = !!mv && Array.isArray(mv?.digestCompareList) && mv.digestCompareList.length > 0

        if (this.isCompare) {
          const rc = Mdf.runCompare(this.runText, mv.digestCompareList, Mdf.tableCount(this.theModel), this.runTextList)

          for (const dg of mv.digestCompareList) {
            const rt = this.runTextList.find(r => r.RunDigest === dg)
            if (rt) {
              this.compareRuns.push({ name: rt.Name, descr: Mdf.descrOfTxt(rt) })
            }
          }
          for (const name of rc.paramDiff) {
            const pt = this.theModel.ParamTxt.find(p => p.Param.Name === name)
            if (pt) {
              this.diffParam.push({ name: pt.Param.Name, descr: Mdf.descrOfDescrNote(pt) })
            }
          }
          for (const name of rc.tableDiff) {
            const tt = this.theModel.TableTxt.find(t => t.Table.Name === name)
            if (tt) {
              this.diffTable.push({ name: tt.Table.Name, descr: (tt.TableDescr || '') })
            }
          }
          for (const name of rc.tableSupp) {
            const tt = this.theModel.TableTxt.find(t => t.Table.Name === name)
            if (tt) {
              this.suppTable.push({ name: tt.Table.Name, descr: (tt.TableDescr || '') })
            }
          }
          if (this.isMicrodata) {
            for (const name of rc.entityDiff) {
              const et = this.theModel.EntityTxt.find(t => t.Entity.Name === name)
              if (et) {
                this.diffEntity.push({ name: et.Entity.Name, descr: Mdf.descrOfDescrNote(et) })
              }
            }
            for (const name of rc.entityMiss) {
              const et = this.theModel.EntityTxt.find(t => t.Entity.Name === name)
              if (et) {
                this.missEntity.push({ name: et.Entity.Name, descr: Mdf.descrOfDescrNote(et) })
              }
            }
          }
        }
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

<style lang="scss" scope="local">
  .pt-table {
    text-align: left;
    border-collapse: collapse;
  }
  .pt-cell {
    padding: 0.25rem;
    border: 1px solid lightgrey;
    font-size: 0.875rem;
  }
  .pt-head {
    @extend .pt-cell;
    text-align: center;
    background-color: whitesmoke;
  }
  .pt-row-head {
    @extend .pt-cell;
    background-color: whitesmoke;
  }
  .pt-cell-left {
    text-align: left;
    @extend .pt-cell;
  }
  .pt-cell-right {
    text-align: right;
    @extend .pt-cell;
  }
  .pt-cell-center {
    text-align: center;
    @extend .pt-cell;
  }
</style>
<style scope="local">
  @import '~highlight.js/styles/github.css'
</style>
