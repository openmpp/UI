<template>
<q-dialog v-model="showDlg">
  <q-card>

    <q-card-section>
      <div class="text-h6">{{ title }}</div>
    </q-card-section>

    <q-card-section class="q-pt-none text-body1">
      <div class="om-note-table mono">
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Name') }}:</span><span class="om-note-cell">{{ groupName }}</span>
        </div>
      </div>
      <div class="q-pt-md">{{ notes }}</div>
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

export default {
  name: 'GroupInfoDialog',

  props: {
    showTickle: { type: Boolean, default: false },
    groupName: { type: String, default: '' }
  },

  data () {
    return {
      showDlg: false,
      title: '',
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
      const groupText = Mdf.groupTextByName(this.theModel, this.groupName)
      this.title = Mdf.descrOfDescrNote(groupText) || this.groupName
      this.notes = Mdf.noteOfDescrNote(groupText)
      this.showDlg = true
    }
  }
}
</script>

<style lang="scss" scope="local">
</style>
