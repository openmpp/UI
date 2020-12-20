<template>
<q-page class="text-body1">

  <div class="row items-center full-width q-pt-sm q-px-sm">

    <q-btn
      v-if="isAnyModelGroup"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs om-tree-control-button"
      :icon="isAllCollapsed ? 'keyboard_arrow_down' :'keyboard_arrow_up'"
      :title="isAllCollapsed ? $t('Expand all') : $t('Collapse all')"
      @click="onToogleAll"
      />
    <span class="col-grow">
      <q-input
        ref="filterInput"
        v-model="treeFilter"
        outlined
        dense
        :placeholder="$t('Find model...')"
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
      ref="theTree"
      default-expand-all
      :nodes="treeData"
      node-key="key"
      :filter="treeFilter"
      :filter-method="doModelFilter"
      :no-results-label="$t('No models found')"
      :no-nodes-label="$t('Server offline or no models published')"
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
          class="row no-wrap items-center full-width om-tree-leaf"
          >
          <q-btn
            @click.stop="doShowModelNote(prop.node.digest)"
            flat
            round
            dense
            color="primary"
            class="col-auto"
            icon="mdi-information"
            :title="$t('About') + ' ' + prop.node.label"
            />
          <router-link
            :to="'/model/' + prop.node.digest"
            :title="prop.node.label"
            class="col om-tree-leaf-link"
            :class="{ 'text-primary' : prop.node.digest === theModelDigest }"
            >
            <span>{{ prop.node.label }}<br />
            <span :class="prop.node.digest === theModelDigest ? 'om-text-descr-selected' : 'om-text-descr'">{{ prop.node.descr }}</span></span>
          </router-link>
        </div>
      </template>
    </q-tree>
  </div>

  <model-info-dialog :show-tickle="modelInfoTickle" :info="modelInfo"></model-info-dialog>

  <q-inner-loading :showing="loadWait">
    <q-spinner-gears size="lg" color="primary" />
  </q-inner-loading>

</q-page>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'
import ModelInfoDialog from 'components/ModelInfoDialog.vue'

export default {
  name: 'ModelList',
  components: { ModelInfoDialog },

  props: {
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      treeFilter: '',
      isAllCollapsed: false,
      isAnyModelGroup: false,
      nextId: 100,
      treeData: [],
      modelInfoTickle: false,
      modelInfo: {
        title: '',
        notes: '',
        modelName: '',
        modelDigest: '',
        createDateTime: '',
        version: ''
      },
      loadDone: false,
      loadWait: false
    }
  },

  computed: {
    // isShowSearch () { return Mdf.lengthOf(this.treeData) > 10 },
    theModelDigest () { return Mdf.modelDigest(this.theModel) },

    ...mapState('model', {
      modelList: state => state.modelList,
      theModel: state => state.theModel
    }),
    ...mapGetters('model', {
      modelCount: 'modelListCount',
      modelByDigest: 'modelByDigest'
    }),
    ...mapState('uiState', {
      uiLang: state => state.uiLang
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl
    })
  },

  watch: {
    refreshTickle () { this.doRefresh() }
  },

  methods: {
    // expand or collapse all tree nodes
    onToogleAll () {
      if (this.isAllCollapsed) {
        this.$refs.theTree.expandAll()
      } else {
        this.$refs.theTree.collapseAll()
      }
      this.isAllCollapsed = !this.isAllCollapsed
    },
    // filter by model name (label) or model description
    doModelFilter (node, filter) {
      const flt = filter.toLowerCase()
      return (node.label && node.label.toLowerCase().indexOf(flt) > -1) ||
        ((node.descr || '') !== '' && node.descr.toLowerCase().indexOf(flt) > -1)
    },
    // clear filter value
    resetFilter () {
      this.treeFilter = ''
      this.$refs.filterInput.focus()
    },

    // show model notes dialog
    doShowModelNote (digest) {
      const m = this.modelByDigest(digest)
      this.modelInfo = {
        title: Mdf.modelTitle(m),
        notes: Mdf.noteOfDescrNote(m),
        modelName: Mdf.modelName(m),
        modelDigest: digest,
        createDateTime: Mdf.dtStr(m.Model.CreateDateTime),
        version: m.Model.Version || ''
      }
      this.modelInfoTickle = !this.modelInfoTickle
    },

    // return tree of models
    makeTreeData (mLst) {
      this.isAnyModelGroup = false
      if (!Mdf.isLength(mLst)) return [] // empty model list
      if (!Mdf.isModelList(mLst)) {
        this.$q.notify({ type: 'negative', message: this.$t('Model list is empty or invalid') })
        return [] // invalid model list
      }

      // add models which are not included in any group
      const td = []

      for (const md of mLst) {
        td.push({
          key: 'mtl-' + md.Model.Digest + '-' + this.nextId++,
          digest: md.Model.Digest,
          label: md.Model.Name,
          descr: Mdf.descrOfDescrNote(md),
          children: [],
          disabled: false
        })
      }
      return td
    },

    // refersh model list
    async doRefresh () {
      this.loadDone = false
      this.loadWait = true

      const u = this.omsUrl + '/api/model-list/text' + (this.uiLang !== '' ? '/lang/' + this.uiLang : '')
      try {
        const response = await this.$axios.get(u)
        this.dispatchModelList(response.data) // update model list in store
        this.treeData = this.makeTreeData(response.data) // update model list tree
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or no models published', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or no models published') })
      }

      this.loadWait = false
    },

    ...mapActions('model', {
      dispatchModelList: 'modelList'
    })
  },

  mounted () {
    // if model list already loaded then exit
    if (this.modelCount > 0) {
      this.loadDone = true
      this.treeData = this.makeTreeData(this.modelList) // update model list tree
      return
    }
    this.doRefresh() // load new model list
  }
}
</script>

<style lang="scss" scope="local">
</style>
