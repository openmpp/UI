<!-- Material Components Web simple wrapper for MDCMenu -->
<template>

<div @MDCMenu:selected="onSelected" class="mdc-menu mdc-menu-surface">
  <ul class="mdc-list" role="menu" aria-hidden="true" aria-orientation="vertical" tabindex="-1">
    <slot></slot>
  </ul>
</div>

</template>

<script>
import { MDCMenu } from '@material/menu'

export default {
  props: {
    quickOpen: { type: Boolean, default: false }
  },
  data () {
    return {
      mdcMenu: void 0
    }
  },

  methods: {
    toggle () {
      this.mdcMenu.open = !this.mdcMenu.open
    },
    onSelected (evtData) {
      this.$emit('selected', evtData.detail)
    }
  },

  mounted () {
    this.mdcMenu = MDCMenu.attachTo(this.$el)
    this.mdcMenu.quickOpen = this.quickOpen
  },
  beforeDestroy () {
    if (this.mdcMenu !== void 0) this.mdcMenu.destroy()
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
// @import "@material/list/mdc-list";
// @import "@material/menu-surface/mdc-menu-surface";
// @import "@material/menu/mdc-menu";
</style>
