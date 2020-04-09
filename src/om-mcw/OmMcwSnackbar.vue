<!-- Material Components Web simple wrapper for MDCSnackbar -->
<template>
<div
    class="mdc-snackbar"
    :class="{'mdc-snackbar--leading': leading, 'mdc-snackbar--stacked': stacked, 'mdc-snackbar--open': !!isCreateOpen}"
    @MDCSnackbar:opened="onOpened"
    @MDCSnackbar:closed="onClosed"
  >
  <div class="mdc-snackbar__surface">
    <div
      class="mdc-snackbar__label" role="status" aria-live="polite">{{labelText}}</div>
    <div
        v-if="!isNoDismiss || !!actionButtonText"
        class="mdc-snackbar__actions">
      <button
        v-if="!!actionButtonText"
        type="button" class="mdc-button mdc-snackbar__action">{{actionButtonText}}</button>
      <button
        v-if="!isNoDismiss"
        class="mdc-icon-button mdc-snackbar__dismiss material-icons" title="Dismiss">close</button>
    </div>
  </div>
</div>
</template>

<script>
import { MDCSnackbar } from '@material/snackbar'

export default {
  props: {
    labelText: { type: String, default: '' },
    actionButtonText: { type: String, default: '' },
    leading: { type: Boolean, defaut: false },
    stacked: { type: Boolean, defaut: false },
    isCreateOpen: { type: Boolean, defaut: false },
    isNoDismiss: { type: Boolean, defaut: false },
    closeOnEscape: {
      type: Boolean,
      default: void 0
    },
    timeoutMs: {
      type: Number,
      default: void 0
    }
  },

  data () {
    return {
      mdcSnackbar: void 0
    }
  },

  methods: {
    isOpen () {
      return this.mdcSnackbar.isOpen
    },
    doOpen (opts) {
      if (opts) {
        if (opts.timeoutMs) this.mdcSnackbar.timeoutMs = opts.timeoutMs
        if (opts.labelText || '') this.mdcSnackbar.labelText = opts.labelText
        if (opts.actionButtonText || '') this.mdcSnackbar.actionButtonText = opts.actionButtonText
      }
      this.mdcSnackbar.open()
    },
    doClose (reason) {
      this.mdcSnackbar.close(reason)
    },
    onClosed (e) {
      this.$emit('closed', e.detail)
    },
    onOpened () {
      this.$emit('opened')
    }
  },

  mounted () {
    this.mdcSnackbar = MDCSnackbar.attachTo(this.$el)
    if (this.timeoutMs) this.mdcSnackbar.timeoutMs = this.timeoutMs
    if (this.closeOnEscape !== void 0) this.mdcSnackbar.closeOnEscape = this.closeOnEscape
  },
  beforeDestroy () {
    if (this.mdcSnackbar !== void 0) this.mdcSnackbar.destroy()
  }
}
</script>

<!-- import MDC styles -->
<style lang="scss" scoped>
@import '@material/icon-button/mdc-icon-button';
@import "@material/snackbar/mdc-snackbar";
</style>
