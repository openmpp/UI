<template>
<q-dialog v-model="showDlg">
  <q-card>

    <q-card-section>
      <div class="text-h6">{{ info.title }}</div>
    </q-card-section>

    <q-card-section class="q-pt-none text-body1">

      <div class="om-note-table mono">
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Name') }}:</span><span class="om-note-cell">{{ info.modelName }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Version') }}:</span><span class="om-note-cell">{{ info.version }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Created') }}:</span><span class="om-note-cell">{{ info.createDateTime }}</span>
        </div>
        <div class="om-note-row">
          <span class="om-note-cell q-pr-sm">{{ $t('Digest') }}:</span><span class="om-note-cell">{{ info.modelDigest }}</span>
        </div>
      </div>

      <div class="q-pt-md">{{ info.notes }}</div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn flat label="OK" color="primary" v-close-popup />
    </q-card-actions>

  </q-card>
</q-dialog>
</template>

<script>
export default {
  name: 'ModelInfoDialog',

  props: {
    showTickle: { type: Boolean, default: false },
    info: {
      type: Object,
      default: () => ({
        title: '',
        notes: '',
        modelName: '',
        modelDigest: '',
        createDateTime: '',
        version: ''
      })
    }
  },

  watch: {
    showTickle () {
      this.showDlg = true
    }
  },

  data () {
    return {
      showDlg: false
    }
  }
}
</script>

<style lang="scss" scope="local">
</style>
