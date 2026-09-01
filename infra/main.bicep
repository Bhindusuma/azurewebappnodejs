// Azure App Service (Linux) for the Kiln web app.
//   az deployment group create -g <rg> -f infra/main.bicep -p namePrefix=kiln jwtSecret=<secret>

@description('Prefix for all resource names.')
param namePrefix string = 'kiln'

@description('Region for all resources.')
param location string = resourceGroup().location

@description('B1 is the smallest tier that supports Always On and deployment slots.')
@allowed(['B1', 'B2', 'P0v3', 'P1v3'])
param sku string = 'B1'

@description('Signing secret for session cookies. Pass in from a pipeline; never commit it.')
@secure()
param jwtSecret string

@description('Postgres connection string. Leave empty to run on the in-memory store.')
@secure()
param databaseUrl string = ''

var appName = '${namePrefix}-web'

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${namePrefix}-logs'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${namePrefix}-insights'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logs.id
  }
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${namePrefix}-plan'
  location: location
  sku: { name: sku }
  kind: 'linux'
  properties: { reserved: true }   // reserved: true means Linux
}

var appSettings = [
  { name: 'NODE_ENV', value: 'production' }
  { name: 'JWT_SECRET', value: jwtSecret }
  { name: 'DATABASE_URL', value: databaseUrl }
  // Node modules ship inside the zip, so skip the Oryx build on the server.
  { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'false' }
  { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }
  { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: insights.properties.ConnectionString }
  { name: 'WEBSITE_SWAP_WARMUP_PING_PATH', value: '/readyz' }
  { name: 'WEBSITE_SWAP_WARMUP_PING_STATUSES', value: '200' }
]

resource site 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  identity: { type: 'SystemAssigned' }   // use this for Key Vault and Postgres auth
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      appCommandLine: 'node server.js'   // explicit startup command
      alwaysOn: true                     // stops the app being unloaded when idle
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      healthCheckPath: '/healthz'
      appSettings: appSettings
    }
  }
}

// Staging slot for zero-downtime swaps.
resource staging 'Microsoft.Web/sites/slots@2023-12-01' = {
  parent: site
  name: 'staging'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      appCommandLine: 'node server.js'
      alwaysOn: true
      healthCheckPath: '/healthz'
      appSettings: appSettings
    }
  }
}

resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'to-log-analytics'
  scope: site
  properties: {
    workspaceId: logs.id
    logs: [
      { category: 'AppServiceHTTPLogs', enabled: true }
      { category: 'AppServiceConsoleLogs', enabled: true }
      { category: 'AppServiceAppLogs', enabled: true }
      { category: 'AppServicePlatformLogs', enabled: true }
    ]
  }
}

output url string = 'https://${site.properties.defaultHostName}'
output principalId string = site.identity.principalId
