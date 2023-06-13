<template>

  <om-table-tree
    :refresh-tickle="refreshTickle"
    :refresh-tree-tickle="refreshTreeTickle"
    :tree-data="entityTreeData"
    :label-kind="treeLabelKind"
    :is-all-expand="isAllExpand"
    :is-any-group="isAnyEntity"
    :is-any-hidden="isAnyHidden"
    :is-show-hidden="isShowHidden"
    :is-group-click="isEntityClick"
    :is-leaf-click="isAttrClick"
    :is-add="isAddEntityAttr"
    :is-add-group="isAddEntity"
    :is-add-disabled="isAddDisabled"
    :is-remove="isRemoveEntityAttr"
    :is-remove-group="isRemoveEntity"
    :is-remove-disabled="isRemoveDisabled"
    :filter-placeholder="$t('Find entity or attribute...')"
    :no-results-label="$t('No entity attributes found')"
    :no-nodes-label="$t('No model entities found or server offline')"
    :is-any-in-list="isAnyEntity"
    :is-in-list-clear="isInListClear"
    :in-list-clear-label="inListClearLabel"
    :in-list-clear-icon="inListClearIcon"
    @om-table-tree-show-hidden="onToogleHiddenNodes"
    @om-table-tree-clear-in-list="onClearInListFilter"
    @om-table-tree-group-select="onEntityClick"
    @om-table-tree-leaf-select="onAttrClick"
    @om-table-tree-leaf-add="onAttrAddClick"
    @om-table-tree-group-add="onEntityAddClick"
    @om-table-tree-leaf-remove="onAttrRemoveClick"
    @om-table-tree-group-remove="onEntityRemoveClick"
    @om-table-tree-leaf-note="onShowAttrNote"
    @om-table-tree-group-note="onShowEntityNote"
    >
  </om-table-tree>

</template>

<script>
import { mapState, mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'
import OmTableTree from 'components/OmTableTree.vue'

export default {
  name: 'EntityList',
  components: { OmTableTree },

  props: {
    runDigest: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false },
    refreshEntityTreeTickle: { type: Boolean, default: false },
    isAllExpand: { type: Boolean, default: false },
    isEntityClick: { type: Boolean, default: false },
    isAttrClick: { type: Boolean, default: false },
    isAddEntityAttr: { type: Boolean, default: false },
    isAddEntity: { type: Boolean, default: false },
    isAddDisabled: { type: Boolean, default: false },
    isRemoveEntityAttr: { type: Boolean, default: false },
    isRemoveEntity: { type: Boolean, default: false },
    isRemoveDisabled: { type: Boolean, default: false },
    nameFilter: { type: Array, default: () => [] }, // if not empty then use only entity.attribute included in this list
    isInListEnable: { type: Boolean, default: false },
    isInListClear: { type: Boolean, default: false },
    inListClearLabel: { type: String, default: '' },
    inListClearIcon: { type: String, default: '' }
  },

  data () {
    return {
      refreshTreeTickle: false,
      isAnyEntity: false,
      isAnyHidden: false,
      isShowHidden: false,
      isAnyFiltered: false,
      runCurrent: Mdf.emptyRunText(), // currently selected run
      entityTreeData: [],
      nextId: 100
    }
  },

  computed: {
    ...mapState('model', {
      theModel: state => state.theModel,
      theModelUpdated: state => state.theModelUpdated,
      runTextListUpdated: state => state.runTextListUpdated
    }),
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest'
    }),
    ...mapState('uiState', {
      treeLabelKind: state => state.treeLabelKind
    })
  },

  watch: {
    runDigest () { this.doRefresh() },
    refreshTickle () { this.doRefresh() },
    refreshEntityTreeTickle () { this.doRefresh() },
    theModelUpdated () { this.doRefresh() },
    runTextListUpdated () { if (this.runDigest) this.doRefresh() }
  },

  methods: {
    // update entity attributes tree data and refresh tree view
    doRefresh () {
      if (this.runDigest) {
        this.runCurrent = this.runTextByDigest({ ModelDigest: Mdf.modelDigest(this.theModel), RunDigest: this.runDigest })
      }
      const td = this.makeEntityTreeData()
      this.entityTreeData = td.tree
      this.refreshTreeTickle = !this.refreshTreeTickle
      this.$emit('entity-tree-updated', td.entityCount, td.leafCount)
    },

    // show or hide internal entity attributes
    onToogleHiddenNodes (isShow) {
      this.isShowHidden = isShow
      this.doRefresh()
    },
    // click on clear filter: show all entity attributes
    onClearInListFilter () {
      this.$emit('entity-clear-in-list')
    },
    // click on entity: forward to parent
    onEntityClick (name, parts) {
      this.$emit('entity-select', name, parts)
    },
    // click on entity attribute: forward to parent
    onAttrClick (name, parts) {
      this.$emit('entity-attr-select', name, parts)
    },
    // click on add attribute: add attribute into microdata list
    onAttrAddClick (name, parts) {
      this.$emit('entity-attr-add', name, parts, this.isShowHidden)
    },
    // click on add entity: add all entity attributes into microdata list
    onEntityAddClick (name, parts) {
      this.$emit('entity-add', name, parts, this.isShowHidden)
    },
    // click on remove attribute: remove attribute from microdata list
    onAttrRemoveClick (name, parts) {
      this.$emit('entity-attr-remove', name, parts)
    },
    // click on remove entity: remove all entity attributes from microdata list
    onEntityRemoveClick (name, parts) {
      this.$emit('entity-remove', name, parts)
    },
    // click on show attribute notes dialog button
    onShowAttrNote (name, parts) {
      this.$emit('entity-attr-info-show', name, parts)
    },
    // click on show entity notes dialog button
    onShowEntityNote (name, parts) {
      this.$emit('entity-info-show', name, parts)
    },

    // return tree of entity attributes: entities are the groups and attributes are leafs
    makeEntityTreeData () {
      this.isAnyEntity = false
      this.isAnyHidden = false
      this.isAnyFiltered = false

      if (!Mdf.entityCount(this.theModel)) {
        return { tree: [], leafCount: 0 } // empty list of entities
      }
      if (!Mdf.isEntityTextList(this.theModel)) {
        this.$q.notify({ type: 'negative', message: this.$t('Model entity attributes list is empty or invalid') })
        return { tree: [], leafCount: 0 } // invalid list of entity attributes
      }

      // if run specified then include only entity.attribute from this model run
      const eUse = {}
      const aUse = {}
      const isRun = this.runDigest && Mdf.isNotEmptyRunText(this.runCurrent)

      if (isRun) {
        for (const e of this.runCurrent.Entity) {
          if (e?.Name && Array.isArray(e?.Attr)) {
            let na = 0
            for (const a of e.Attr) {
              const name = e.Name + '.' + a
              aUse[name] = true
              na++
            }
            if (na > 0) {
              eUse[e.Name] = true
            }
          }
        }
      }

      // if filter names not empty then display only attributes from that name list
      // use entity as a group and attributes as leafs
      const gTree = []
      let nLeaf = 0

      for (const ent of this.theModel.EntityTxt) {
        if (isRun && !eUse[ent.Entity.Name]) continue // skip: this entity does not exist in that run

        // make group of attributes from entity
        let isAny = false

        const g = {
          key: 'egr-' + ent.Entity.EntityId, // + '-' + this.nextId++,
          label: ent.Entity.Name,
          descr: Mdf.descrOfDescrNote(ent),
          children: [],
          parts: '',
          isGroup: true,
          isAbout: true,
          isAboutEmpty: false
        }

        // add attributes as leafs of the entity group
        for (const ea of ent.EntityAttrTxt) {
          const name = ent.Entity.Name + '.' + ea.Attr.Name
          if (isRun && !aUse[name]) continue // skip: this entity.attribute does not exist in that run

          // if in-list filter enabled then use only entity.attribute from the list
          if (this.isInListEnable) {
            const n = this.nameFilter.indexOf(name)
            if (n < 0) {
              this.isAnyFiltered = true
              continue // skip filtered out entity
            }
          }

          this.isAnyHidden = this.isAnyHidden || ea.Attr.IsInternal
          if (!this.isShowHidden && ea.Attr.IsInternal) continue // skip hidden internal attribute if reqired

          g.children.push({
            key: 'etl-' + ea.Attr.EntityId + '-' + ea.Attr.AttrId, // + '-' + this.nextId++,
            label: ea.Attr.Name,
            descr: Mdf.descrOfDescrNote(ea),
            children: [],
            parts: ent.Entity.Name,
            isGroup: false,
            isAbout: true,
            isAboutEmpty: false
          })
          isAny = true
        }

        if (isAny) { // append entity group to the tree
          gTree.push(g)
          nLeaf += g.children.length
        }
      }
      this.isAnyEntity = gTree.length > 0

      return { tree: gTree, entityCount: gTree.length, leafCount: nLeaf }
    }
  },

  mounted () {
    this.doRefresh()
  }
}
</script>
