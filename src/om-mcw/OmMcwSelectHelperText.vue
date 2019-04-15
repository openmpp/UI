<!-- Material Components Web simple wrapper for MDCSelectHelperText -->
<template>
  <p :id="id"
    class="mdc-select-helper-text"
    :class="{'mdc-select-helper-text--persistent': persistent, 'mdc-select-helper-text--validation-msg': validationMsg}"
    aria-hidden="true"><slot></slot></p>
</template>

<script>
import { MDCSelectHelperText } from '@material/select/helper-text'

export default {
  props: {
    id: {
      type: String,
      required: true
    },
    persistent: {
      type: Boolean,
      default: false
    },
    validationMsg: {
      type: Boolean,
      default: false
    }
  },

  data () {
    return {
      mdcSelectHelperText: void 0
    }
  },

  methods: {
  },

  mounted () {
    this.mdcSelectHelperText = MDCSelectHelperText.attachTo(this.$el)
  },
  beforeDestroy () {
    if (this.mdcSelectHelperText !== void 0) this.mdcSelectHelperText.destroy()
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
@import "@material/select/helper-text/mdc-select-helper-text";
</style>
