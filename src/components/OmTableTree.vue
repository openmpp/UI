<!-- Tree of input pamateres or output tables -->
<!--
Tree nodes (tree items) are single selection and readonly.
It can be "folder" node with children or "leaf" node (no children).
If you want to have "folder" without children then set item.isGroup = true.
Each node must have v-for key and at least 'label' to display
It is also can have 'descr' text to display as second line (description).
If isAbout is true then show about icon button node.
If isAboutEmpty is true then about icon button is disabled and non-clickable.
About click event: @click('om-table-tree-about', item.label).

Expected array of tree items as:
{
  key:           'item-key',
  label:         'item name to display',
  descr:         'item description',
  children:      [array of child items],  // folder children
  parts:         '',                      // any payload
  isGroup:       false,                   // if true then item is a folder even there are no children
  isAbout:       false,                   // if true then show about button to item
  isAboutEmpty:  false,                   // if true then disable about button
  isFilterHide:  false                    // if true then hide item as result of filter
}
-->
<template>
<div class="text-body1">

  <div
    class="row no-wrap items-center full-width"
    >
    <q-btn
      v-if="isAnyGroup"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs om-tree-control-button"
      :icon="isTreeExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
      :title="isTreeExpanded ? $t('Collapse all') : $t('Expand all')"
      @click="doToogleExpandTree"
      />
    <q-btn
      v-if="isAnyHidden"
      @click="$emit('om-table-tree-show-hidden', !isShowHidden)"
      dense
      :unelevated="!isShowHidden"
      :outline="isShowHidden"
      color="primary"
      class="col-auto q-mr-xs om-tree-control-button"
      :icon="!isShowHidden ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
      :title="!isShowHidden ? $t('Do not show hidden items') : $t('Show all hidden items')"
      />
    <q-btn
      v-if="isOnOffNotInList && isAnyInList"
      @click="$emit('om-table-tree-show-not-in-list', !isShowNotInList)"
      dense
      :unelevated="!isShowNotInList"
      :outline="isShowNotInList"
      color="primary"
      class="col-auto q-mr-xs om-tree-control-button"
      :icon="inListIcon || 'mdi-filter-outline'"
      :title="isShowNotInList ? $t(inListOffLabel || 'Show filtered out items') : $t(inListOnLabel || 'Do not show filtered out items')"
      />
    <q-btn
      v-if="isInListClear"
      :disable="!isAnyInList"
      @click="$emit('om-table-tree-clear-in-list')"
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs om-tree-control-button"
      :icon="inListClearIcon || 'mdi-close-circle'"
      :title="$t(inListClearLabel || 'Remove items filter')"
      />
    <span class="col-grow">
      <q-input
        ref="filterInput"
        debounce="500"
        v-model="treeFilter"
        outlined
        dense
        :placeholder="filterPlaceholder"
        >
        <template v-slot:append>
          <q-icon v-if="treeFilter !== ''" name="cancel" class="cursor-pointer" @click="resetFilter" />
          <q-icon v-else name="search" />
        </template>
      </q-input>
    </span>
  </div>

  <div class="q-px-sm">
    <q-tree
      ref="tableTree"
      :nodes="treeData"
      node-key="key"
      no-transition
      :filter="treeFilter"
      :filter-method="doTreeFilter"
      :no-results-label="noResultsLabel"
      :no-nodes-label="noNodesLabel"
      >
      <template v-slot:default-header="prop">

        <div
          v-if="prop.node.isGroup || (prop.node.children && prop.node.children.length)"
          :class="{'om-tree-found-node': treeWalk.keysFound[prop.node.key]}"
          class="row no-wrap items-center full-width"
          >
          <q-btn
            v-if="prop.node.isAbout"
            @click.stop="$emit('om-table-tree-group-note', prop.node.label, prop.node.parts)"
            flat
            round
            dense
            :disable="prop.node.isAboutEmpty"
            color="primary"
            padding="xs"
            class="col-auto"
            icon="mdi-information-outline"
            :title="$t('About') + ' ' + prop.node.label"
            />
          <q-btn
            v-if="isAddGroup"
            @click.stop="$emit('om-table-tree-group-add', prop.node.label, prop.node.parts)"
            :disable="isAddDisabled"
            flat
            round
            dense
            :color="!isAddDisabled ? 'primary' : 'secondary'"
            padding="xs"
            class="col-auto"
            icon="mdi-plus-circle-outline"
            :title="$t('Add') + ' ' + prop.node.label"
            />
          <q-btn
            v-if="isRemoveGroup"
            @click.stop="$emit('om-table-tree-group-remove', prop.node.label, prop.node.parts)"
            :disable="isRemoveDisabled"
            flat
            round
            dense
            :color="!isRemoveDisabled ? 'primary' : 'secondary'"
            padding="xs"
            class="col-auto"
            icon="mdi-minus-circle-outline"
            :title="$t('Remove') + ' ' + prop.node.label"
            />
          <q-btn
            v-if="isDownloadGroup"
            @click.stop="$emit('om-table-tree-group-download', prop.node.label, prop.node.parts)"
            :disable="isDownloadDisabled"
            flat
            round
            dense
            :color="!isDownloadDisabled ? 'primary' : 'secondary'"
            padding="xs"
            class="col-auto"
            icon="mdi-download-circle-outline"
            :title="$t('Download') + ' ' + prop.node.label"
            />
          <div
            v-if="!isGroupClick"
            class="col q-ml-xs q-pl-xs"
            >
            <template v-if="labelKind === 'name-only'">{{ prop.node.label }}</template>
            <template v-if="labelKind === 'descr-only'">{{ prop.node.descr }}</template>
            <template v-if="labelKind !== 'name-only' && labelKind !== 'descr-only'">
              <span>{{ prop.node.label }}<br />
              <span class="om-text-descr">{{ prop.node.descr }}</span></span>
            </template>
          </div>
          <div
            v-else
            @click.stop="$emit('om-table-tree-group-select', prop.node.label, prop.node.parts)"
            class="label-click col q-ml-xs q-pl-xs"
            >
            <template v-if="labelKind === 'name-only'">{{ prop.node.label }}</template>
            <template v-if="labelKind === 'descr-only'">{{ prop.node.descr }}</template>
            <template v-if="labelKind !== 'name-only' && labelKind !== 'descr-only'">
              <span>{{ prop.node.label }}<br />
              <span class="om-text-descr">{{ prop.node.descr }}</span></span>
            </template>
          </div>
        </div>

        <div v-else
          :class="{'om-tree-found-node': treeWalk.keysFound[prop.node.key]}"
          class="row no-wrap items-center full-width om-tree-leaf"
          >
          <q-btn
            v-if="prop.node.isAbout"
            @click.stop="$emit('om-table-tree-leaf-note', prop.node.label, prop.node.parts)"
            flat
            round
            dense
            :disable="prop.node.isAboutEmpty"
            color="primary"
            padding="xs"
            class="col-auto"
            icon="mdi-information-outline"
            :title="$t('About') + ' ' + prop.node.label"
            />
          <q-btn
            v-if="isAdd"
            @click.stop="$emit('om-table-tree-leaf-add', prop.node.label, prop.node.parts)"
            :disable="isAddDisabled"
            flat
            round
            dense
            :color="!isAddDisabled ? 'primary' : 'secondary'"
            padding="xs"
            class="col-auto"
            icon="mdi-plus-circle-outline"
            :title="$t('Add') + ' ' + prop.node.label"
            />
          <q-btn
            v-if="isRemove"
            @click.stop="$emit('om-table-tree-leaf-remove', prop.node.label, prop.node.parts)"
            :disable="isRemoveDisabled"
            flat
            round
            dense
            :color="!isRemoveDisabled ? 'primary' : 'secondary'"
            padding="xs"
            class="col-auto"
            icon="mdi-minus-circle-outline"
            :title="$t('Remove') + ' ' + prop.node.label"
            />
          <q-btn
            v-if="isDownload"
            @click.stop="$emit('om-table-tree-leaf-download', prop.node.label, prop.node.parts)"
            :disable="isDownloadDisabled"
            flat
            round
            dense
            :color="!isDownloadDisabled ? 'primary' : 'secondary'"
            padding="xs"
            class="col-auto"
            icon="mdi-download-circle-outline"
            :title="$t('Download') + ' ' + prop.node.label"
            />
          <div
            @click="$emit('om-table-tree-leaf-select', prop.node.label, prop.node.parts)"
            :class="{'label-click': isLeafClick}"
            class="col q-ml-xs q-pl-xs"
            >
            <template v-if="labelKind === 'name-only'">{{ prop.node.label }}</template>
            <template v-if="labelKind === 'descr-only'">{{ prop.node.descr }}</template>
            <template v-if="labelKind !== 'name-only' && labelKind !== 'descr-only'">
              <span>{{ prop.node.label }}<br />
              <span class="om-text-descr">{{ prop.node.descr }}</span></span>
            </template>
          </div>
        </div>

      </template>
    </q-tree>
  </div>

</div>
</template>

<style lang="scss" scoped>
  .label-click {
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      cursor: pointer;
    }
  }
</style>

<script>
import * as Mdf from 'src/model-common'

export default {
  name: 'OmTableTree',

  props: {
    refreshTickle: { type: Boolean, default: false },
    refreshTreeTickle: { type: Boolean, default: false },
    treeData: { type: Array, default: () => [] },
    labelKind: { type: String, default: '' },
    isAllExpand: { type: Boolean, default: false },
    isAnyGroup: { type: Boolean, default: false },
    isAnyHidden: { type: Boolean, default: false },
    isShowHidden: { type: Boolean, default: false },
    isGroupClick: { type: Boolean, default: false },
    isLeafClick: { type: Boolean, default: false },
    isAdd: { type: Boolean, default: false },
    isAddGroup: { type: Boolean, default: false },
    isAddDisabled: { type: Boolean, default: false },
    isRemove: { type: Boolean, default: false },
    isRemoveGroup: { type: Boolean, default: false },
    isRemoveDisabled: { type: Boolean, default: false },
    isDownload: { type: Boolean, default: false },
    isDownloadGroup: { type: Boolean, default: false },
    isDownloadDisabled: { type: Boolean, default: false },
    filterPlaceholder: { type: String, default: '' },
    noResultsLabel: { type: String, default: '' },
    noNodesLabel: { type: String, default: '' },
    isAnyInList: { type: Boolean, default: false },
    isOnOffNotInList: { type: Boolean, default: false },
    isShowNotInList: { type: Boolean, default: false },
    inListOnLabel: { type: String, default: '' },
    inListOffLabel: { type: String, default: '' },
    inListIcon: { type: String, default: '' },
    isInListClear: { type: Boolean, default: false },
    inListClearLabel: { type: String, default: '' },
    inListClearIcon: { type: String, default: '' }
  },

  data () {
    return {
      isTreeExpanded: this.isAllExpand,
      treeFilter: '',
      treeWalk: {
        firstKey: '', // first node key of the tree
        size: 0,
        count: 0,
        isAnyFound: false,
        isNewFilter: false,
        prevFilter: '',
        keysFound: {} // if node match filter then map keysFound[node.key] = true
      }
    }
  },

  watch: {
    refreshTreeTickle () {
      this.isTreeExpanded = this.isAllExpand
      this.doRefresh()
    },
    refreshTickle () {
      this.isTreeExpanded = this.isAllExpand
      this.doRefresh()
    }
  },

  emits: [
    'om-table-tree-show-hidden',
    'om-table-tree-show-not-in-list',
    'om-table-tree-clear-in-list',
    'om-table-tree-group-note',
    'om-table-tree-group-add',
    'om-table-tree-group-remove',
    'om-table-tree-group-download',
    'om-table-tree-group-select',
    'om-table-tree-leaf-note',
    'om-table-tree-leaf-add',
    'om-table-tree-leaf-remove',
    'om-table-tree-leaf-download',
    'om-table-tree-leaf-select'
  ],

  methods: {
    // update view on tree data change
    doRefresh () {
      this.treeFilter = ''

      // initialize tree walk state
      this.treeWalk.firstKey = ''
      this.treeWalk.size = 0
      this.treeWalk.count = 0
      this.treeWalk.isAnyFound = false
      this.treeWalk.isNewFilter = false
      this.treeWalk.prevFilter = ''
      this.treeWalk.keysFound = {}

      if (!Mdf.isLength(this.treeData)) return
      // else
      // if tree data not empty then find first node key and count nodes
      this.treeWalk.firstKey = this.treeData[0].key

      const td = []
      for (const g of this.treeData) {
        td.push(g)
      }
      while (td.length > 0) {
        const t = td.pop()
        this.treeWalk.size++
        for (const c of t.children) {
          td.push(c)
        }
      }
    },

    // expand or collapse all tree nodes
    doToogleExpandTree () {
      if (this.isTreeExpanded) {
        this.$refs.tableTree.collapseAll()
      } else {
        this.$refs.tableTree.expandAll()
      }
      this.isTreeExpanded = !this.isTreeExpanded
    },

    // filter tree nodes by name (label) or description
    doTreeFilter (node, filter) {
      const flt = filter.toLowerCase()
      let isFound = (node.label && node.label.toLowerCase().indexOf(flt) > -1) ||
        ((node.descr || '') !== '' && node.descr.toLowerCase().indexOf(flt) > -1)

      isFound = this.updateTreeWalk(isFound, node, filter, this.treeWalk)

      if (!this.isTreeExpanded && this.treeWalk.isAnyFound && this.treeWalk.isNewFilter) {
        this.$nextTick(() => { this.doToogleExpandTree() })
      }
      return isFound
    },
    // clear tree filter value
    resetFilter () {
      this.treeFilter = ''
      this.$refs.filterInput.focus()
      this.treeWalk.keysFound = {}
    },
    // filter tree nodes by if parent group matched filter
    updateTreeWalk (isFound, node, filter) {
      // if this is first node then reset matched node key list
      if (node.key === this.treeWalk.firstKey) {
        this.treeWalk.keysFound = {}
        this.treeWalk.count = 0
        this.treeWalk.isAnyFound = false
        this.treeWalk.isNewFilter = false
      }
      this.treeWalk.count++

      // change node status to highlight found nodes
      if (!isFound) isFound = this.treeWalk.keysFound[node.key] === true
      if (isFound && !this.treeWalk.keysFound[node.key]) this.treeWalk.keysFound[node.key] = true

      // if current node match filter then add all children to matched keys list
      if (isFound) {
        for (const cn of node.children) {
          this.treeWalk.keysFound[cn.key] = true
        }
      }

      // if this is last node then clean matched key list and detect new filter condition
      if (this.treeWalk.count === this.treeWalk.size) {
        this.treeWalk.isNewFilter = filter !== this.treeWalk.prevFilter
        this.treeWalk.prevFilter = filter
      }

      if (isFound) this.treeWalk.isAnyFound = true
      return isFound
    }
  },

  mounted () {
    this.doRefresh()
  }
}
</script>
