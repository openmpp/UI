<!-- output table info dialog -->
<template>

<om-mcw-dialog :id="id" ref="tableNoteDlg" :scrollable="true" acceptText="OK">
  <template #header><span>{{tableDescr}}</span></template>
  <div v-if="(tableNote !== '')">{{tableNote}}</div>
  <div v-if="(exprDescr !== '' || exprNote || '' !== '')">
    <br v-if="(tableNote !== '')"/>
    <div>{{exprDescr}}</div>
    <div>{{exprNote}}</div>
  </div>
  <div class="note-table mono">
    <div class="note-row">
      <span class="note-cell">Name:</span><span class="note-cell">{{tableName}}</span>
    </div>
    <div v-if="tableSize.rank > 1" class="note-row">
      <span class="note-cell">Size:</span><span class="note-cell">{{tableSize.dimSize}} = {{tableSize.dimTotal}}</span>
    </div>
    <div v-if="tableSize.rank === 1" class="note-row">
      <span class="note-cell">Size:</span><span class="note-cell">{{tableSize.dimSize}}</span>
    </div>
    <div v-if="tableSize.rank <= 0" class="note-row">
      <span class="note-cell">Rank:</span><span class="note-cell">{{tableSize.rank}}</span>
    </div>
    <div class="note-row">
      <span class="note-cell">Expressions:</span><span class="note-cell">{{tableSize.exprCount}}</span>
    </div>
    <div class="note-row">
      <span class="note-cell">Accumulators:</span><span class="note-cell">{{tableSize.accCount}}</span>
    </div>
    <div v-if="isSubValues" class="note-row">
      <span class="note-cell">SubValues:</span><span class="note-cell">{{subCount}}</span>
    </div>
    <div class="note-row">
      <span class="note-cell">Digest:</span><span class="note-cell">{{tableDigest}}</span>
    </div>
  </div>
</om-mcw-dialog>

</template>

<script>
import { mapGetters } from 'vuex'
import { GET } from '@/store'
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
      tableName: '',
      subCount: 0,
      tableDescr: '',
      tableNote: '',
      exprDescr: '',
      exprNote: '',
      tableDigest: '',
      isSubValues: false,
      tableSize: Mdf.emptyTableSize()
    }
  },

  computed: {
    ...mapGetters({
      theModel: GET.THE_MODEL
    })
  },

  methods: {
    showTableInfo (tableText, runText) {
      if (!tableText.Table || !Mdf.isTable(tableText.Table)) {
        console.log('Empty output table name')
        return
      }
      this.tableName = tableText.Table.Name
      this.tableDigest = tableText.Table.Digest || ''
      this.tableDescr = tableText.TableDescr || ''
      this.tableNote = tableText.TableNote || ''
      this.exprDescr = tableText.ExprDescr || ''
      this.exprNote = tableText.ExprNote || ''

      // find table size info
      this.tableSize = Mdf.tableSizeByName(this.theModel, this.tableName)

      this.isSubValues = false
      if (Mdf.isNotEmptyRunText(runText)) {
        this.subCount = runText.SubCount || 0
        this.isSubValues = (this.subCount || 0) > 1
      }

      this.$refs.tableNoteDlg.open() // show table info dialog
    }
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
  @import "@material/theme/mdc-theme";
  @import "@material/typography/mdc-typography";

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
