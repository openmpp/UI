<!-- Tree list item: tree list node similar to material list item -->
<!--
Tree nodes (tree items) are single selection and readonly.
It can be "folder" node with children or "leaf" node (no children).
If you want to have "folder" without children then set item.isGroup = true.
Each node must have v-for key and at least 'name' label to display
It is also can have 'descr' text to display as second line (description).
If isAbout is true then about icon button added to node.
If isAboutEmpty is true then about icon button is disabled and non-clickable.
About click event: @click('om-tree-list-about', item.key, item.name, item.data).

Expected array of tree items as:
{
  key:           'item-key',
  name:          'item name to display',
  descr:         'item description',
  children:      [array of child items],  // folder children
  isGroup:       false,                   // if true then item is a folder even there are no children
  isAbout:       false,                   // if true then add about button to item
  isAboutEmpty:  false,                   // if true then add disabled about button to item
  isMatch:       false,                   // if true then item matched by search filter
  isFilterHide:  false,                   // if true then hide item as result of filter
  data:          {anyObject}
}
-->

<template>

<li v-show="!item.isFilterHide" :class="treeItemClass">

  <template v-if="isFolder">
    <!-- folder header -->
    <div
      :class="[item.isMatch ? treeMatchedHdrClass : '',  treeFolderHdrClass]"
      @click.stop="onFolderToggle"
      >
      <span class="tree-hdr-container">

        <span v-if="isOpen" class="item-icon om-cell-icon-link material-icons" :title="'Expand ' + item.name" :alt="'Expand ' + item.name">arrow_drop_down</span>
        <span v-else class="item-icon om-cell-icon-link material-icons" :title="'Collapse ' + item.name" :alt="'Collapse ' + item.name">arrow_right</span>

        <span v-if="item.isAbout && !item.isAboutEmpty"
          @click.stop="onFolderAboutClick(item.key, item.name, item.data)"
          class="item-icon om-cell-icon-link material-icons"
          :title="'About ' + item.name"
          :alt="'About ' + item.name">description</span>
        <span v-if="item.isAbout && item.isAboutEmpty"
          class="item-icon om-cell-icon-empty material-icons"
          :title="'About ' + item.name"
          :alt="'About ' + item.name">description</span>

        <span class="tree-text-container">
          <span :class="treeNameTextClass">{{ item.name }}</span>
          <span v-if="item.descr" :class="treeDescrTextClass">{{ item.descr }}</span>
        </span>

      </span>
    </div>
  </template>

  <template v-else>
    <!-- leaf header -->
    <div
      :class="[item.isMatch ? treeMatchedHdrClass : '',  treeLeafHdrClass]"
      @click.stop="onLeafClick(item.key, item.name, item.data)"
      >
      <span class="tree-hdr-container">

        <span v-if="item.isAbout && !item.isAboutEmpty"
          @click.stop="onLeafAboutClick(item.key, item.name, item.data)"
          class="item-icon om-cell-icon-link material-icons"
          :title="'About ' + item.name"
          :alt="'About ' + item.name">description</span>
        <span v-if="item.isAbout && item.isAboutEmpty"
          class="item-icon om-cell-icon-empty material-icons"
          :title="'About ' + item.name"
          :alt="'About ' + item.name">description</span>

        <span class="tree-text-container">
          <span :class="treeNameTextClass">{{ item.name }}</span>
          <span v-if="item.descr" :class="treeDescrTextClass">{{ item.descr }}</span>
        </span>

      </span>
    </div>
  </template>

  <!-- folder content list -->
  <ul
    v-show="isOpen"
    v-if="isFolder"
    :class="treeFolderContainerClass"
    >
    <om-tree-list-item
      v-for="child in item.children"
      :key="child.key"
      :item="child"
      :isExpandAll="isExpandAll"
      @leaf-click="onChildLeafClick"
      @leaf-about-click="onChildLeafAboutClick"
      @folder-about-click="onChildFolderAboutClick"
      :treeItemClass="treeItemClass"
      :treeFolderHdrClass="treeFolderHdrClass"
      :treeLeafHdrClass="treeLeafHdrClass"
      :treeMatchedHdrClass="treeMatchedHdrClass"
      :treeNameTextClass="treeNameTextClass"
      :treeDescrTextClass="treeDescrTextClass"
      :treeFolderContainerClass="treeFolderContainerClass"></om-tree-list-item>
  </ul>

</li>

</template>

<script>
import * as Mdf from '@/modelCommon'
import OmTreeListItem from './OmTreeListItem'

export default {
  components: { OmTreeListItem },

  name: 'om-tree-list-item',

  props: {
    isExpandAll: { type: Boolean, default: false },
    item: {
      type: Object,
      default: () => ({
        key: 'ptl-empty',
        name: '',
        descr: '',
        children: [],
        isGroup: false,
        isAbout: false,
        isAboutEmpty: false,
        isMatch: false,
        isFilterHide: false,
        data: {}
      })
    },
    treeItemClass: { type: String, default: 'tree-item' },
    treeFolderHdrClass: { type: String, default: 'tree-folder-hdr' },
    treeLeafHdrClass: { type: String, default: 'tree-leaf-hdr' },
    treeMatchedHdrClass: { type: String, default: 'tree-matched-hdr' },
    treeNameTextClass: { type: String, default: 'tree-name-text' },
    treeDescrTextClass: { type: String, default: 'tree-descr-text' },
    treeFolderContainerClass: { type: String, default: 'tree-folder-container' }
  },

  watch: {
    isExpandAll () {
      this.isOpen = this.isExpandAll
    }
  },
  computed: {
    isFolder () { return !!this.item.isGroup || (!!this.item.children && Mdf.isLength(this.item.children)) }
  },
  data () {
    return {
      isOpen: false
    }
  },

  methods: {
    // toggle folder open/close state
    onFolderToggle () { this.isOpen = !this.isOpen },

    // leaf selected click: pass event from child up to the next tree level
    onLeafClick (key, name, data) { this.$emit('leaf-click', key, name, data) },
    onChildLeafClick (key, name, data) { this.$emit('leaf-click', key, name, data) },

    // button click on show leaf "about" info: pass event from child up to the next tree level
    onLeafAboutClick (key, name, data) { this.$emit('leaf-about-click', key, name, data) },
    onChildLeafAboutClick (key, name, data) { this.$emit('leaf-about-click', key, name, data) },

    // button click on show folder "about" info: pass event from child up to the next tree level
    onFolderAboutClick (key, name, data) { this.$emit('folder-about-click', key, name, data) },
    onChildFolderAboutClick (key, name, data) { this.$emit('folder-about-click', key, name, data) }
  },

  mounted () {
    this.isOpen = this.isExpandAll
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
  @import "@material/theme/mdc-theme";
  @import "@/om-mcw.scss";

  /* iem container */
  .tree-item {
    width: 100%;
    min-height: 2rem;
    align-items: center;
    list-style-type: none;
  }

  /* item header: button, name, description */
  .tree-hdr-container {
    display: inline-flex;
    flex-direction: row;
  }
  .tree-hdr {
    cursor: pointer;
    padding-bottom: 0.5rem;
    // margin-bottom: 1px;
    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }
  }
  .tree-folder-hdr {
    @extend .tree-hdr;
  }
  .tree-leaf-hdr {
    @extend .tree-hdr;
  }

  /* tree node highlight by filter match */
  .tree-matched-hdr {
    background: whitesmoke;
    border: 1px solid lightgrey;
  }

  /* ul folder container */
  .tree-folder-container {
     padding-left: 2rem;
     line-height: 1.5rem;
     list-style-type: none;
  }

  /* item name and description */
  .tree-text-container {
    display: inline-flex;
    flex-direction: column;
  }
  .tree-text {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
  .tree-name-text {
    @extend .tree-text;
  }
  .tree-descr-text {
    @extend .tree-text;
    @extend .om-secondary-text;
  }

  /* node icon buttons */
  .item-icon {
    display: inline-flex;
    align-self: center;
    width: 1.5rem;
    height: 1.5rem;
  }
</style>
