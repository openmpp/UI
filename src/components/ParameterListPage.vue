<template>

<div :id="'parameter-list-page-' + runOrSet" class="mdc-typography mdc-typography--body1">

  <template v-if="isParamList()">
    <OmTreeList
      :treeId="'parameter-list-tree-' + runOrSet"
      :treeDataTickle="treeDataTickle"
      :isAnyHidden="isAnyHidden"
      :isShowHidden="isShowHidden"
      :isExpandTree="isExpandTree"
      :treeData="treeData"
      @show-hidden-click="onShowHiddenClick"
      @leaf-click="onParamClick"
      @leaf-about-click="onParamAboutClick"
      @folder-about-click="onGroupAboutClick"
      ></OmTreeList>
  </template>

  <param-info-dialog ref="paramNoteDlg" id="param-note-dlg"></param-info-dialog>
  <group-info-dialog ref="groupNoteDlg" id="group-note-dlg"></group-info-dialog>

</div>

</template>

<script>
import { mapGetters } from 'vuex'
import { GET } from '@/store'
import * as Mdf from '@/modelCommon'
import OmTreeList from './OmTreeList'
import ParamInfoDialog from './ParameterInfoDialog'
import GroupInfoDialog from './GroupInfoDialog'

export default {
  components: { OmTreeList, ParamInfoDialog, GroupInfoDialog },

  props: {
    digest: { type: String, default: '' },
    runOrSet: { type: String, default: '' },
    nameDigest: { type: String, default: '' }
  },

  data () {
    return {
      isAnyHidden: false,
      isShowHidden: false,
      isExpandTree: true,
      nextId: 1,
      treeDataTickle: false, // to avoid watch on entire treeData
      treeData: []
    }
  },

  watch: {
    routeKey () {
      this.setTreeData()

      this.$emit('tab-new-route',
        this.runOrSet === 'run' ? 'parameter-run-list' : 'parameter-set-list',
        { digest: this.digest, runOrSet: this.runOrSet, runSetKey: this.nameDigest })
    }
  },
  computed: {
    routeKey () {
      return this.runOrSet === 'run' ? Mdf.paramRunListRouteKey(this.digest) : Mdf.paramSetListRouteKey(this.digest)
    },
    ...mapGetters({
      theModel: GET.THE_MODEL,
      runTextByDigest: GET.RUN_TEXT_BY_DIGEST,
      worksetTextByName: GET.WORKSET_TEXT_BY_NAME
    })
  },

  methods: {
    // check if model parameter list ready to be used
    isParamList () { return Mdf.legthOfParamTextList(this.theModel) > 0 },

    // show parameter info
    onParamAboutClick (key, name, data) {
      const prs = Mdf.paramRunSetByName(
        ((this.runOrSet || '') === 'set') ? this.worksetTextByName(this.nameDigest) : this.runTextByDigest(this.nameDigest),
        name)
      const pt = Mdf.paramTextByName(this.theModel, name)

      this.$refs.paramNoteDlg.showParamInfo(pt, prs)
    },
    // show group description and notes info
    onGroupAboutClick (key, name, data) {
      this.$refs.groupNoteDlg.showGroupInfo(Mdf.groupTextByName(this.theModel, name))
    },
    // toggle show hidden flag and update group tree
    onShowHiddenClick () {
      this.isShowHidden = !this.isShowHidden
      this.setTreeData()
    },
    // parameter selected: route to parameter page
    onParamClick (key, name, data) {
      const pt = Mdf.paramTextByName(this.theModel, name)
      this.$router.push(
        '/model/' + this.digest + '/' + this.runOrSet + '/' + this.nameDigest + '/parameter/' + pt.Param.Name)
    },

    // update tree view: handler for parameter list re-loaded
    refreshView () { this.setTreeData() },

    // retrun tree of parameters list: groups and parameter leafs
    setTreeData () {
      this.treeDataTickle = !this.treeDataTickle // tree data updated

      if (!this.isParamList(this.theModel)) return []

      // make groups map: map group id to group node
      let gm = {}

      for (let k = 0; k < this.theModel.GroupTxt.length; k++) {
        if (!this.theModel.GroupTxt[k].Group.IsParam) continue // skip output tables group

        let gId = this.theModel.GroupTxt[k].Group.GroupId
        let isNote = Mdf.noteOfDescrNote(this.theModel.GroupTxt[k]) !== ''
        this.isAnyHidden = this.isAnyHidden || this.theModel.GroupTxt[k].Group.IsHidden

        gm[gId] = {
          idx: k,
          group: this.theModel.GroupTxt[k],
          item: {
            key: 'pgr-' + gId + '-' + this.nextId++,
            name: this.theModel.GroupTxt[k].Group.Name,
            descr: Mdf.descrOfDescrNote(this.theModel.GroupTxt[k]),
            children: [],
            isGroup: true,
            isAbout: isNote,
            isAboutEmpty: !isNote,
            isMatch: false,
            isFilterHide: false,
            data: {}
          }
        }
      }

      // add top level groups as starting point into groups tree
      let td = []
      let sd = []

      for (let k = 0; k < this.theModel.GroupTxt.length; k++) {
        if (!this.theModel.GroupTxt[k].Group.IsParam) continue // skip output tables group
        if (!this.isShowHidden && this.theModel.GroupTxt[k].Group.IsHidden) continue // skip hidden group

        let gId = this.theModel.GroupTxt[k].Group.GroupId

        let isNotTop = this.theModel.GroupTxt.findIndex((gt) => {
          if (!gt.Group.IsParam) return false
          if (gt.Group.GroupId === gId) return false
          if (gt.Group.GroupPc.length <= 0) return false
          return gt.Group.GroupPc.findIndex((pc) => pc.ChildGroupId === gId) >= 0
        }) >= 0
        if (isNotTop) continue // not a top level group

        let g = Mdf._cloneDeep(gm[gId].item)
        td.push(g)
        sd.push({
          gId: gId,
          path: [gId],
          item: g
        })
      }
      this.isExpandTree = td.length > 0 // if any groups then expand tree

      // build groups tree
      while (sd.length > 0) {
        let csd = sd.pop()
        let cg = gm[csd.gId]

        // make all children of current item
        for (let pc of cg.group.Group.GroupPc) {
          if (pc.ChildGroupId >= 0) {
            let g = gm[pc.ChildGroupId]
            if (g) {
              this.isAnyHidden = this.isAnyHidden || g.group.Group.IsHidden
              if (!this.isShowHidden && g.group.Group.IsHidden) continue // skip hidden group

              // check for circular reference
              if (csd.path.indexOf(pc.ChildGroupId) >= 0) {
                console.warn('Error: circular refernece to group:', pc.ChildGroupId, 'path:', csd.path)
                continue // skip this group
              }

              let gn = {
                gId: pc.ChildGroupId,
                path: Mdf._cloneDeep(csd.path),
                item: Mdf._cloneDeep(g.item)
              }
              gn.item.key = 'pgr-' + pc.ChildGroupId + '-' + this.nextId++
              gn.path.push(gn.gId)
              sd.push(gn)
              csd.item.children.push(gn.item)
            }
          }

          if (pc.ChildLeafId >= 0) {
            let pt = Mdf.paramTextById(this.theModel, pc.ChildLeafId)
            if (Mdf.isParam(pt.Param)) {
              if (!this.isShowHidden && pt.Param.IsHidden) continue // skip hidden parameter

              csd.item.children.push({
                key: 'ptl-' + pc.ChildLeafId + '-' + this.nextId++,
                name: pt.Param.Name,
                descr: Mdf.descrOfDescrNote(pt),
                children: [],
                isGroup: false,
                isAbout: true,
                isAboutEmpty: false,
                isMatch: false,
                isFilterHide: false,
                data: {}
              })
            }
          }
        }
      }

      // add parameters which are not included in any group
      let ulm = {}
      for (let k = 0; k < this.theModel.GroupTxt.length; k++) {
        if (!this.theModel.GroupTxt[k].Group.IsParam) continue // skip output tables group

        for (let pc of this.theModel.GroupTxt[k].Group.GroupPc) {
          if (pc.ChildLeafId >= 0) ulm[pc.ChildLeafId] = true // store leaf parameter id
        }
      }

      let nExtra = 0
      for (let pt of this.theModel.ParamTxt) {
        this.isAnyHidden = this.isAnyHidden || pt.Param.IsHidden

        if (!this.isShowHidden && pt.Param.IsHidden) continue // skip hidden parameter
        if (ulm[pt.Param.ParamId]) continue // skip parameter used as leaf
        nExtra++
      }

      if (nExtra > 0) {
        let n = td.length
        td.length += nExtra

        for (let pt of this.theModel.ParamTxt) {
          if (!this.isShowHidden && pt.Param.IsHidden) continue // skip hidden parameter
          if (ulm[pt.Param.ParamId]) continue // skip parameter used as leaf

          td[n++] = {
            key: 'ptl-' + pt.Param.ParamId + '-' + this.nextId++,
            name: pt.Param.Name,
            descr: Mdf.descrOfDescrNote(pt),
            children: [],
            isGroup: false,
            isAbout: true,
            isAboutEmpty: false,
            isMatch: false,
            isFilterHide: false,
            data: {}
          }
        }
      }

      this.treeData = td
    }
  },

  mounted () {
    this.setTreeData()
    this.$emit('tab-mounted',
      this.runOrSet === 'run' ? 'parameter-run-list' : 'parameter-set-list',
      { digest: this.digest, runOrSet: this.runOrSet, runSetKey: this.nameDigest })
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
</style>
