<template>

  <om-table-tree
    :refresh-tickle="refreshTickle"
    :refresh-tree-tickle="refreshParamTreeTickle"
    :tree-data="paramTreeData"
    :is-all-expand="false"
    :is-any-group="isAnyGroup"
    :is-any-hidden="isAnyHidden"
    :is-show-hidden="isShowHidden"
    :is-add="isAdd"
    :is-add-group="isAddGroup"
    :is-add-disabled="isAddDisabled"
    :is-remove="isRemove"
    :is-remove-group="isRemoveGroup"
    :is-remove-disabled="isRemoveDisabled"
    :filter-placeholder="$t('Find parameter...')"
    :no-results-label="$t('No model parameters found')"
    :no-nodes-label="$t('Server offline or no model parameters found')"
    @om-table-tree-show-hidden="onToogleHiddenParamTree"
    @om-table-tree-leaf-select="onParamLeafClick"
    @om-table-tree-leaf-add="onAddClick"
    @om-table-tree-group-add="onGroupAddClick"
    @om-table-tree-leaf-remove="onRemoveClick"
    @om-table-tree-group-remove="onGroupRemoveClick"
    @om-table-tree-leaf-note="onShowParamNote"
    @om-table-tree-group-note="onShowGroupNote"
    >
  </om-table-tree>

</template>

<script>
import { mapState } from 'vuex'
import * as Mdf from 'src/model-common'
import OmTableTree from 'components/OmTableTree.vue'
import * as Tsc from 'components/tree-common.js'

export default {
  name: 'RunParameterList',
  components: { OmTableTree },

  props: {
    runDigest: { type: String, required: true },
    refreshTickle: { type: Boolean, default: false },
    isAdd: { type: Boolean, default: false },
    isAddGroup: { type: Boolean, default: false },
    isAddDisabled: { type: Boolean, default: false },
    isRemove: { type: Boolean, default: false },
    isRemoveGroup: { type: Boolean, default: false },
    isRemoveDisabled: { type: Boolean, default: false }
  },

  data () {
    return {
      refreshParamTreeTickle: false,
      isAnyGroup: false,
      isAnyHidden: false,
      isShowHidden: false,
      paramTreeData: [],
      nextId: 100
    }
  },

  computed: {
    ...mapState('model', {
      theModel: state => state.theModel,
      theModelUpdated: state => state.theModelUpdated
    })
  },

  watch: {
    runDigest () { this.doRefresh() },
    refreshTickle () { this.doRefresh() },
    theModelUpdated () { this.doRefresh() }
  },

  methods: {
    // update parameters tree data and refresh tree view
    doRefresh () {
      const td = this.makeParamTreeData()
      this.paramTreeData = td.tree
      this.refreshParamTreeTickle = !this.refreshParamTreeTickle
      this.$emit('run-parameter-tree-updated', td.leafCount)
    },

    // show or hide hidden parameters and groups
    onToogleHiddenParamTree (isShow) {
      this.isShowHidden = isShow
      this.doRefresh()
    },
    // click on parameter: open current run parameter values tab
    onParamLeafClick (name) {
      this.$emit('run-parameter-select', name)
    },
    // click on add parameter: add parameter from current run
    onAddClick (name) {
      this.$emit('run-parameter-add', name)
    },
    // click on add group: add group from current run
    onGroupAddClick (name) {
      this.$emit('run-parameter-group-add', name)
    },
    // click on remove parameter: remove parameter from current run
    onRemoveClick (name) {
      this.$emit('run-parameter-remove', name)
    },
    // click on remove group: remove group from current run
    onGroupRemoveClick (name) {
      this.$emit('run-parameter-group-remove', name)
    },
    // click on show parameter notes dialog button
    onShowParamNote (name) {
      this.$emit('run-parameter-info-show', name)
    },
    // click on show group notes dialog button
    onShowGroupNote (name) {
      this.$emit('run-parameter-group-info-show', name)
    },

    // return tree of model parameters
    makeParamTreeData () {
      this.isAnyGroup = false
      this.isAnyHidden = false

      if (!Mdf.paramCount(this.theModel)) {
        return { tree: [], leafCount: 0 } // empty list of parameters
      }
      if (!Mdf.isParamTextList(this.theModel)) {
        this.$q.notify({ type: 'negative', message: this.$t('Model parameters list is empty or invalid') })
        return { tree: [], leafCount: 0 } // invalid list of parameters
      }

      // make groups map: map group id to group node
      const gLst = this.theModel.GroupTxt
      const gUse = {}

      for (let k = 0; k < gLst.length; k++) {
        if (!gLst[k].Group.IsParam) continue // skip output tables group

        const gId = gLst[k].Group.GroupId
        const isNote = Mdf.noteOfDescrNote(gLst[k]) !== ''
        this.isAnyHidden = this.isAnyHidden || gLst[k].Group.IsHidden

        gUse[gId] = {
          group: gLst[k],
          item: {
            key: 'pgr-' + gId + '-' + this.nextId++,
            label: gLst[k].Group.Name,
            descr: Mdf.descrOfDescrNote(gLst[k]),
            children: [],
            isGroup: true,
            isAbout: isNote,
            isAboutEmpty: !isNote
          }
        }
      }

      // add top level groups as starting point into groups tree
      let gTree = []
      const gProc = []

      for (let k = 0; k < gLst.length; k++) {
        if (!gLst[k].Group.IsParam) continue // skip output tables group
        if (!this.isShowHidden && gLst[k].Group.IsHidden) continue // skip hidden group

        const gId = gLst[k].Group.GroupId

        const isNotTop = gLst.findIndex((gt) => {
          if (!gt.Group.IsParam) return false
          if (gt.Group.GroupId === gId) return false
          if (gt.Group.GroupPc.length <= 0) return false
          return gt.Group.GroupPc.findIndex((pc) => pc.ChildGroupId === gId) >= 0
        }) >= 0
        if (isNotTop) continue // not a top level group

        const g = Mdf._cloneDeep(gUse[gId].item)
        gTree.push(g)
        gProc.push({
          gId: gId,
          path: [gId],
          item: g
        })
      }
      this.isAnyGroup = gTree.length > 0

      // build groups tree
      const pUse = {}

      while (gProc.length > 0) {
        const gpNow = gProc.pop()
        const gTxt = gUse[gpNow.gId].group

        // make all children of current item
        for (const pc of gTxt.Group.GroupPc) {
          // if this is a child group
          if (pc.ChildGroupId >= 0) {
            const gChildUse = gUse[pc.ChildGroupId]
            if (gChildUse) {
              if (!this.isShowHidden && gChildUse.group.Group.IsHidden) continue // skip hidden group

              // check for circular reference
              if (gpNow.path.indexOf(pc.ChildGroupId) >= 0) {
                console.warn('Error: circular refernece to group:', pc.ChildGroupId, 'path:', gpNow.path)
                continue // skip this group
              }

              const g = {
                gId: pc.ChildGroupId,
                path: Mdf._cloneDeep(gpNow.path),
                item: Mdf._cloneDeep(gChildUse.item)
              }
              g.item.key = 'pgr-' + pc.ChildGroupId + '-' + this.nextId++
              g.path.push(g.gId)
              gProc.push(g)
              gpNow.item.children.push(g.item)
            }
          }

          // if this is a child leaf parameter
          if (pc.ChildLeafId >= 0) {
            const p = Mdf.paramTextById(this.theModel, pc.ChildLeafId)
            if (Mdf.isParam(p.Param)) {
              if (!this.isShowHidden && p.Param.IsHidden) continue // skip hidden parameter

              gpNow.item.children.push({
                key: 'ptl-' + pc.ChildLeafId + '-' + this.nextId++,
                label: p.Param.Name,
                descr: Mdf.descrOfDescrNote(p),
                children: [],
                isGroup: false,
                isAbout: true,
                isAboutEmpty: false
              })
              pUse[p.Param.ParamId] = true
            }
          }
        }
      }

      // walk the tree and remove empty branches
      gTree = Tsc.removeEmptyGroups(gTree)

      // add parameters which are not included in any group
      const leafUse = {}

      for (let k = 0; k < gLst.length; k++) {
        if (!gLst[k].Group.IsParam) continue // skip output tables group

        for (const pc of gLst[k].Group.GroupPc) {
          if (pc.ChildLeafId >= 0) leafUse[pc.ChildLeafId] = true // store leaf parameter id
        }
      }

      let leafCount = 0
      for (const p of this.theModel.ParamTxt) {
        this.isAnyHidden = this.isAnyHidden || p.Param.IsHidden
        if (!this.isShowHidden && p.Param.IsHidden) continue // skip hidden parameter

        if (!leafUse[p.Param.ParamId]) { // if parameter is not a leaf of any group
          gTree.push({
            key: 'ptl-' + p.Param.ParamId + '-' + this.nextId++,
            label: p.Param.Name,
            descr: Mdf.descrOfDescrNote(p),
            children: [],
            isGroup: false,
            isAbout: true,
            isAboutEmpty: false
          })
          pUse[p.Param.ParamId] = true
        }
        if (pUse[p.Param.ParamId]) leafCount++
      }

      return { tree: gTree, leafCount: leafCount }
    }
  },

  mounted () {
    this.doRefresh()
  }
}
</script>
