<!-- model workset info dialog -->
<template>

<om-mcw-dialog :id="id" ref="noteDlg" :scrollable="true" acceptText="OK">
  <template #header><span>{{wsDescr || wsName}}</span></template>
  <div v-if="wsNote">{{wsNote}}</div>
  <div class="note-table mono">
    <div class="note-row">
      <span class="note-cell">Name:</span><span class="note-cell">{{wsName}}</span>
    </div>
    <div class="note-row">
      <span class="note-cell">Updated:</span><span class="note-cell">{{lastDt}}</span>
    </div>
    <div v-if="isBaseRun" class="note-row">
      <span class="note-cell">Base run:</span><span class="note-cell">{{baseRunDigest}}</span>
    </div>
    <div v-if="isRdOnly" class="note-row">
      <span class="note-cell">Read only</span>
    </div>
    <div v-if="!isBaseRun && paramCount > 0" class="note-row">
      <span class="note-cell">Parameters:</span><span class="note-cell">{{paramCount}}</span>
    </div>
  </div>
</om-mcw-dialog>

</template>

<script>
import * as Mdf from '@/modelCommon'
import OmMcwDialog from '@/om-mcw/OmMcwDialog'

export default {
  components: { OmMcwDialog },

  props: {
    id: {
      type: String,
      required: true
    }
  },

  data () {
    return {
      wsDescr: '',
      wsNote: '',
      wsName: '',
      isRdOnly: false,
      baseRunDigest: '',
      isBaseRun: false,
      lastDt: '',
      paramCount: 0
    }
  },

  methods: {
    // show model workset info
    showWsInfo (wt) {
      if (!Mdf.isNotEmptyWorksetText(wt)) {
        console.log('Empty model workset text')
        return
      }

      // workset properties
      this.wsDescr = Mdf.descrOfTxt(wt)
      this.wsNote = Mdf.noteOfTxt(wt)
      this.wsName = wt.Name
      this.isRdOnly = !!wt.IsReadonly
      this.baseRunDigest = wt.BaseRunDigest || ''
      this.isBaseRun = this.baseRunDigest !== ''
      this.paramCount = Mdf.lengthOf(wt.Param)
      this.lastDt = Mdf.dtStr(wt.UpdateDateTime)

      this.$refs.noteDlg.open() // show workset info dialog
    }
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
  /* note dialog */
  .note-table {
    display: table;
    margin-top: 0.5rem;
  }
  .note-row {
    display: table-row;
  }
  .note-cell {
    display: table-cell;
    white-space: nowrap;
    &:first-child {
      padding-right: 0.5rem;
    }
  }
</style>
