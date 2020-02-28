<!-- Tree list: tree with nodes similar to material list items -->
<!-- see OmTreeListItem.vue for more details -->

<template>

<div :id="treeId" class="om-tree-list-container">

  <div class="tree-filter">

    <template v-if="isAnyFolder">
      <span v-if="isExpandAll"
        @click="onExpandAllToggle"
        class="top-bar-icon folder-icon-link material-icons"
        title="Expand All Groups"
        alt="Expand All Groups">folder_open</span>
      <span v-else
        @click="onExpandAllToggle"
        class="top-bar-icon folder-icon-link material-icons"
        title="Collapse All Groups"
        alt="Collapse All Groups">folder</span>
    </template>
    <template v-else>
      <span
        class="top-bar-icon folder-icon-empty material-icons"
        title="Expand or Collapse All Groups"
        alt="Expand or Collapse All Groups">folder</span>
    </template>

    <template v-if="isAnyHidden">
      <span v-if="isShowHidden"
        @click="onShowHiddenClick"
        class="top-bar-icon om-cell-icon-link material-icons"
        title="Do not show hidden items"
        alt="Do not show hidden items">zoom_out</span>
      <span v-else
        @click="onShowHiddenClick"
        class="top-bar-icon om-cell-icon-link material-icons"
        title="Show hidden items"
        alt="Show hidden items">loupe</span>
    </template>
    <template v-else>
      <span
        class="top-bar-icon om-cell-icon-empty material-icons"
        title="Show hidden items"
        alt="Show hidden items">loupe</span>
    </template>

    <input type="text"
      v-model="treeFilter"
      placeholder="Type to filter..."
      alt="Enter value to filter"
      title="Enter value to filter"
      class="tree-filter"
      :class="treeFilterInputClass" />
  </div>

  <ul :class="treeRootClass">
    <om-tree-list-item
      v-for="item in treeData"
      :key="item.key"
      :item="item"
      :isExpandAll="isExpandAll"
      @leaf-click="onLeafClick"
      @leaf-about-click="onLeafAboutClick"
      @folder-about-click="onFolderAboutClick"
      :treeItemClass="treeItemClass"
      :treeFolderHdrClass="treeFolderHdrClass"
      :treeLeafHdrClass="treeLeafHdrClass"
      :treeMatchedHdrClass="treeMatchedHdrClass"
      :treeNameTextClass="treeNameTextClass"
      :treeDescrTextClass="treeDescrTextClass"
      :treeFolderContainerClass="treeFolderContainerClass"></om-tree-list-item>
  </ul>
</div>

</template>

<script>
import * as Mdf from '@/modelCommon'
import OmTreeListItem from './OmTreeListItem'

export default {
  components: { OmTreeListItem },

  props: {
    treeId: { type: String, required: true },
    treeDataTickle: { type: Boolean, default: false },
    isAnyHidden: { type: Boolean, default: false },
    isShowHidden: { type: Boolean, default: false },
    isExpandTree: { type: Boolean, default: false },
    treeData: { type: Array, default: () => [] },
    treeRootClass: { type: String, default: 'tree-root' },
    treeFilterInputClass: { type: String, default: 'mdc-typography--body1' },
    treeItemClass: { type: String, default: 'tree-item' },
    treeFolderHdrClass: { type: String, default: 'tree-folder-hdr' },
    treeLeafHdrClass: { type: String, default: 'tree-leaf-hdr' },
    treeMatchedHdrClass: { type: String, default: 'tree-matched-hdr' },
    treeNameTextClass: { type: String, default: 'tree-name-text' },
    treeDescrTextClass: { type: String, default: 'tree-descr-text' },
    treeFolderContainerClass: { type: String, default: 'tree-folder-container' }
  },

  watch: {
    // tree data updated
    treeDataTickle () {
      // check if there any folders
      this.isAnyFolder = false
      for (const item of this.treeData) {
        this.isAnyFolder = !!item.isGroup || (!!item.children && Mdf.isLength(item.children))
        if (this.isAnyFolder) break
      }
      if (this.treeFilter) { // apply filter if it is not empty
        this.doFilter()
      }
      this.isExpandAll = this.isExpandTree // update tree expanded state
    },
    // tree expand or collapse updated
    isExpandTree () {
      this.isExpandAll = this.isExpandTree
    },
    // tree filter input: show only nodes containing filter text
    treeFilter () {
      this.doFilter()
    }
  },

  data () {
    return {
      isAnyFolder: false,
      isExpandAll: false,
      treeFilter: ''
    }
  },

  methods: {
    // toggle expand all state
    onExpandAllToggle () {
      this.isExpandAll = !this.isExpandAll
    },
    // show hidden button clicked: refresh tree data
    onShowHiddenClick () {
      this.$emit('show-hidden-click')
    },

    // filter: find and show only nodes and branches matching filter text
    doFilter () {
      // on empty filter show all nodes
      if (!this.treeFilter) {
        this.clearFilter()
        return
      }

      // find nodes where name or description match filter text
      let re = new RegExp(this.treeFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      if (!re) {
        console.warn('Invalid tree filter regex:', this.treeFilter)
        this.clearFilter()
      }

      let pp = [] // parent path

      let isMatch = (item, re) => {
        if (item.name && item.name.search(re) >= 0) return true
        if (item.descr && item.descr.search(re) >= 0) return true
        return false
      }
      let searchWalk = (isParentShow, itemArr) => {
        let isPathShow = false

        for (let item of itemArr) {
          // node hidden if all parents hidden or if not matched by filter
          item.isMatch = isMatch(item, re)
          item.isFilterHide = !isParentShow && !item.isMatch

          if (!item.isFilterHide) { // if node visible then all parents are visible
            if (!isPathShow) {
              isPathShow = true
              for (let p of pp) {
                p.isFilterHide = false
              }
            }
          }

          if (item.children) { // down to the next level
            pp.push(item)
            searchWalk(!item.isFilterHide, item.children)
            pp.pop()
          }
        }
      }
      searchWalk(false, this.treeData)
    },

    // make all tree branches and nodes visible
    clearFilter () {
      let clearFilterWalk = (itemArr) => {
        for (let item of itemArr) {
          item.isMatch = false
          item.isFilterHide = false
          if (item.children) clearFilterWalk(item.children)
        }
      }
      clearFilterWalk(this.treeData)
    },

    // pass event from child component to grand parent
    onLeafClick (key, name, data) { this.$emit('leaf-click', key, name, data) },
    onLeafAboutClick (key, name, data) { this.$emit('leaf-about-click', key, name, data) },
    onFolderAboutClick (key, name, data) { this.$emit('folder-about-click', key, name, data) }
  },

  mounted () {
    this.isExpandAll = this.isExpandTree
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
  @import "@/om-mcw.scss";

  .tree-root {
    padding-left: 0;
    margin-top: 0.5rem;
  }

  /* tree search filter */
  div.tree-filter {
    display: flex;
    flex-direction: row;
    overflow: hidden;
    margin: 0.5rem 0.5rem 0 0;
  }
  input.tree-filter {
    width: 100%;
    margin-right: 1px;
    border: 1px solid lightgrey;
  }

  /* top bar icon buttons */
  .top-bar-icon {
    display: inline-flex;
    align-self: center;
    width: 1.5rem;
    height: 1.5rem;
  }
  .folder-icon {
    vertical-align: middle;
    margin-right: 0.25rem;
    padding-left: 0;
    padding-right: 0;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  .folder-icon-link {
    @extend .folder-icon;
    &:hover {
      cursor: pointer;
    }
    color: $om-mdc-theme-primary;
  }
  .folder-icon-empty {
    @extend .folder-icon;
    cursor: default;
    color: $om-theme-primary-light;
}
</style>
