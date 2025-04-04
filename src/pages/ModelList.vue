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
        debounce="500"
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
      no-transition
      v-model:expanded="expandedKeys"
      :filter="treeFilter"
      :filter-method="doTreeFilter"
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
            :flat="prop.node.digest !== theModelDigest"
            :outline="prop.node.digest === theModelDigest"
            round
            dense
            padding="xs"
            color="primary"
            class="col-auto"
            :icon="prop.node.digest === theModelDigest ? 'mdi-information' : 'mdi-information-outline'"
            :title="$t('About') + ' ' + prop.node.label"
            />
          <q-btn
            @click.stop="doModelDocLink(prop.node.digest)"
            :disable="!isModelDocLink(prop.node.digest)"
            flat
            round
            dense
            padding="xs"
            :color="isModelDocLink(prop.node.digest) ? 'primary' : 'secondary'"
            class="col-auto"
            icon="mdi-book-open-outline"
            :title="$t('Model Documentation') + ' ' + prop.node.label"
            />
          <q-btn
            v-if="serverConfig.AllowDownload"
            @click.stop="onModelDownload(prop.node.digest, prop.node.label)"
            flat
            round
            dense
            padding="xs"
            color="primary"
            class="col-auto"
            icon="mdi-download-circle-outline"
            :title="$t('Download') + ' ' + prop.node.label"
            />
          <router-link
            :to="'/model/' + prop.node.digest"
            :title="prop.node.label"
            class="col om-tree-leaf-link q-ml-xs"
            :class="{ 'text-primary' : prop.node.digest === theModelDigest }"
            >
            <span><span :class="{ 'text-bold': prop.node.digest === theModelDigest }">{{ prop.node.label }}</span><br />
            <span :class="prop.node.digest === theModelDigest ? 'om-text-descr-selected' : 'om-text-descr'">{{ prop.node.descr }}</span></span>
          </router-link>
        </div>
      </template>
    </q-tree>
  </div>

  <model-info-dialog :show-tickle="modelInfoTickle" :digest="modelInfoDigest"></model-info-dialog>

  <confirm-dialog
    @confirm-yes="onYesDownload"
    :show-tickle="showDownloadConfirmTickle"
    :item-id="downloadDigest"
    :item-name="downloadLabel"
    :dialog-title="$t('Download model data' + '?')"
    :body-text="$t('Download')"
    :icon-name="'mdi-download-circle'"
    >
  </confirm-dialog>

  <q-inner-loading :showing="loadWait">
    <q-spinner-gears size="lg" color="primary" />
  </q-inner-loading>

</q-page>
</template>

<script>
import { mapState, mapActions } from 'pinia'
import { useModelStore } from '../stores/model'
import { useServerStateStore } from '../stores/server-state'
import { useUiStateStore } from '../stores/ui-state'
import * as Mdf from 'src/model-common'
import ModelInfoDialog from 'components/ModelInfoDialog.vue'
import ConfirmDialog from 'components/ConfirmDialog.vue'
import { openURL } from 'quasar'

export default {
  name: 'ModelList',
  components: { ModelInfoDialog, ConfirmDialog },

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
      expandedKeys: [],
      treeWalk: {
        isAnyFound: false,
        keysFound: {} // if node match filter then map keysFound[node.key] = true
      },
      modelInfoTickle: false,
      modelInfoDigest: '',
      showDownloadConfirmTickle: false,
      downloadDigest: '',
      downloadLabel: '',
      loadDone: false,
      loadWait: false
    }
  },

  computed: {
    theModelDigest () { return Mdf.modelDigest(this.theModel) },

    ...mapState(useModelStore, [
      'theModel',
      'modelList',
      'modelCount',
      'modelLanguage'
    ]),
    ...mapState(useServerStateStore, {
      omsUrl: 'omsUrl',
      serverConfig: 'config'
    }),
    ...mapState(useUiStateStore, [
      'modelTreeExpandedKeys',
      'noAccDownload',
      'noMicrodataDownload',
      'idCsvDownload',
      'uiLang'
    ])
  },

  watch: {
    refreshTickle () { this.doRefresh() },
    treeFilter () { this.updateTreeWalk() }
  },

  emits: ['download-select'],

  methods: {
    ...mapActions(useModelStore, [
      'dispatchModelList'
    ]),
    ...mapActions(useUiStateStore, [
      'dispatchModelTreeExpandedKeys'
    ]),

    // expand or collapse all tree nodes
    doToogleExpandTree () {
      if (this.isAllExpanded) {
        this.$refs.theTree.collapseAll()
      } else {
        this.$refs.theTree.expandAll()
      }
      this.isAllExpanded = !this.isAllExpanded

      // remove duplicates if expand is result of search
      this.expandedKeys = this.expandedKeys.filter((key, idx, arr) => arr.indexOf(key) === idx)
    },
    // filter by model name (label) or model description
    doTreeFilter (node, filter) {
      return this.treeWalk.isAnyFound && !!this.treeWalk.keysFound[node.key]
    },
    // update filtered nodes key list, include all children if group match the filter
    updateTreeWalk () {
      this.treeWalk.isAnyFound = false
      this.treeWalk.keysFound = {}

      if (!this.treeFilter) return // filter is empty

      const flt = this.treeFilter.toLowerCase()

      // walk the tree and check every node by filter match
      const td = []
      for (const g of this.treeData) {
        td.push(g)
      }
      while (td.length > 0) {
        const t = td.pop()

        let isFound = (t.label && t.label.toLowerCase().indexOf(flt) > -1) ||
          ((t.descr || '') !== '' && t.descr.toLowerCase().indexOf(flt) > -1)

        if (!isFound) isFound = this.treeWalk.keysFound[t.key] === true
        if (isFound && !this.treeWalk.keysFound[t.key]) this.treeWalk.keysFound[t.key] = true

        // if current node match filter then add all children to matched keys list
        for (const c of t.children) {
          td.push(c)
          if (isFound) this.treeWalk.keysFound[c.key] = true
        }
        if (!this.treeWalk.isAnyFound) this.treeWalk.isAnyFound = isFound
      }

      // if any node match the filter then exapnd the tree
      if (this.treeWalk.isAnyFound && !this.isAllExpanded) {
        this.$nextTick(() => { this.doToogleExpandTree() })
      }
    },
    // clear filter value
    resetFilter () {
      this.treeFilter = ''
      this.treeWalk.isAnyFound = false
      this.treeWalk.keysFound = {}
      this.$refs.filterInput.focus()
    },

    // show model notes dialog
    doShowModelNote (digest) {
      this.modelInfoDigest = digest
      this.modelInfoTickle = !this.modelInfoTickle
    },
    isModelDocLink (digest) {
      if (!this.serverConfig.IsModelDoc) return ''
      const u = Mdf.modelDocLinkByDigest(digest, this.modelList, this.uiLang, this.modelLanguage)
      return u && u !== ''
    },
    // show model notes dialog
    doModelDocLink (digest) {
      if (!this.serverConfig.IsModelDoc) return
      const u = Mdf.modelDocLinkByDigest(digest, this.modelList, this.uiLang, this.modelLanguage)
      if (u) openURL('doc/' + u)
    },

    // show yes/no dialog to confirm model download
    onModelDownload (digest, label) {
      this.downloadDigest = digest
      this.downloadLabel = label
      this.showDownloadConfirmTickle = !this.showDownloadConfirmTickle
    },
    // user answer yes to confirm model download: start model download and show download list page
    onYesDownload (label, digest, kind) {
      if (!digest) {
        console.warn('Unable to download model:', digest, label)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to download model') + ' ' + (label || '') })
        return
      }
      this.startModelDownload(digest) // start model download and show download page on success
    },

    // return tree of models
    makeTreeData (mLst, ekArr) {
      this.isAnyModelGroup = false
      this.treeFilter = ''
      this.expandedKeys = []
      const expKeys = (!!ekArr && Array.isArray(ekArr)) ? ekArr : []

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
          fm[p] = f
          if (fm?.[pp]) fm[pp].children.push(f)
          if (!pp) {
            td.push(f) // add new top-level folder
          }
          if (expKeys.indexOf(f.key) >= 0 && this.expandedKeys.indexOf(f.key) < 0) {
            this.expandedKeys.push(f.key)
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
        this.treeData = this.makeTreeData(response.data, []) // update model list tree
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
        NoMicrodata: this.noMicrodataDownload,
        Utf8BomIntoCsv: this.$q.platform.is.win,
        IdCsv: !!this.idCsvDownload
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
        this.$q.notify({ type: 'negative', message: this.$t('Unable to download model') + (msg ? ('. ' + msg) : '') })
        return
      }

      this.$emit('download-select', dgst) // download started: show download list page
      this.$q.notify({ type: 'info', message: this.$t('Model download started') })
    }
  },

  // route leave guard: on leaving save model tree expanded state
  beforeRouteLeave (to, from, next) {
    this.dispatchModelTreeExpandedKeys(this.expandedKeys)
    next()
  },

  mounted () {
    // if model list already loaded then exit
    if (this.modelCount > 0) {
      this.loadDone = true
      this.treeData = this.makeTreeData(this.modelList, this.modelTreeExpandedKeys) // update model list tree
      return
    }
    this.doRefresh() // load new model list
  }
}
</script>

<style lang="scss" scope="local">
</style>
