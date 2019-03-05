<!-- Material Components Web simple wrapper for MDCButton with ripple effect -->
<template>

<button class="mdc-button" :disabled="disabled" @click="doClick">
  <slot></slot>
</button>

</template>

<script>
import { MDCRipple } from '@material/ripple'

export default {
  props: {
    disabled: Boolean,
    raised: Boolean,
    unelevated: Boolean,
    outlined: Boolean,
    dense: Boolean
  },
  data () {
    return {
      mdcRipple: void 0
    }
  },

  methods: {
    doClick (event) {
      this.$emit(event.type)
    }
  },

  mounted () {
    this.mdcRipple = MDCRipple.attachTo(this.$el)
  },
  beforeDestroy () {
    if (this.mdcRipple !== void 0) this.mdcRipple.destroy()
  }
}
</script>

<!-- import MDC styles -->
<style lang="scss">
  @import '@material/button/mdc-button';
</style>
