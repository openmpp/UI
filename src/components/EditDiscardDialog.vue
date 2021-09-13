<template>
  <q-dialog v-model="showDlg">
    <q-card>

      <q-card-section class="text-h6 bg-primary text-white">{{ dialogTitle }}</q-card-section>

      <q-card-section class="q-pt-none text-body1">
        <div>{{ $t('Discard all changes?') }}</div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat v-close-popup autofocus :label="$t('No')" color="primary"/>
        <q-btn flat v-close-popup :label="$t('Yes')" color="primary" @click="onYesDiscardChanges" />
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script>
export default {
  name: 'EditDiscardDialog',

  props: {
    showTickle: { type: Boolean, default: false, required: true },
    dialogTitle: { type: String, default: '' }
  },

  watch: {
    showTickle () { this.showDlg = true }
  },

  data () {
    return {
      showDlg: false
    }
  },

  methods: {
    onYesDiscardChanges () {
      this.$emit('discard-changes-yes')
    }
  }
}
</script>
