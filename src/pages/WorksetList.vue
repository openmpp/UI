<template>
<div class="text-body1">

  <q-card v-if="isNotEmptyWorksetCurrent" class="q-ma-sm">

    <div
      class="row reverse-wrap items-center"
      >

      <span class="col-auto no-wrap q-ml-sm q-mr-xs">
        <q-btn
          @click="onToogleShowParamTree"
          no-caps
          unelevated
          dense
          color="primary"
          class="rounded-borders tab-switch-button"
          :class="{ 'om-bg-inactive' : !isParamTreeShow }"
          >
          <q-icon :name="isParamTreeShow ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" />
          <span>{{ $t('Parameters') }}</span>
          <q-badge outline class="q-ml-sm q-mr-xs">{{ paramCountWorksetCurrent }}</q-badge>
        </q-btn>
      </span>

      <q-btn
        @click="doShowWorksetNote(worksetNameSelected)"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        icon="mdi-information"
        :title="$t('About') + ' ' + worksetNameSelected"
        />
      <q-btn
        @click="onNewRunClick"
        :disable="!isReadonlyWorksetCurrent"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        icon="mdi-run"
        :title="$t('Run the Model')"
        />
      <q-btn
        @click="onWorksetEditToggle"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        :icon="!isReadonlyWorksetCurrent ? 'mdi-content-save-edit' : 'mdi-table-edit'"
        :title="(!isReadonlyWorksetCurrent ? $t('Save') : $t('Edit')) + ' ' + worksetNameSelected"
        />

      <transition
        enter-active-class="animated fadeIn"
        leave-active-class="animated fadeOut"
        mode="out-in"
        >
        <div
          :key="worksetNameSelected"
          class="col-auto"
          >
          <span>{{ worksetNameSelected }}<br />
          <span class="om-text-descr"><span class="mono">{{ dateTimeStr(worksetCurrent.UpdateDateTime) }} </span>{{ descrWorksetCurrent }}</span></span>
        </div>
      </transition>
    </div>

    <q-card-section v-show="isParamTreeShow" class="q-px-sm q-pt-none">

      <workset-parameter-list
        :refresh-tickle="refreshTickle"
        @set-parameter-select="onParamLeafClick"
        @set-parameter-info-show="doShowParamNote"
        @set-parameter-group-info-show="doShowGroupNote"
        >
      </workset-parameter-list>

    </q-card-section>

  </q-card>

  <q-card class="q-ma-sm">
    <div class="row items-center full-width q-pt-sm q-px-sm">

      <q-btn
        v-if="isAnyGroup"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs om-tree-control-button"
        :icon="isTreeCollapsed ? 'keyboard_arrow_down' : 'keyboard_arrow_up'"
        :title="isTreeCollapsed ? $t('Expand all') : $t('Collapse all')"
        @click="doToogleExpandTree"
        />
      <span class="col-grow">
        <q-input
          ref="filterInput"
          debounce="500"
          v-model="treeFilter"
          outlined
          dense
          :placeholder="$t('Find input scenario...')"
          >
          <template v-slot:append>
            <q-icon v-if="treeFilter !== ''" name="cancel" class="cursor-pointer" @click="resetFilter" />
            <q-icon v-else name="search" />
          </template>
        </q-input>
      </span>

    </div>

    <div class="q-pa-sm">
      <q-tree
        ref="worksetTree"
        default-expand-all
        :nodes="treeData"
        node-key="key"
        :filter="treeFilter"
        :filter-method="doTreeFilter"
        :no-results-label="$t('No input scenarios found')"
        :no-nodes-label="$t('Server offline or no input scenarios published')"
        >
        <template v-slot:default-header="prop">

          <div
            v-if="prop.node.children && prop.node.children.length"
            class="row no-wrap items-center"
            >
            <div class="col">
              <span>{{ prop.node.label }}<br />
              <span class="om-text-descr">{{ prop.node.descr }}</span></span>
            </div>
          </div>

          <div v-else
            @click="onWorksetLeafClick(prop.node.label)"
            class="row no-wrap items-center full-width cursor-pointer om-tree-leaf"
            :class="{ 'text-primary' : prop.node.label === worksetNameSelected }"
            >
            <q-btn
              @click.stop="doShowWorksetNote(prop.node.label)"
              flat
              round
              dense
              color="primary"
              class="col-auto"
              icon="mdi-information-outline"
              :title="$t('About') + ' ' + prop.node.label"
              />
            <q-btn
              :disable="!prop.node.label || prop.node.isReadonly"
              @click.stop="onShowWorksetDelete(prop.node.label)"
              flat
              round
              dense
              color="primary"
              class="col-auto"
              icon="mdi-delete-outline"
              :title="$t('Delete') + ': ' + prop.node.label"
              />
            <q-btn
              :disable="!serverConfig.AllowDownload || !prop.node.isReadonly"
              @click.stop="doDownloadWorkset(prop.node.label)"
              flat
              round
              dense
              :color="prop.node.isReadonly ? 'primary' : 'secondary'"
              class="col-auto"
              icon="mdi-file-download-outline"
              :title="$t('Download') + ' ' + prop.node.label"
              />
            <div class="col">
              <span>{{ prop.node.label }}<br />
              <span
                :class="prop.node.label === worksetNameSelected ? 'om-text-descr-selected' : 'om-text-descr'"
                >
                <span class="mono">{{ prop.node.lastTime }} </span>{{ prop.node.descr }}</span></span>
            </div>
          </div>

        </template>
      </q-tree>
    </div>
  </q-card>

  <workset-info-dialog :show-tickle="worksetInfoTickle" :model-digest="digest" :workset-name="worksetInfoName"></workset-info-dialog>
  <parameter-info-dialog :show-tickle="paramInfoTickle" :param-name="paramInfoName" :workset-name="worksetNameSelected"></parameter-info-dialog>
  <group-info-dialog :show-tickle="groupInfoTickle" :group-name="groupInfoName"></group-info-dialog>
  <delete-confirm-dialog
    @delete-yes="onYesWorksetDelete"
    :show-tickle="showDeleteDialog"
    :item-name="worksetNameToDelete"
    :dialog-title="$t('Delete input scenario') + '?'"
    >
  </delete-confirm-dialog>

</div>

</template>

<script>
import { mapState, mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'
import WorksetParameterList from 'components/WorksetParameterList.vue'
import WorksetInfoDialog from 'components/WorksetInfoDialog.vue'
import ParameterInfoDialog from 'components/ParameterInfoDialog.vue'
import GroupInfoDialog from 'components/GroupInfoDialog.vue'
import DeleteConfirmDialog from 'components/DeleteConfirmDialog.vue'

export default {
  name: 'WorksetList',
  components: { WorksetParameterList, WorksetInfoDialog, ParameterInfoDialog, GroupInfoDialog, DeleteConfirmDialog },

  props: {
    digest: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      worksetCurrent: Mdf.emptyWorksetText(), // currently selected workset
      isTreeCollapsed: false,
      isAnyGroup: false,
      treeData: [],
      treeFilter: '',
      isParamTreeShow: false,
      worksetInfoTickle: false,
      worksetInfoName: '',
      groupInfoTickle: false,
      groupInfoName: '',
      paramInfoTickle: false,
      paramInfoName: '',
      nextId: 100,
      worksetNameToDelete: ',',
      showDeleteDialog: false
    }
  },

  computed: {
    isNotEmptyWorksetCurrent () { return Mdf.isNotEmptyWorksetText(this.worksetCurrent) },
    descrWorksetCurrent () { return Mdf.descrOfTxt(this.worksetCurrent) },
    paramCountWorksetCurrent () { return Mdf.worksetParamCount(this.worksetCurrent) },

    // if true then selected workset in edit mode else read-only and model run enabled
    isReadonlyWorksetCurrent () {
      return Mdf.isNotEmptyWorksetText(this.worksetCurrent) && this.worksetCurrent.IsReadonly
    },

    ...mapState('model', {
      theModel: state => state.theModel,
      worksetTextList: state => state.worksetTextList,
      worksetTextListUpdated: state => state.worksetTextListUpdated
    }),
    ...mapGetters('model', {
      worksetTextByName: 'worksetTextByName'
    }),
    ...mapState('uiState', {
      worksetNameSelected: state => state.worksetNameSelected
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl,
      serverConfig: state => state.config
    })
  },

  watch: {
    digest () { this.doRefresh() },
    refreshTickle () { this.doRefresh() },
    worksetTextListUpdated () { this.doRefresh() },
    worksetNameSelected () {
      this.worksetCurrent = this.worksetTextByName({ ModelDigest: this.digest, Name: this.worksetNameSelected })
    }
  },

  methods: {
    dateTimeStr (dt) { return Mdf.dtStr(dt) },

    // update page view
    doRefresh () {
      this.treeData = this.makeWorksetTreeData(this.worksetTextList)
      this.worksetCurrent = this.worksetTextByName({ ModelDigest: this.digest, Name: this.worksetNameSelected })
    },

    // expand or collapse all workset tree nodes
    doToogleExpandTree () {
      if (this.isTreeCollapsed) {
        this.$refs.worksetTree.expandAll()
      } else {
        this.$refs.worksetTree.collapseAll()
      }
      this.isTreeCollapsed = !this.isTreeCollapsed
    },
    // filter workset tree nodes by name (label), update date-time or description
    doTreeFilter (node, filter) {
      const flt = filter.toLowerCase()
      return (node.label && node.label.toLowerCase().indexOf(flt) > -1) ||
        ((node.lastTime || '') !== '' && node.lastTime.indexOf(flt) > -1) ||
        ((node.descr || '') !== '' && node.descr.toLowerCase().indexOf(flt) > -1)
    },
    // clear workset tree filter value
    resetFilter () {
      this.treeFilter = ''
      this.$refs.filterInput.focus()
    },
    // click on workset: select this workset as current workset
    onWorksetLeafClick (name) {
      this.$emit('set-select', name)
    },
    // show workset notes dialog
    doShowWorksetNote (name) {
      this.worksetInfoName = name
      this.worksetInfoTickle = !this.worksetInfoTickle
    },

    // show yes/no dialog to confirm workset delete
    onShowWorksetDelete (name) {
      this.worksetNameToDelete = name
      this.showDeleteDialog = !this.showDeleteDialog
    },
    // user answer yes to confirm delete model workset
    onYesWorksetDelete (name) {
      this.doWorksetDelete(name)
    },

    // click on  workset download: start workset download and show download list page
    doDownloadWorkset (name) {
      // if name is empty or workset is not read-only then do not show rn download page
      if (!name) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to download input scenario, it is not a read-only') })
        return
      }
      const wt = this.worksetTextByName({ ModelDigest: this.digest, Name: name })
      if (!wt || !wt.IsReadonly) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to download input scenario, it is not a read-only') })
        return
      }

      this.startWorksetDownload(name) // start workset download and show download page on success
    },

    // new model run using current workset name: open model run tab
    onNewRunClick () {
      this.$emit('new-run-select')
    },
    // toggle current workset readonly status: pass event from child up to the next level
    onWorksetEditToggle () {
      this.$emit('set-update-readonly', !this.worksetCurrent.IsReadonly)
    },

    // show or hide parameters tree
    onToogleShowParamTree () {
      this.isParamTreeShow = !this.isParamTreeShow
      if (this.isParamTreeShow) this.isTableTreeShow = false
    },
    // click on parameter: open current workset parameter values tab
    onParamLeafClick (key, name) {
      this.$emit('set-parameter-select', name)
    },
    // show workset parameter notes dialog
    doShowParamNote (key, name) {
      this.paramInfoName = name
      this.paramInfoTickle = !this.paramInfoTickle
    },
    // show group notes dialog
    doShowGroupNote (key, name) {
      this.groupInfoName = name
      this.groupInfoTickle = !this.groupInfoTickle
    },

    // return tree of model worksets
    makeWorksetTreeData (wLst) {
      this.isAnyGroup = false
      this.treeFilter = ''

      if (!Mdf.isLength(wLst)) return [] // empty workset list
      if (!Mdf.isWorksetTextList(wLst)) {
        this.$q.notify({ type: 'negative', message: this.$t('Input scenarios list is empty or invalid') })
        return [] // invalid workset list
      }

      // add worksets which are not included in any group
      const td = []

      for (const wt of wLst) {
        td.push({
          key: 'wtl-' + wt.Name + '-' + this.nextId++,
          label: wt.Name,
          isReadonly: wt.IsReadonly,
          lastTime: Mdf.dtStr(wt.UpdateDateTime),
          descr: Mdf.descrOfTxt(wt),
          children: [],
          disabled: false
        })
      }
      return td
    },

    // delete workset
    async doWorksetDelete (name) {
      if (!name) {
        console.warn('Unable to delete: invalid (empty) workset name')
        return
      }
      this.$q.notify({ type: 'info', message: this.$t('Deleting') + ': ' + name })

      let isOk = false
      const u = this.omsUrl + '/api/model/' + this.digest + '/workset/' + (name || '')
      try {
        await this.$axios.delete(u) // response expected to be empty on success
        isOk = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Error at delete workset', name, em)
      }
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to delete') + ': ' + name })
        return
      }

      // refresh workset list from the server
      this.$emit('set-list-refresh')
      this.$q.notify({ type: 'info', message: this.$t('Deleted') + ': ' + name })
    },

    // start workset download
    async startWorksetDownload (name) {
      let isOk = false
      let msg = ''

      const u = this.omsUrl + '/api/download/model/' + this.digest + '/workset/' + (name || '')
      try {
        // send download request to the server, response expected to be empty on success
        await this.$axios.post(u)
        isOk = true
      } catch (e) {
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Unable to download model workset', msg)
      }
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to download input scenario') + (msg ? (': ' + msg) : '') })
        return
      }

      this.$emit('download-select', this.digest) // download started: show download list page
      this.$q.notify({ type: 'info', message: this.$t('Model input scenario download started') })
    }
  },

  mounted () {
    this.doRefresh()
    this.$emit('tab-mounted', 'set-list', { digest: this.digest })
  }
}
</script>

<style lang="scss" scope="local">
  .tab-switch-container {
    margin-right: 1px;
  }
  .tab-switch-button {
    border-top-right-radius: 1rem;
  }
</style>
