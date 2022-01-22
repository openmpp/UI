const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout'),
    children: [
      { path: '', component: () => import('pages/ModelList') },
      {
        path: 'model/:digest',
        component: () => import('pages/ModelPage'),
        props: true,
        children: [
          {
            path: 'run-list',
            component: () => import('pages/RunList'),
            props: true
          },
          {
            path: 'set-list',
            component: () => import('pages/WorksetList'),
            props: true
          },
          {
            path: 'run/:runDigest/parameter/:parameterName',
            component: () => import('pages/ParameterPage'),
            props: true
          },
          {
            path: 'set/:worksetName/parameter/:parameterName',
            component: () => import('pages/ParameterPage'),
            props: true
          },
          {
            path: 'run/:runDigest/table/:tableName',
            component: () => import(/* webpackChunkName: "table-page" */ 'pages/TablePage'),
            props: true
          },
          {
            path: 'new-run',
            component: () => import('pages/NewRun'),
            props: true
          },
          {
            path: 'run-log/:runStamp',
            component: () => import('pages/RunLog'),
            props: true
          },
          {
            path: 'download-list',
            component: () => import('pages/DownloadList'),
            props: true
          }
        ]
      },
      {
        path: 'download-list/model/:digest',
        component: () => import('pages/DownloadList'),
        props: true
      },
      { path: 'settings', component: () => import('pages/SessionSettings') },
      { path: 'license', component: () => import('pages/LicensePage') }
    ]
  },
  // Always leave this as last one, but you can also remove it
  {
    path: '*',
    component: () => import('pages/None404')
  }
]

export default routes
