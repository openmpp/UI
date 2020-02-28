<template>
  <div id="settings-page" class="mdc-typography mdc-typography--body1">

    <div class="set-table">

      <div class="set-table-row">
        <span class="set-table-cell set-table-first-col">
          <om-mcw-icon-button @click="doUiLangClear()" class="clear-icon-button" alt="Clear language" title="Clear language">
            <i class="material-icons">clear</i>
          </om-mcw-icon-button>
        </span>
        <span class="set-table-cell">Language:</span>
        <span class="set-table-cell medium-wt">{{ uiLangTitle }}</span>
      </div>

      <div class="set-table-row">
        <span class="set-table-cell set-table-first-col">
          <om-mcw-icon-button @click="doModelListClear()" class="clear-icon-button" alt="Clear model list" title="Clear model list">
            <i class="material-icons">clear</i>
          </om-mcw-icon-button>
        </span>
        <span class="set-table-cell">Models list:</span>
        <span class="set-table-cell medium-wt">{{ modelCount }} model(s)</span>
      </div>

      <div class="set-table-row">
        <span class="set-table-cell set-table-first-col">
          <om-mcw-icon-button @click="doModelClear()" class="clear-icon-button" alt="Clear model" title="Clear model">
            <i class="material-icons">clear</i>
          </om-mcw-icon-button>
        </span>
        <span class="set-table-cell">Current model:</span>
        <span class="set-table-cell medium-wt">{{ modelTitle }}</span>
      </div>

      <div class="set-table-row">
        <span class="set-table-cell set-table-first-col">
          <om-mcw-icon-button @click="doRunClear()" class="clear-icon-button" alt="Clear model run list" title="Clear model run list">
            <i class="material-icons">clear</i>
          </om-mcw-icon-button>
        </span>
        <span class="set-table-cell">Model run results:</span>
        <span class="set-table-cell medium-wt">{{ runCount }}</span>
      </div>

      <div class="set-table-row">
        <span class="set-table-cell set-table-first-col">
          <om-mcw-icon-button @click="doWsClear()" class="clear-icon-button" alt="Clear model workset list" title="Clear model workset list">
            <i class="material-icons">clear</i>
          </om-mcw-icon-button>
        </span>
        <span class="set-table-cell">Sets of input parameters:</span>
        <span class="set-table-cell medium-wt">{{ worksetCount }}</span>
      </div>

      <div v-if="isNotEmptyRun" class="set-table-row">
        <span class="set-table-cell"></span>
        <span class="set-table-cell">Current model run:</span>
        <span class="set-table-cell">
          <span class="mono">{{lastTimeOfRun}}&nbsp;</span><span class="medium-wt">{{nameOfRun}}</span>
          <span>{{ descrOfRun }}</span>
        </span>
      </div>

      <div v-if="isNotEmptyWorkset" class="set-table-row">
        <span class="set-table-cell"></span>
        <span class="set-table-cell">Current input set:</span>
        <span class="set-table-cell">
          <span class="mono">{{lastTimeOfWorkset}}&nbsp;</span><span class="medium-wt">{{nameOfWorkset}}</span>
          <span>{{ descrOfWorkset }}</span>
        </span>
      </div>

    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { GET, DISPATCH } from '@/store'
import * as Mdf from '@/modelCommon'
import OmMcwIconButton from '@/om-mcw/OmMcwIconButton'

export default {
  props: {
  },

  data () {
    return {
    }
  },

  computed: {
    uiLangTitle () { return this.uiLang !== '' ? this.uiLang : 'Default' },
    modelTitle () { return Mdf.isModel(this.theModel) ? Mdf.modelTitle(this.theModel) : 'Not selected' },
    modelCount () { return this.modelListCount },
    runCount () { return Mdf.runTextCount(this.runTextList) },
    worksetCount () { return Mdf.worksetTextCount(this.worksetTextList) },

    runSelected () { return this.runTextByDigestOrName(this.theSelected.runDigestName) },
    isNotEmptyRun () { return Mdf.isNotEmptyRunText(this.runSelected) },
    lastTimeOfRun () { return Mdf.dtStr(this.runSelected.UpdateDateTime) },
    nameOfRun () { return this.runSelected.Name || '' },
    descrOfRun () { return Mdf.descrOfTxt(this.runSelected) },

    wsSelected () { return this.worksetTextByName(this.theSelected.worksetName) },
    isNotEmptyWorkset () { return Mdf.isNotEmptyWorksetText(this.wsSelected) },
    lastTimeOfWorkset () { return Mdf.dtStr(this.wsSelected.UpdateDateTime) },
    nameOfWorkset () { return this.wsSelected.Name || '' },
    descrOfWorkset () { return Mdf.descrOfTxt(this.wsSelected) },

    ...mapGetters({
      uiLang: GET.UI_LANG,
      theModel: GET.THE_MODEL,
      modelListCount: GET.MODEL_LIST_COUNT,
      runTextList: GET.RUN_TEXT_LIST,
      worksetTextList: GET.WORKSET_TEXT_LIST,
      runTextByDigestOrName: GET.RUN_TEXT_BY_DIGEST_OR_NAME,
      worksetTextByName: GET.WORKSET_TEXT_BY_NAME,
      theSelected: GET.THE_SELECTED,
      omppServerUrl: GET.OMPP_SRV_URL
    })
  },

  methods: {
    doUiLangClear () { this.dispatchUiLang('') },
    doModelClear () { this.dispatchEmptyModel() },
    doModelListClear () { this.dispatchEmptyModelList() },
    doRunClear () { this.dispatchEmptyRunTextList() },
    doWsClear () { this.dispatchEmptyWorksetTextList() },

    ...mapActions({
      dispatchUiLang: DISPATCH.UI_LANG,
      dispatchTheModel: DISPATCH.THE_MODEL,
      dispatchEmptyModel: DISPATCH.EMPTY_MODEL,
      dispatchEmptyModelList: DISPATCH.EMPTY_MODEL_LIST,
      dispatchEmptyRunTextList: DISPATCH.EMPTY_RUN_TEXT_LIST,
      dispatchEmptyWorksetTextList: DISPATCH.EMPTY_WORKSET_TEXT_LIST
    })
  },

  components: { OmMcwIconButton }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
  .set-table {
    display: table;
    padding-top: 0.5rem;
  }
  .set-table-row {
    display: table-row;
  }
  .set-table-cell {
    display: table-cell;
    &:not(:first-child) {
      padding-right: 0.5rem;
    }
  }
  .set-table-first-col {
    background: rgba(0, 0, 0, 0.05);
    &:hover {
      background-color: transparent;
    }
  }
</style>
