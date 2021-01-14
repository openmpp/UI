<template>
<q-page class="text-body1 q-pa-sm">

  <q-expansion-item
    switch-toggle-side
    expand-separator
    default-opened
    header-class="bg-primary text-white"
    :label="$t('Session state and settings')"
    >
    <table class="settings-table q-mb-sm">
      <!--
      <thead>
        <tr><th colspan="3" class="settings-cell text-weight-medium q-pa-sm">{{ $t('Session state and settings') }}</th></tr>
      </thead>
      -->
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
  </q-expansion-item>

  <q-expansion-item
    :disable="!paramIdxCount"
    switch-toggle-side
    expand-separator
    default-opened
    header-class="bg-primary text-white"
    :label="$t('Default views of parameters')"
    >
    <q-list bordered separator>

      <q-item v-for="p of paramIdx" :key="p.name">
        <q-item-section avatar>
          <q-btn
            @click="doRemoveParamDefaultView(p.name)"
            flat
            dense
            class="bg-primary text-white rounded-borders"
            icon="delete"
            :title="$t('Erase default view of parameter') + ' ' + p.name"
            />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ p.name }}</q-item-label>
          <q-item-label caption>{{ parameterDescr(p.name) }}</q-item-label>
        </q-item-section>
      </q-item>

    </q-list>
  </q-expansion-item>

</q-page>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'
import * as Idb from 'src/idb/idb'

export default {
  name: 'SessionSettings',

  data () {
    return {
      dbRows: [],
      paramIdxCount: 0, // number of parameters where default view stored in database
      paramIdx: [] // parameter names and index in dbRows, if db row exist
    }
  },

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

    // retrun parameter description by name
    parameterDescr (pName) { return Mdf.descrOfDescrNote(Mdf.paramTextByName(this.theModel, pName)) },

    // delete parameter default view
    async doRemoveParamDefaultView (pName) {
      const mName = Mdf.modelName(this.theModel)
      if (!mName) return // model not selected

      try {
        const dbCon = await Idb.connection()
        const rw = await dbCon.openReadWrite(mName)
        await rw.remove(pName)
      } catch (e) {
        console.warn('Unable to erase default view of parameter', pName, e)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to erase default view of parameter') + ': ' + pName })
        return
      }

      this.paramIdx = this.paramIdx.filter(p => p.name !== pName)
      this.paramIdxCount = Mdf.lengthOf(this.paramIdx)

      this.$q.notify({
        type: 'info',
        message: this.$t('Default view of parameter erased') + ': ' + pName
      })
    },

    // refresh model settings: select from indexed db
    async doRefresh () {
      this.dbRows = []
      this.paramIdx = []
      this.paramIdxCount = 0

      const mName = Mdf.modelName(this.theModel)
      if (!mName) return // model not selected

      // select all rows from model indexed db
      this.dbRows = []
      try {
        const dbCon = await Idb.connection()
        const rd = await dbCon.openReadOnly(mName)
        const keyArr = await rd.getAllKeys()
        if (!Mdf.isLength(keyArr)) return // no rows in model db

        for (const key of keyArr) {
          const v = await rd.getByKey(key)
          if (v || v === {}) {
            this.dbRows.push({ key: key, value: v })
          }
        }
      } catch (e) {
        console.warn('Unable to retrive model settings', mName, e)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to retrive model settings') + ': ' + mName })
        return
      }
      if (!Mdf.isLength(this.dbRows)) return // no rows in model db or all rows are empty

      // refresh parameter index: for each parameter name find index in db rows, if exist
      for (const p of this.theModel.ParamTxt) {
        const idx = this.dbRows.findIndex(r => r.key === p.Param.Name)
        if (idx >= 0) this.paramIdx.push({ name: p.Param.Name, dbIdx: idx })
      }
      this.paramIdxCount = Mdf.lengthOf(this.paramIdx)
    },

    ...mapActions('model', {
      dispatchTheModel: 'theModel',
      dispatchModelList: 'modelList',
      dispatchRunTextList: 'runTextList',
      dispatchWorksetTextList: 'worksetTextList'
    })
  },

  mounted () {
    this.doRefresh()
  }
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
