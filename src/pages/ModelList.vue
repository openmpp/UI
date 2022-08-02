<template>
<q-page class="text-body1">

  <div class="row items-center full-width q-pt-sm q-px-sm">

    <q-btn
      v-if="isAnyModelGroup"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs om-tree-control-button"
      :icon="!isAllExpanded ? 'keyboard_arrow_down' :'keyboard_arrow_up'"
      :title="!isAllExpanded ? $t('Expand all') : $t('Collapse all')"
      @click="doToogleExpandTree"
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
      :nodes="treeData"
      node-key="key"
      default-expand-all
      :filter="treeFilter"
      :filter-method="doModelFilter"
      :no-results-label="$t('No models found')"
      :no-nodes-label="$t('Server offline or no models published')"
      >
      <template v-slot:default-header="prop">
        <div
          v-if="prop.node.children && prop.node.children.length"
          class="row no-wrap items-center"
          :class="{'om-tree-found-node': treeWalk.keysFound[prop.node.key]}"
          >
          <div class="col">
            <span>{{ prop.node.label }}<br />
            <span class="om-text-descr">{{ prop.node.descr }}</span></span>
          </div>
        </div>
        <div v-else
          class="row no-wrap items-center full-width om-tree-leaf"
          :class="{'om-tree-found-node': treeWalk.keysFound[prop.node.key]}"
          >
          <q-btn
            @click.stop="doShowModelNote(prop.node.digest)"
            flat
            round
            dense
            color="primary"
            class="col-auto"
            icon="mdi-information-outline"
            :title="$t('About') + ' ' + prop.node.label"
            />
          <q-btn
            v-if="serverConfig.AllowDownload"
            @click.stop="doModelDownload(prop.node.digest)"
            flat
            round
            dense
            color="primary"
            class="col-auto"
            icon="mdi-download-circle-outline"
            :title="$t('Download') + ' ' + prop.node.label"
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

  <model-info-dialog :show-tickle="modelInfoTickle" :digest="modelInfoDigest"></model-info-dialog>

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
      isAllExpanded: false,
      isAnyModelGroup: false,
      nextId: 100,
      treeData: [],
      treeWalk: {
        isAnyFound: false,
        prevFilter: '',
        size: 0,
        count: 0,
        keysFound: {} // if node match filter then map keysFound[node.key] = true
      },
      modelInfoTickle: false,
      modelInfoDigest: '',
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
      modelCount: 'modelListCount'
    }),
    ...mapState('uiState', {
      uiLang: state => state.uiLang,
      noAccDownload: state => state.noAccDownload
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl,
      serverConfig: state => state.config
    })
  },

  watch: {
    refreshTickle () { this.doRefresh() }
  },

  methods: {
    // expand or collapse all tree nodes
    doToogleExpandTree () {
      if (this.isAllExpanded) {
        this.$refs.theTree.collapseAll()
      } else {
        this.$refs.theTree.expandAll()
      }
      this.isAllExpanded = !this.isAllExpanded
    },
    // filter by model name (label) or model description
    doModelFilter (node, filter) {
      const flt = filter.toLowerCase()
      let isFound = (node.label && node.label.toLowerCase().indexOf(flt) > -1) ||
        ((node.descr || '') !== '' && node.descr.toLowerCase().indexOf(flt) > -1)

      isFound = this.updateTreeWalk(isFound, node, filter)

      // if this is a last node and any match found then expand tree
      if (this.treeWalk.count >= this.treeWalk.size && this.treeWalk.isAnyFound && !this.isAllExpanded) {
        this.$nextTick(() => { this.doToogleExpandTree() })
      }
      return isFound
    },
    // clear filter value
    resetFilter () {
      this.treeFilter = ''
      this.resetTreeWalk()
      this.$refs.filterInput.focus()
    },
    // clear tree walk state
    resetTreeWalk () {
      this.treeWalk.isAnyFound = false
      this.treeWalk.count = 0
      this.treeWalk.prevFilter = ''
      this.treeWalk.keysFound = {}
    },
    // update tree walk found status for all tree nodes
    updateTreeWalk (isFound, node, filter) {
      if (filter !== this.treeWalk.prevFilter) {
        this.resetTreeWalk()
        this.treeWalk.prevFilter = filter
      }
      this.treeWalk.count++

      // node found if it is a child of found node or it is match the filter
      if (!isFound) isFound = this.treeWalk.keysFound[node.key] === true
      if (isFound && !this.treeWalk.keysFound[node.key]) this.treeWalk.keysFound[node.key] = true

      // if current node match the filter then add all children to matched keys list
      if (isFound) {
        for (const cn of node.children) {
          this.treeWalk.keysFound[cn.key] = true
        }
      }

      if (isFound) this.treeWalk.isAnyFound = true
      return isFound
    },

    // show model notes dialog
    doShowModelNote (digest) {
      this.modelInfoDigest = digest
      this.modelInfoTickle = !this.modelInfoTickle
    },

    // click on model download: start model download and show download list page
    doModelDownload (digest) {
      if (!digest) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to download model') })
        return
      }
      this.startModelDownload(digest) // start model download and show download page on success
    },

    // return tree of models
    makeTreeData (mLst) {
      this.isAnyModelGroup = false
      this.resetTreeWalk()
      this.treeWalk.size = 0

      if (!Mdf.isLength(mLst)) return [] // empty model list
      if (!Mdf.isModelList(mLst)) {
        this.$q.notify({ type: 'negative', message: this.$t('Model list is empty or invalid') })
        return [] // invalid model list
      }

      // make folders tree
      const fm = {}
      const td = []

      for (const md of mLst) {
        if (!md?.Dir || md.Dir === '.' || md.Dir === '/' || md.Dir === './') continue // empty or top-level directory

        // add each folder/sub-folder into the tree
        const fa = md.Dir.split('/')
        let p = '', pp = ''

        for (const fn of fa) {
          if (!fn || fn === '.') continue // empty or top-level folder

          p = pp ? pp + '/' + fn : fn

          if (fm?.[p]) {
            pp = p
            continue // path already exist
          }

          const f = {
            key: 'mf-' + p + '-' + this.nextId++,
            digest: '',
            label: fn,
            descr: '',
            dir: pp,
            children: [],
            disabled: false
          }
          this.treeWalk.size++
          fm[p] = f
          if (fm?.[pp]) fm[pp].children.push(f)
          if (!pp) {
            td.push(f) // add new top-level folder
          }
          pp = p
        }

        if (fm?.[p]) { // add model to the current folder, if it is not empty or top-level directory
          fm[p].children.push({
            key: 'md-' + md.Model.Digest + '-' + this.nextId++,
            digest: md.Model.Digest,
            label: md.Model.Name,
            descr: Mdf.descrOfDescrNote(md),
            dir: p,
            children: [],
            disabled: false
          })
          this.treeWalk.size++
        }
      }

      this.isAnyModelGroup = td.length > 0

      // add models which are not included in any group
      for (const md of mLst) {
        if (!md?.Dir || md.Dir === '.' || md.Dir === '/' || md.Dir === './') { // empty or top-level directory
          td.push({
            key: 'md-' + md.Model.Digest + '-' + this.nextId++,
            digest: md.Model.Digest,
            label: md.Model.Name,
            descr: Mdf.descrOfDescrNote(md),
            dir: '',
            children: [],
            disabled: false
          })
          this.treeWalk.size++
        }
      }
      return td
    },

    // refersh model list
    async doRefresh () {
      this.loadDone = false
      this.loadWait = true

      const u = this.omsUrl + '/api/model-list/text' + (this.uiLang !== '' ? '/lang/' + encodeURIComponent(this.uiLang) : '')
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

      // expand after refresh
      this.isAllExpanded = false
      this.$nextTick(() => { this.doToogleExpandTree() })

      this.loadWait = false
    },

    // start model download
    async startModelDownload (dgst) {
      let isOk = false
      let msg = ''

      const opts = {
        NoAccumulatorsCsv: this.noAccDownload,
        Utf8BomIntoCsv: this.$q.platform.is.win
      }
      const u = this.omsUrl + '/api/download/model/' + encodeURIComponent((dgst || ''))
      try {
        // send download request to the server, response expected to be empty on success
        await this.$axios.post(u, opts)
        isOk = true
      } catch (e) {
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Unable to download model', msg)
      }
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to download model') + (msg ? (': ' + msg) : '') })
        return
      }

      this.$emit('download-select', dgst) // download started: show download list page
      this.$q.notify({ type: 'info', message: this.$t('Model download started') })
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
      this.$nextTick(() => { this.doToogleExpandTree() })
      return
    }
    this.doRefresh() // load new model list
  }
}
</script>

<style lang="scss" scope="local">
</style>
