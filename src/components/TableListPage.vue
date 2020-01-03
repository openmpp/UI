<template>

<div id="table-list-page" class="mdc-typography mdc-typography--body1">

  <template v-if="isTableList()">

    <OmTreeList
      :treeId="'table-list-tree-' + nameDigest"
      :treeDataTickle="treeDataTickle"
      :isAnyHidden="isAnyHidden"
      :isShowHidden="isShowHidden"
      :isExpandTree="isExpandTree"
      :treeData="treeData"
      @show-hidden-click="onShowHiddenClick"
      @leaf-click="onTableClick"
      @leaf-about-click="onTableAboutClick"
      @folder-about-click="onGroupAboutClick"
      ></OmTreeList>
  </template>

  <table-info-dialog ref="tableNoteDlg" id="table-note-dlg"></table-info-dialog>
  <group-info-dialog ref="groupNoteDlg" id="group-note-dlg"></group-info-dialog>

</div>
</template>

<script>
import { mapGetters } from 'vuex'
import { GET } from '@/store'
import * as Mdf from '@/modelCommon'
import OmTreeList from './OmTreeList'
import TableInfoDialog from './TableInfoDialog'
import GroupInfoDialog from './GroupInfoDialog'

export default {
  components: { OmTreeList, TableInfoDialog, GroupInfoDialog },

  props: {
    digest: { type: String, default: '' },
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

  computed: {
    ...mapGetters({
      theModel: GET.THE_MODEL,
      runTextByDigestOrName: GET.RUN_TEXT_BY_DIGEST_OR_NAME
    })
  },

  methods: {
    // check if model output tables list ready to be useed
    isTableList () { return Mdf.legthOfTableTextList(this.theModel) > 0 },

    // show output table info
    onTableAboutClick (key, name, data) {
      this.$refs.tableNoteDlg.showTableInfo(Mdf.tableTextByName(this.theModel, name), this.runTextByDigestOrName(this.nameDigest))
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
    // output table selected: route to output table page
    onTableClick (key, name, data) {
      const t = Mdf.tableTextByName(this.theModel, name)
      this.$router.push(
        '/model/' + this.digest + '/run/' + this.nameDigest + '/table/' + t.Table.Name)
    },

    // retrun tree of output tables list: groups and output table leafs
    setTreeData () {
      this.treeDataTickle = !this.treeDataTickle // tree data updated

      if (!this.isTableList(this.theModel)) return []

      // make groups map: map group id to group node
      let gm = {}

      for (let k = 0; k < this.theModel.GroupTxt.length; k++) {
        if (this.theModel.GroupTxt[k].Group.IsParam) continue // skip parameters group

        let gId = this.theModel.GroupTxt[k].Group.GroupId
        let isNote = Mdf.noteOfDescrNote(this.theModel.GroupTxt[k]) !== ''
        this.isAnyHidden = this.isAnyHidden || this.theModel.GroupTxt[k].Group.IsHidden

        gm[gId] = {
          idx: k,
          group: this.theModel.GroupTxt[k],
          item: {
            key: 'tgr-' + gId + '-' + this.nextId++,
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
        if (this.theModel.GroupTxt[k].Group.IsParam) continue // skip parameters group
        if (!this.isShowHidden && this.theModel.GroupTxt[k].Group.IsHidden) continue // skip hidden group

        let gId = this.theModel.GroupTxt[k].Group.GroupId

        let isNotTop = this.theModel.GroupTxt.findIndex((gt) => {
          if (gt.Group.IsParam) return false
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
              gn.item.key = 'tgr-' + pc.ChildGroupId + '-' + this.nextId++
              gn.path.push(gn.gId)
              sd.push(gn)
              csd.item.children.push(gn.item)
            }
          }

          if (pc.ChildLeafId >= 0) {
            let t = Mdf.tableTextById(this.theModel, pc.ChildLeafId)
            if (Mdf.isTable(t.Table)) {
              if (!this.isShowHidden && t.Table.IsHidden) continue // skip hidden output table

              csd.item.children.push({
                key: 'ttl-' + pc.ChildLeafId + '-' + this.nextId++,
                name: t.Table.Name,
                descr: (t.TableDescr || ''),
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

      // add output tables which are not included in any group
      let ulm = {}
      for (let k = 0; k < this.theModel.GroupTxt.length; k++) {
        if (this.theModel.GroupTxt[k].Group.IsParam) continue // skip parameters group

        for (let pc of this.theModel.GroupTxt[k].Group.GroupPc) {
          if (pc.ChildLeafId >= 0) ulm[pc.ChildLeafId] = true // store leaf output table id
        }
      }

      let nExtra = 0
      for (let t of this.theModel.TableTxt) {
        this.isAnyHidden = this.isAnyHidden || t.Table.IsHidden

        if (!this.isShowHidden && t.Table.IsHidden) continue // skip hidden output table
        if (ulm[t.Table.TableId]) continue // skip output table used as leaf
        nExtra++
      }

      if (nExtra > 0) {
        let n = td.length
        td.length += nExtra

        for (let t of this.theModel.TableTxt) {
          if (!this.isShowHidden && t.Table.IsHidden) continue // skip hidden output table
          if (ulm[t.Table.TableId]) continue // skip output table used as leaf

          td[n++] = {
            key: 'ttl-' + t.Table.TableId + '-' + this.nextId++,
            name: t.Table.Name,
            descr: (t.TableDescr || ''),
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
    this.$emit('tab-mounted', 'table-list', { digest: this.digest, runOrSet: 'run', runSetKey: this.nameDigest })
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
</style>
