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
      <tbody>

        <tr>
          <td class="settings-cell q-pa-sm">
            <q-btn
              @click="onModelListClear"
              :disable="!modelCount"
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
              @click="onModelClear"
              :disable="!isModel"
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
              @click="onRunTextListClear"
              :disable="!runCount"
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
              @click="onWorksetTextListClear"
              :disable="!worksetCount"
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
          <td class="settings-cell q-pa-sm">
            <q-btn
              @click="onUiLanguageClear"
              :disable="!uiLang"
              flat
              dense
              class="bg-primary text-white rounded-borders"
              icon="cancel"
              :title="$t('Reset language to default value')"
              />
          </td>
          <td class="settings-cell q-pa-sm om-text-secondary">{{ $t('Language') }}:</td>
          <td class="settings-cell q-pa-sm">{{ uiLangTitle }}</td>
        </tr>

        <tr>
          <td colspan="2" class="settings-cell q-pa-sm om-text-secondary">{{ $t('Model Downloads') }}:</td>
          <td class="settings-cell q-pa-sm">
            <q-radio v-model="fastDownload" val="no"  :label="$t('Full, compatible with desktop model')" />
            <br />
            <q-radio v-model="fastDownload" val="yes" :label="$t('Fast, only to analyze output values')" />
          </td>
        </tr>

        <tr>
          <td colspan="3" class="settings-cell q-pa-sm">
            <span class="row">
            <q-btn
              @click="onDownloadViews"
              :disable="!isModel || !paramIdx.length"
              flat
              dense
              no-caps
              align="left"
              class="bg-primary text-white rounded-borders col-grow"
              icon="mdi-content-save-cog"
              :label="isModel ? $t('Download views of') + ' ' + modelTitle : $t('Download model views')"
              />
            </span>
          </td>
        </tr>

        <tr>
          <td class="settings-cell q-pa-sm">
            <q-btn
              @click="onUploadViews"
              :disable="!isModel || !isUploadFile"
              flat
              dense
              class="bg-primary text-white rounded-borders"
              icon="mdi-cog-refresh-outline"
              :title="$t('Upload views of') + (isModel ? (' ' + modelTitle) : '')"
              />
          </td>
          <td colspan="2" class="settings-cell q-pa-sm">
            <q-file
              v-model="uploadFile"
              :disable="!isModel"
              accept=".view.json"
              outlined
              dense
              clearable
              hide-bottom-space
              color="primary"
              :label="isModel ? $t('Upload views of') + ' ' + modelTitle : $t('Upload model views')"
              >
            </q-file>
          </td>
        </tr>

      </tbody>
    </table>
  </q-expansion-item>

  <q-expansion-item
    :disable="!paramIdx.length"
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
            @click="onRemoveParamView(p.name)"
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

  <upload-user-views
    :model-name="modelName"
    :upload-views-tickle="uploadUserViewsTickle"
    @done="doneUserViewsUpload"
    @wait="uploadUserViewsDone = false"
    >
  </upload-user-views>

</q-page>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'
import * as Idb from 'src/idb/idb'
import { exportFile } from 'quasar'
import UploadUserViews from 'components/UploadUserViews.vue'

export default {
  name: 'SessionSettings',
  components: { UploadUserViews },

  data () {
    return {
      dbRows: [],
      paramIdx: [], // parameter names and index in dbRows, if db row exist
      uploadFile: null,
      uploadUserViewsTickle: false,
      uploadUserViewsDone: false,
      fastDownload: 'yes'
    }
  },

  computed: {
    uiLangTitle () { return this.uiLang !== '' ? this.uiLang : this.$t('Default') },
    isModel () { return Mdf.isModel(this.theModel) },
    modelName () { return Mdf.modelName(this.theModel) },
    modelTitle () { return Mdf.isModel(this.theModel) ? Mdf.modelTitle(this.theModel) : this.$t('Not selected') },
    runCount () { return Mdf.runTextCount(this.runTextList) },
    worksetCount () { return Mdf.worksetTextCount(this.worksetTextList) },
    isUploadFile () {
      return this.uploadFile instanceof File && (this.uploadFile?.name || '') !== '' && this.uploadFile?.type === 'application/json'
    },

    ...mapState('model', {
      theModel: state => state.theModel,
      runTextList: state => state.runTextList,
      worksetTextList: state => state.worksetTextList
    }),
    ...mapGetters('model', {
      modelCount: 'modelListCount'
    }),
    ...mapState('uiState', {
      uiLang: state => state.uiLang,
      noAccDownload: state => state.noAccDownload
    })
  },

  watch: {
    fastDownload (val) {
      this.dispatchNoAccDownload(val === 'yes')
    }
  },

  methods: {
    // refresh model settings: select from indexed db
    doRefresh () {
      this.clearState()
      this.fastDownload = this.noAccDownload ? 'yes' : 'no'

      if (this.modelName) this.doReadParameterViews()
    },

    onModelClear () {
      const digest = Mdf.modelDigest(this.theModel)
      this.clearState()
      this.dispatchViewDeleteByModel(digest)
      this.dispatchTheModel(Mdf.emptyModel())
    },
    onModelListClear () {
      const digest = Mdf.modelDigest(this.theModel)
      this.clearState()
      this.dispatchViewDeleteByModel(digest)
      this.dispatchModelList([])
    },
    clearState () {
      this.dbRows = []
      this.paramIdx = []
      this.uploadFile = null
    },
    onRunTextListClear () { this.dispatchRunTextList([]) },
    onWorksetTextListClear () { this.dispatchWorksetTextList([]) },
    onUiLanguageClear () { this.dispatchUiLang('') },

    // retrun parameter description by name
    parameterDescr (pName) { return Mdf.descrOfDescrNote(Mdf.paramTextByName(this.theModel, pName)) },

    // download parameters views
    onDownloadViews () {
      const fName = this.modelName + '.view.json'

      // make parameter views json
      const ps = this.dbRows.filter(r => this.paramIdx.findIndex(p => p.name === r.name) >= 0)
      let vs = ''
      if (Mdf.isLength(ps)) {
        try {
          vs = JSON.stringify({
            model: {
              name: this.modelName,
              parameterViews: ps
            }
          })
        } catch (e) {
          vs = ''
          console.warn('Error at stringify of:', ps)
        }
      }
      if (!vs) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to save views') + ': ' + this.modelName })
        return
      }

      // save as modelName.json
      const ret = exportFile(fName, vs, 'application/json')
      if (!ret) {
        console.warn('Unable to save views:', fName, ret)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to save views') + ': ' + fName })
      }
    },

    // upload parameter views
    async onUploadViews () {
      if (!this.isUploadFile) return

      // read and parse parameter views json
      let vs
      try {
        const t = await this.uploadFile.text()
        if (t) vs = JSON.parse(t)
      } catch (e) {
        vs = undefined
        console.warn('Error at json parse of text from:', this.uploadFile)
      }
      if (!vs || vs?.model?.name !== this.modelName) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to restore views') + ': ' + this.modelName })
        return
      }

      // write parameter views into indexed db
      let count = 0
      if (Array.isArray(vs.model?.parameterViews) && vs.model?.parameterViews?.length) {
        let name = ''
        try {
          const dbCon = await Idb.connection()
          const rw = await dbCon.openReadWrite(this.modelName)
          for (const v of vs.model.parameterViews) {
            if (!v?.name || !v?.view) continue
            name = v.name
            await rw.put(v.name, v.view)
            count++
          }
        } catch (e) {
          console.warn('Unable to save default parameter view:', name, e)
          this.$q.notify({ type: 'negative', message: this.$t('Unable to save default parameter view') + ': ' + name })
          return
        }
      }
      // refresh parameter views: read new version of views from database
      if (count) {
        this.doReadParameterViews()
        this.$q.notify({ type: 'info', message: this.$t('Updated {count} parameter view(s)', { count: count }) })
      } else {
        this.$q.notify({ type: 'info', message: this.$t('No parameter views found') + ': ' + this.modelName })
      }

      // upload parameter views into user home directory
      this.uploadUserViewsTickle = !this.uploadUserViewsTickle
    },

    // upload of parameter views completed
    doneUserViewsUpload (isSuccess, count) {
      this.uploadUserViewsDone = true
      if (isSuccess && count > 0) {
        this.$q.notify({ type: 'info', message: this.$t('Uploaded {count} parameter view(s)', { count: count }) })
      }
    },

    // delete parameter default view
    async onRemoveParamView (pName) {
      if (!this.modelName) return // model not selected

      try {
        const dbCon = await Idb.connection()
        const rw = await dbCon.openReadWrite(this.modelName)
        await rw.remove(pName)
      } catch (e) {
        console.warn('Unable to erase default view of parameter', pName, e)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to erase default view of parameter') + ': ' + pName })
        return
      }

      this.paramIdx = this.paramIdx.filter(p => p.name !== pName)

      this.$q.notify({
        type: 'info',
        message: this.$t('Default view of parameter erased') + ': ' + pName
      })

      // upload parameter views into user home directory
      this.uploadUserViewsTickle = !this.uploadUserViewsTickle
    },

    // select all parameter views from indexed db
    async doReadParameterViews () {
      this.dbRows = []
      this.paramIdx = []

      // select all rows from model indexed db
      this.dbRows = []
      try {
        const dbCon = await Idb.connection()
        const rd = await dbCon.openReadOnly(this.modelName)
        const keyArr = await rd.getAllKeys()
        if (!Mdf.isLength(keyArr)) return // no rows in model db

        for (const key of keyArr) {
          const v = await rd.getByKey(key)
          if (v || v === {}) {
            this.dbRows.push({ name: key, view: v })
          }
        }
      } catch (e) {
        console.warn('Unable to retrive model settings', this.modelName, e)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to retrive model settings') + ': ' + this.modelName })
        return
      }
      if (!Mdf.isLength(this.dbRows)) return // no rows in model db or all rows are empty

      // refresh parameter index: for each parameter name find index in db rows, if exist
      for (const p of this.theModel.ParamTxt) {
        const idx = this.dbRows.findIndex(r => r.name === p.Param.Name)
        if (idx >= 0) this.paramIdx.push({ name: p.Param.Name, dbIdx: idx })
      }
    },

    ...mapActions('model', {
      dispatchTheModel: 'theModel',
      dispatchModelList: 'modelList',
      dispatchRunTextList: 'runTextList',
      dispatchWorksetTextList: 'worksetTextList'
    }),
    ...mapActions('uiState', {
      dispatchUiLang: 'uiLang',
      dispatchNoAccDownload: 'noAccDownload',
      dispatchViewDeleteByModel: 'viewDeleteByModel'
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
