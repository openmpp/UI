<template>

  <om-table-tree
    :refresh-tickle="refreshTickle"
    :refresh-tree-tickle="refreshParamTreeTickle"
    :tree-data="paramTreeData"
    :is-all-expand="false"
    :is-any-group="isAnyParamGroup"
    :is-any-hidden="isAnyParamHidden"
    :is-show-hidden="isShowParamHidden"
    :filter-placeholder="$t('Find parameter...')"
    :no-results-label="$t('No model parameters found')"
    :no-nodes-label="$t('Server offline or no model parameters found')"
    @om-table-tree-show-hidden="onToogleHiddenParamTree"
    @om-table-tree-leaf-select="onParamLeafClick"
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
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      refreshParamTreeTickle: false,
      isAnyParamGroup: false,
      isAnyParamHidden: false,
      isShowParamHidden: false,
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
    refreshTickle  () { this.doRefresh() },
    theModelUpdated () { this.doRefresh() }
  },

  methods: {
    // update parameters tree data and refresh tree view
    doRefresh () {
      this.paramTreeData = this.makeParamTreeData()
      this.refreshParamTreeTickle = !this.refreshParamTreeTickle
    },

    // show or hide hidden parameters and groups
    onToogleHiddenParamTree (isShow) {
      this.isShowParamHidden = isShow
      this.doRefresh()
    },
    // click on parameter: open current run parameter values tab
    onParamLeafClick (key, name) {
      this.$emit('run-parameter-select', key, name)
    },
    // click on show parameter notes dialog button
    onShowParamNote (key, name) {
      this.$emit('run-parameter-info-show', key, name)
    },
    // click on show group notes dialog button
    onShowGroupNote (key, name) {
      this.$emit('run-parameter-group-info-show', key, name)
    },

    // return tree of model parameters
    makeParamTreeData () {
      this.isAnyParamGroup = false
      this.isAnyParamHidden = false

      if (!Mdf.paramCount(this.theModel)) return [] // empty list of parameters
      if (!Mdf.isParamTextList(this.theModel)) {
        this.$q.notify({ type: 'negative', message: this.$t('Model parameters list is empty or invalid') })
        return [] // invalid list of parameters
      }

      // make groups map: map group id to group node
      const gLst = this.theModel.GroupTxt
      const gUse = {}

      for (let k = 0; k < gLst.length; k++) {
        if (!gLst[k].Group.IsParam) continue // skip output tables group

        const gId = gLst[k].Group.GroupId
        const isNote = Mdf.noteOfDescrNote(gLst[k]) !== ''
        this.isAnyParamHidden = this.isAnyParamHidden || gLst[k].Group.IsHidden

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
        if (!this.isShowParamHidden && gLst[k].Group.IsHidden) continue // skip hidden group

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
      this.isAnyParamGroup = gTree.length > 0

      // build groups tree
      while (gProc.length > 0) {
        const gpNow = gProc.pop()
        const gTxt = gUse[gpNow.gId].group

        // make all children of current item
        for (const pc of gTxt.Group.GroupPc) {
          // if this is a child group
          if (pc.ChildGroupId >= 0) {
            const gChildUse = gUse[pc.ChildGroupId]
            if (gChildUse) {
              if (!this.isShowParamHidden && gChildUse.group.Group.IsHidden) continue // skip hidden group

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
              if (!this.isShowParamHidden && p.Param.IsHidden) continue // skip hidden parameter

              gpNow.item.children.push({
                key: 'ptl-' + pc.ChildLeafId + '-' + this.nextId++,
                label: p.Param.Name,
                descr: Mdf.descrOfDescrNote(p),
                children: [],
                isGroup: false,
                isAbout: true,
                isAboutEmpty: false
              })
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

      for (const p of this.theModel.ParamTxt) {
        this.isAnyParamHidden = this.isAnyParamHidden || p.Param.IsHidden
        if (!this.isShowParamHidden && p.Param.IsHidden) continue // skip hidden parameter

        if (!leafUse[p.Param.ParamId]) { // if parameter is not a leaf
          gTree.push({
            key: 'ptl-' + p.Param.ParamId + '-' + this.nextId++,
            label: p.Param.Name,
            descr: Mdf.descrOfDescrNote(p),
            children: [],
            isGroup: false,
            isAbout: true,
            isAboutEmpty: false
          })
        }
      }

      return gTree
    }
  },

  mounted () {
    this.doRefresh()
  }
}
</script>
