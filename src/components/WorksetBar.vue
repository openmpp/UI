<!-- workset info bar: show workset (a.k.a. input secenario) info in flex bar -->
<template>
  <div
    class="row reverse-wrap items-center"
    >

    <q-btn
      @click="onShowWorksetNote"
      :disable="!isNotEmptyWorkset"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs"
      icon="mdi-information"
      :title="$t('About') + ' ' + worksetText.Name"
      />
    <q-btn
      v-if="isNewRunButton"
      @click="onNewRunClick"
      :disable="!isNotEmptyWorkset || !isReadonlyWorkset"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs"
      icon="mdi-run"
      :title="$t('Run the Model')"
      />
    <q-btn
      v-if="isReadonlyButton"
      :disable="!isNotEmptyWorkset || isReadonlyDisabled"
      @click="onWorksetReadonlyToggle"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs"
      :icon="(!isNotEmptyWorkset || isReadonlyWorkset) ? 'mdi-lock' : 'mdi-lock-open-variant'"
      :title="((!isNotEmptyWorkset || isReadonlyWorkset) ? $t('Open for read and write') : $t('Close and only read')) + ' ' + worksetText.Name"
      />

    <div
      class="col-auto"
      >
      <span>{{ worksetText.Name }}<br />
      <span class="om-text-descr"><span class="mono">{{ lastDateTimeStr }} </span>{{ descrOfWorkset }}</span></span>
    </div>

  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'

export default {
  name: 'WorksetBar',

  props: {
    modelDigest: { type: String, default: '' },
    worksetName: { type: String, default: '' },
    isNewRunButton: { type: Boolean, default: false },
    isReadonlyButton: { type: Boolean, default: false },
    isReadonlyDisabled: { type: Boolean, default: false }
  },

  data () {
    return {
      worksetText: Mdf.emptyWorksetText()
    }
  },

  computed: {
    isNotEmptyWorkset () { return Mdf.isNotEmptyWorksetText(this.worksetText) },
    lastDateTimeStr () { return Mdf.dtStr(this.worksetText.UpdateDateTime) },
    descrOfWorkset () { return Mdf.descrOfTxt(this.worksetText) },

    // if true then workset is read-only and model run enabled
    isReadonlyWorkset () {
      return Mdf.isNotEmptyWorksetText(this.worksetText) && this.worksetText.IsReadonly
    },

    ...mapState('model', {
      worksetTextListUpdated: state => state.worksetTextListUpdated
    }),
    ...mapGetters('model', {
      worksetTextByName: 'worksetTextByName'
    })
  },

  watch: {
    modelDigest () { this.doRefresh() },
    worksetName () { this.doRefresh() },
    worksetTextListUpdated () { this.doRefresh() }
  },

  methods: {
    doRefresh () {
      this.worksetText = this.worksetTextByName({ ModelDigest: this.modelDigest, Name: this.worksetName })
    },
    onShowWorksetNote () {
      this.$emit('set-info-click', this.modelDigest, this.worksetName)
    },
    // new model run using current workset name: open model run tab
    onNewRunClick () {
      this.$emit('new-run-select')
    },
    // toggle current workset readonly status: pass event from child up to the next level
    onWorksetReadonlyToggle () {
      this.$emit('set-update-readonly', this.modelDigest, this.worksetName, !this.worksetText.IsReadonly)
    }
  },

  mounted () {
    this.doRefresh()
  }
}
</script>

<style lang="scss" scope="local">
</style>
