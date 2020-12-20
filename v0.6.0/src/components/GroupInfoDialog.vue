<!-- group info dialog -->
<template>

<om-mcw-dialog :id="id" ref="groupNoteDlg" :scrollable="true" acceptText="OK">
  <template #header><span>{{groupDescr}}</span></template>
  <div class="note-table mono">
    <div class="note-row">
      <span class="note-cell">Group:</span><span class="note-cell">{{groupName}}</span>
    </div>
  </div>
  <div v-if="(groupNote !== '')">{{groupNote}}</div>
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
      groupName: '',
      groupDescr: '',
      groupNote: ''
    }
  },

  computed: {
    ...mapGetters({
      theModel: GET.THE_MODEL
    })
  },

  methods: {
    showGroupInfo (groupText) {
      if (groupText.Group && Mdf.isGroup(groupText.Group)) {
        this.groupName = groupText.Group.Name
      }
      this.groupDescr = Mdf.descrOfDescrNote(groupText)
      this.groupNote = Mdf.noteOfDescrNote(groupText)

      this.$refs.groupNoteDlg.open() // show param info dialog
    }
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
  /* note dialog */
  .note-table {
    display: table;
    margin-bottom: 0.5rem;
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
