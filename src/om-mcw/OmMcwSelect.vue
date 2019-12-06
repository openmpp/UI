<!-- Material Components Web simple wrapper for MDCSelect based on native select -->
<template>
<div
  class="mdc-select"
  :class="[{'mdc-select--disabled': disabled}, outlined ? 'mdc-select--outlined' : 'mdc-ripple-upgraded']"
  >
  <i class="mdc-select__dropdown-icon"></i>

  <select :id="id"
    :disabled="disabled"
    class="mdc-select__native-control"
    @change="onChange"
    :aria-controls="idHelperText"
    :aria-describedby="idHelperText"
    >
    <option v-if="isEmptyDefault && !selected" value="" disabled="" selected=""></option>
    <option
      v-for="opt in options"
      :key="opt.value"
      :value="opt.value"
      :selected="selected === opt.value"
      >{{ opt.text }}</option>
  </select>

  <template v-if="!outlined">
    <label v-if="!!label"
     :for="id"
     class="mdc-floating-label"
     :class="{'mdc-floating-label--float-above': !isEmptyDefault && !!selected}">{{label}}</label>
    <div class="mdc-line-ripple"></div>
  </template>
  <template v-else>
    <div class="mdc-notched-outline mdc-notched-outline--upgraded mdc-notched-outline--notched">
      <div class="mdc-notched-outline__leading"></div>
      <div class="mdc-notched-outline__notch">
        <label v-if="!!label"
         :for="id"
         class="mdc-floating-label"
         :class="{'mdc-floating-label--float-above': !isEmptyDefault && !!selected}">{{label}}</label>
      </div>
      <div class="mdc-notched-outline__trailing"></div>
    </div>
  </template>
</div>
</template>

<script>
import { MDCSelect } from '@material/select'

export default {
  props: {
    id: {
      type: String,
      required: true
    },
    label: { type: String, default: '' },
    options: {
      type: Array,
      default: () => []
    },
    selected: { type: String, default: '' },
    disabled: { type: Boolean, defaut: false },
    required: { type: Boolean, defaut: false },
    outlined: { type: Boolean, defaut: false },
    isEmptyDefault: { type: Boolean, defaut: false },
    idHelperText: {
      type: String,
      default: void 0
    }
  },

  data () {
    return {
      mdcSelect: void 0
    }
  },

  methods: {
    onChange (event) {
      this.$emit('change', event.target.value)
    }
  },

  mounted () {
    this.mdcSelect = MDCSelect.attachTo(this.$el)
    this.mdcSelect.required = this.required
  },
  beforeDestroy () {
    if (this.mdcSelect !== void 0) this.mdcSelect.destroy()
  }
}
</script>

<!-- local scope css: this component only -->
<!--
@import "@material/floating-label/mdc-floating-label";
@import "@material/line-ripple/mdc-line-ripple";
@import "@material/notched-outline/mdc-notched-outline";
-->
<style lang="scss" scoped>
@import "@material/theme/mdc-theme";
@import "@material/select/icon/mdc-select-icon";
@import "@material/select/mdc-select";

.mdc-select:not(.mdc-select--invalid) label.mdc-floating-label.mdc-floating-label--float-above {
  @extend .mdc-theme--on-surface;
}
</style>
