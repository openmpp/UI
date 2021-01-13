<template>
<q-page class="text-body1 q-pa-sm">

  <table class="settings-table">
    <thead>
      <tr><th colspan="3" class="settings-cell text-weight-medium q-pa-sm">{{ $t('Session state and settings') }}</th></tr>
    </thead>
    <tbody>

      <tr>
        <td class="settings-cell q-pa-sm">
          <q-btn
            @click="doModelListClear"
            flat
            dense
            class="bg-primary text-white rounded-borders"
            icon="cancel"
            :title="$t('Clear models list')"
            />
        </td>
        <td class="settings-cell q-pa-sm om-text-secondary">{{ $t('List of Models') }}:</td>
        <td class="settings-cell q-pa-sm">{{ modelCount ? modelCount.toString() + ' ' + $t('model(s)') : $t('Empty') }}</td>
      </tr>

      <tr>
        <td class="settings-cell q-pa-sm">
          <q-btn
            @click="doModelClear"
            flat
            dense
            class="bg-primary text-white rounded-borders"
            icon="cancel"
            :title="$t('Clear model')"
            />
        </td>
        <td class="settings-cell q-pa-sm om-text-secondary">{{ $t('Current Model') }}:</td>
        <td class="settings-cell q-pa-sm">{{ modelTitle }}</td>
      </tr>

      <tr>
        <td class="settings-cell q-pa-sm">
          <q-btn
            @click="doRunTextListClear"
            flat
            dense
            class="bg-primary text-white rounded-borders"
            icon="cancel"
            :title="$t('Clear list of model runs')"
            />
        </td>
        <td class="settings-cell q-pa-sm om-text-secondary">{{ $t('Model Runs') }}:</td>
        <td class="settings-cell q-pa-sm">{{ runCount ? runCount.toString() + ' ' + $t('run result(s)') : $t('Empty') }}</td>
      </tr>

      <tr>
        <td class="settings-cell q-pa-sm">
          <q-btn
            @click="doWorksetTextListClear"
            flat
            dense
            class="bg-primary text-white rounded-borders"
            icon="cancel"
            :title="$t('Clear list of input scenarios')"
            />
        </td>
        <td class="settings-cell q-pa-sm om-text-secondary">{{ $t('Input Scenarios') }}:</td>
        <td class="settings-cell q-pa-sm">{{ worksetCount ? worksetCount.toString() + ' ' + $t('scenario(s)') : $t('Empty') }}</td>
      </tr>

      <tr>
        <td class="settings-cell q-pa-sm">&nbsp;</td>
        <td class="settings-cell q-pa-sm om-text-secondary">{{ $t('Language') }}:</td>
        <td class="settings-cell q-pa-sm">{{ uiLangTitle }}</td>
      </tr>

    </tbody>
  </table>

</q-page>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'

export default {
  name: 'SessionSettings',

  computed: {
    uiLangTitle () { return this.uiLang !== '' ? this.uiLang : this.$t('Default') },
    modelTitle () { return Mdf.isModel(this.theModel) ? Mdf.modelTitle(this.theModel) : this.$t('Not selected') },
    runCount () { return Mdf.runTextCount(this.runTextList) },
    worksetCount () { return Mdf.worksetTextCount(this.worksetTextList) },

    ...mapState('model', {
      theModel: state => state.theModel,
      runTextList: state => state.runTextList,
      worksetTextList: state => state.worksetTextList
    }),
    ...mapGetters('model', {
      modelCount: 'modelListCount'
    }),
    ...mapState('uiState', {
      uiLang: state => state.uiLang
    })
  },

  methods: {
    doModelClear () { this.dispatchTheModel(Mdf.emptyModel()) },
    doModelListClear () { this.dispatchModelList([]) },
    doRunTextListClear () { this.dispatchRunTextList([]) },
    doWorksetTextListClear () { this.dispatchWorksetTextList([]) },

    ...mapActions('model', {
      dispatchTheModel: 'theModel',
      dispatchModelList: 'modelList',
      dispatchRunTextList: 'runTextList',
      dispatchWorksetTextList: 'worksetTextList'
    })
  },

  mounted () { }
}
</script>

<style lang="scss" scoped>
  .settings-table {
    border-collapse: collapse;
  }
  .settings-cell {
    border: 1px solid lightgrey;
  }
</style>
