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
        :disable="isEditWorksetCurrent"
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
        :icon="isEditWorksetCurrent ? 'mdi-content-save-edit' : 'mdi-square-edit-outline'"
        :title="(isEditWorksetCurrent ? $t('Save') : $t('Edit')) + ' ' + worksetNameSelected"
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
              icon="mdi-information"
              :title="$t('About') + ' ' + prop.node.label"
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
  <parameter-info-dialog :show-tickle="paramInfoTickle" :param-name="paramInfoName" :workset-name="worksetInfoName"></parameter-info-dialog>
  <group-info-dialog :show-tickle="groupInfoTickle" :group-name="groupInfoName"></group-info-dialog>

</div>

</template>

<script>
import { mapState, mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'
import WorksetParameterList from 'components/WorksetParameterList.vue'
import WorksetInfoDialog from 'components/WorksetInfoDialog.vue'
import ParameterInfoDialog from 'components/ParameterInfoDialog.vue'
import GroupInfoDialog from 'components/GroupInfoDialog.vue'

export default {
  name: 'WorksetList',
  components: { WorksetParameterList, WorksetInfoDialog, ParameterInfoDialog, GroupInfoDialog },

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
      nextId: 100
    }
  },

  computed: {
    isNotEmptyWorksetCurrent () { return Mdf.isNotEmptyWorksetText(this.worksetCurrent) },
    descrWorksetCurrent () { return Mdf.descrOfTxt(this.worksetCurrent) },
    paramCountWorksetCurrent () { return Mdf.worksetParamCount(this.worksetCurrent) },

    // if true then selected workset in edit mode else read-only and model run enabled
    isEditWorksetCurrent () {
      return Mdf.isNotEmptyWorksetText(this.worksetCurrent) && !this.worksetCurrent.IsReadonly
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
          lastTime: Mdf.dtStr(wt.UpdateDateTime),
          descr: Mdf.descrOfTxt(wt),
          children: [],
          disabled: false
        })
      }
      return td
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
