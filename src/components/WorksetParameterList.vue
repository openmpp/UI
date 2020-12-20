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
import { mapState, mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'
import OmTableTree from 'components/OmTableTree.vue'

export default {
  name: 'WorksetParameterList',
  components: { OmTableTree },

  props: {
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      worksetCurrent: Mdf.emptyWorksetText(), // currently selected workset
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
    }),
    ...mapGetters('model', {
      worksetTextByName: 'worksetTextByName'
    }),
    ...mapState('uiState', {
      worksetNameSelected: state => state.worksetNameSelected
    })
  },

  watch: {
    worksetNameSelected () {
      this.worksetCurrent = this.worksetTextByName({ ModelDigest: Mdf.modelDigest(this.theModel), Name: this.worksetNameSelected })
      this.doRefresh()
    },
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
    // click on parameter: open current workset parameter values tab
    onParamLeafClick (key, name) {
      this.$emit('set-parameter-select', key, name)
    },
    // click on show parameter notes dialog button
    onShowParamNote (key, name) {
      this.$emit('set-parameter-info-show', key, name)
    },
    // click on show group notes dialog button
    onShowGroupNote (key, name) {
      this.$emit('set-parameter-group-info-show', key, name)
    },

    // return tree of model parameters
    makeParamTreeData () {
      this.isAnyParamGroup = false
      this.isAnyParamHidden = false

      if (!Mdf.paramCount(this.theModel) || !Mdf.isLength(this.worksetCurrent.Param)) return [] // empty list of parameters
      if (!Mdf.isParamTextList(this.theModel)) {
        this.$q.notify({ type: 'negative', message: this.$t('Model parameters list is empty or invalid') })
        return [] // invalid list of parameters
      }

      // make parameters map: map parameter id to parameter node
      const pm = {}
      const wpLst = this.worksetCurrent.Param

      for (const p of this.theModel.ParamTxt) {
        // skip parameter if it is not included in workset
        if (wpLst.findIndex((pw) => { return pw.Name === p.Param.Name }) < 0) continue

        // skip hidden parameter, if required
        this.isAnyParamHidden = this.isAnyParamHidden || p.Param.IsHidden
        if (!this.isShowParamHidden && p.Param.IsHidden) continue

        pm[p.Param.ParamId] = {
          param: p,
          item: {
            key: 'ptl-' + p.Param.ParamId + '-' + this.nextId++,
            label: p.Param.Name,
            descr: Mdf.descrOfDescrNote(p),
            children: [],
            isGroup: false,
            isAbout: true,
            isAboutEmpty: false
          }
        }
      }

      // make group map: map group id to group node
      // if group is not hidden and include any workset parameter or other workset group
      const gm = {}

      let isAny = false
      do {
        isAny = false

        for (const g of this.theModel.GroupTxt) {
          if (!g.Group.IsParam) continue // skip output tables group

          if (gm[g.Group.GroupId]) continue // group is already processed

          // check is this group has any workset parameters or other workset groups
          let isOk = g.Group.GroupPc.findIndex((pc) => { return !!pm[pc.ChildLeafId] }) >= 0
          if (!isOk) isOk = g.Group.GroupPc.findIndex((pc) => { return !!gm[pc.ChildGroupId] }) >= 0

          // hide group if required
          if (isOk && !this.isShowParamHidden) {
            isOk = !g.Group.IsHidden
            this.isAnyParamHidden = this.isAnyParamHidden || g.Group.IsHidden
          }
          if (!isOk) continue // skip this group

          // include group in result list
          isAny = true

          const gId = g.Group.GroupId
          const isNote = Mdf.noteOfDescrNote(g) !== ''

          gm[gId] = {
            group: g,
            item: {
              key: 'pgr-' + gId + '-' + this.nextId++,
              label: g.Group.Name,
              descr: Mdf.descrOfDescrNote(g),
              children: [],
              isGroup: true,
              isAbout: isNote,
              isAboutEmpty: !isNote
            }
          }
        }
      }
      while (isAny)

      // add top level groups as starting point into groups tree
      const td = []
      const sd = []

      for (const g of this.theModel.GroupTxt) {
        const gId = g.Group.GroupId
        if (!gm[gId]) continue // skip: this is not a workset group

        const isNotTop = this.theModel.GroupTxt.findIndex((gt) => {
          if (!gt.Group.IsParam) return false
          if (gt.Group.GroupId === gId) return false
          if (gt.Group.GroupPc.length <= 0) return false
          return gt.Group.GroupPc.findIndex((pc) => pc.ChildGroupId === gId) >= 0
        }) >= 0
        if (isNotTop) continue // not a top level group

        const cg = Mdf._cloneDeep(gm[gId].item)
        td.push(cg)
        sd.push({
          gId: gId,
          path: [gId],
          item: cg
        })
      }
      this.isAnyParamGroup = td.length > 0

      // build groups tree
      while (sd.length > 0) {
        const csd = sd.pop()
        const cg = gm[csd.gId]
        if (!cg) continue // skip: this is not a workset group

        // make all children of current group
        for (const pc of cg.group.Group.GroupPc) {
          // if this is a child group
          if (pc.ChildGroupId >= 0) {
            const g = gm[pc.ChildGroupId]
            if (g) {
              if (!this.isShowParamHidden && g.group.Group.IsHidden) continue // skip hidden group

              // check for circular reference
              if (csd.path.indexOf(pc.ChildGroupId) >= 0) {
                console.warn('Error: circular refernece to group:', pc.ChildGroupId, 'path:', csd.path)
                continue // skip this group
              }

              const gn = {
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

          // if this is a child leaf parameter
          if (pc.ChildLeafId >= 0) {
            const p = pm[pc.ChildLeafId]
            if (p) {
              const pn = Mdf._cloneDeep(p.item)
              pn.key = 'ptl-' + pc.ChildLeafId + '-' + this.nextId++
              csd.item.children.push(pn)
            }
          }
        }
      }

      // add parameters which are not included in any group (not a leaf)
      const ulm = {}
      for (const g of this.theModel.GroupTxt) {
        if (!g.Group.IsParam) continue // skip output tables group

        for (const pc of g.Group.GroupPc) {
          if (pc.ChildLeafId >= 0) ulm[pc.ChildLeafId] = true // store leaf parameter id
        }
      }

      for (const p of this.theModel.ParamTxt) {
        const pId = p.Param.ParamId
        const pw = pm[pId]
        if (!pw) continue // skip: this is not a workset parameter
        if (ulm[pId]) continue // if parameter is a leaf memeber of some group

        td.push(pw.item)
      }

      return td
    }
  },

  mounted () {
    this.worksetCurrent = this.worksetTextByName({ ModelDigest: Mdf.modelDigest(this.theModel), Name: this.worksetNameSelected })
    this.doRefresh()
  }
}
</script>
