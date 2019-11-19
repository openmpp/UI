<!-- parameter info dialog -->
<template>

<om-mcw-dialog :id="id" ref="noteDlg" :scrollable="true" acceptText="OK">
  <template #header><span>{{paramDescr}}</span></template>
  <div v-if="(paramNote !== '')">{{paramNote}}</div>
  <div class="note-table mono">
    <div class="note-row">
      <span class="note-cell">Name:</span><span class="note-cell">{{paramName}}</span>
    </div>
    <div class="note-row">
      <span class="note-cell">Type:</span><span class="note-cell">{{typeTitle}}</span>
    </div>
    <div v-if="paramSize.rank > 1" class="note-row">
        <span class="note-cell">Size:</span><span class="note-cell">{{paramSize.dimSize}} = {{paramSize.dimTotal}}</span>
    </div>
    <div v-if="paramSize.rank === 1" class="note-row">
      <span class="note-cell">Size:</span><span class="note-cell">{{paramSize.dimSize}}</span>
    </div>
    <div v-if="paramSize.rank <= 0" class="note-row">
      <span class="note-cell">Rank:</span><span class="note-cell">{{paramSize.rank}}</span>
    </div>
    <div v-if="isSubValues" class="note-row">
      <span class="note-cell">SubValue Count:</span><span class="note-cell">{{subCount}}</span>
    </div>
    <div v-if="isSubValues" class="note-row">
      <span class="note-cell">Default Sub Id:</span><span class="note-cell">{{defaultSubId}}</span>
    </div>
    <div class="note-row">
      <span class="note-cell">Digest:</span><span class="note-cell">{{paramDigest}}</span>
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
      paramName: '',
      paramDescr: '',
      paramNote: '',
      typeTitle: '',
      paramDigest: '',
      isSubValues: false,
      subCount: 0,
      defaultSubId: 0,
      paramSize: Mdf.emptyParamSize()
    }
  },

  computed: {
    ...mapGetters({
      theModel: GET.THE_MODEL
    })
  },

  methods: {
    showParamInfo (paramText, paramRunSet) {
      if (!paramText.Param && !Mdf.isParam(paramText.Param)) {
        console.log('Empty parameter text')
        return
      }
      this.paramName = paramText.Param.Name
      this.paramDescr = Mdf.descrOfDescrNote(paramText)
      this.paramNote = Mdf.noteOfDescrNote(paramText)
      this.paramDigest = paramText.Param.Digest || ''

      // find parameter type
      let t = Mdf.typeTextById(this.theModel, (paramText.Param.TypeId || 0))
      this.typeTitle = Mdf.descrOfDescrNote(t)
      if ((this.typeTitle || '') === '') this.typeTitle = t.Type.Name || ''

      // find parameter size and sub-values info
      this.paramSize = Mdf.paramSizeByName(this.theModel, this.paramName)

      this.isSubValues = false
      if (Mdf.isParamRunSet(paramRunSet)) {
        this.subCount = paramRunSet.SubCount || 0
        this.isSubValues = paramRunSet.SubCount > 1
        this.defaultSubId = paramRunSet.DefaultSubId || 0
      }

      this.$refs.noteDlg.open() // show param info dialog
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
