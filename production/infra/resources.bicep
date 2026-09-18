@description('Name prefix for all resources.')
param namePrefix string

@description('Azure region for all resources.')
param location string

@description('Environment name (dev, test, prod).')
param environmentName string

@description('Container image reference for the Beacon API.')
param apiImage string

@description('Runtime provider mode for the API container.')
param providerMode string

@description('Provision Azure OpenAI.')
param deployOpenAi bool

@description('Tags applied to every resource.')
param tags object

var suffix = uniqueString(subscription().id, resourceGroup().id, environmentName)
var baseName = '${namePrefix}${environmentName}'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${baseName}-logs'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${baseName}-ai'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: 'acr${suffix}'
  location: location
  tags: tags
  sku: { name: 'Standard' }
  properties: {
    adminUserEnabled: false
  }
}

// User-assigned identity used by the container app to pull from ACR.
// Using a UAMI (created before the app, granted AcrPull independently) breaks the
// first-deploy chicken-and-egg where a system-assigned identity cannot be granted
// AcrPull until after the app — and its first image pull — has already succeeded.
resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${baseName}-pull'
  location: location
  tags: tags
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv${suffix}'
  location: location
  tags: tags
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
  }
}

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' = {
  name: 'cosmos${suffix}'
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    disableLocalAuth: true
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
  }
}

resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-11-15' = {
  parent: cosmos
  name: 'beacon'
  properties: {
    resource: { id: 'beacon' }
  }
}

resource outcomesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = {
  parent: cosmosDb
  name: 'outcomes'
  properties: {
    resource: {
      id: 'outcomes'
      partitionKey: {
        paths: [ '/employeeId' ]
        kind: 'Hash'
      }
    }
  }
}

resource serviceBus 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: 'sb${suffix}'
  location: location
  tags: tags
  sku: { name: 'Standard', tier: 'Standard' }
  properties: {
    disableLocalAuth: true
  }
}

resource eventsTopic 'Microsoft.ServiceBus/namespaces/topics@2022-10-01-preview' = {
  parent: serviceBus
  name: 'beacon-events'
  properties: {
    defaultMessageTimeToLive: 'P14D'
  }
}

resource openAi 'Microsoft.CognitiveServices/accounts@2024-10-01' = if (deployOpenAi) {
  name: 'aoai${suffix}'
  location: location
  tags: tags
  kind: 'OpenAI'
  sku: { name: 'S0' }
  properties: {
    customSubDomainName: 'aoai${suffix}'
    disableLocalAuth: true
    publicNetworkAccess: 'Enabled'
  }
}

resource gpt4o 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = if (deployOpenAi) {
  parent: openAi
  name: 'gpt-4.1-mini'
  sku: { name: 'Standard', capacity: 20 }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4.1-mini'
      version: '2025-04-14'
    }
  }
}

resource containerEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${baseName}-env'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

resource apiApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${baseName}-api'
  location: location
  tags: union(tags, { 'azd-service-name': 'api' })
  identity: {
    type: 'SystemAssigned, UserAssigned'
    userAssignedIdentities: {
      '${pullIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
      }
      registries: [
        {
          server: registry.properties.loginServer
          identity: pullIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'PROVIDER_MODE', value: providerMode }
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '8080' }
            { name: 'AZURE_OPENAI_ENDPOINT', value: openAi.?properties.endpoint ?? '' }
            { name: 'AZURE_OPENAI_DEPLOYMENT', value: deployOpenAi ? 'gpt-4.1-mini' : '' }
            { name: 'AZURE_CLIENT_ID', value: pullIdentity.properties.clientId }
            { name: 'COSMOS_ENDPOINT', value: cosmos.properties.documentEndpoint }
            { name: 'COSMOS_DATABASE', value: cosmosDb.name }
            { name: 'COSMOS_CONTAINER', value: outcomesContainer.name }
            { name: 'SERVICE_BUS_NAMESPACE', value: '${serviceBus.name}.servicebus.windows.net' }
            { name: 'SERVICE_BUS_TOPIC', value: eventsTopic.name }
            { name: 'KEY_VAULT_URI', value: keyVault.properties.vaultUri }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
      }
    }
  }
}

var acrPullRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, pullIdentity.id, acrPullRoleId)
  scope: registry
  properties: {
    principalId: pullIdentity.properties.principalId
    roleDefinitionId: acrPullRoleId
    principalType: 'ServicePrincipal'
  }
}

// Cognitive Services OpenAI User — lets the container app call Azure OpenAI with
// its managed identity (the account has local auth disabled, so AAD is required).
var openAiUserRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd')

resource openAiUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployOpenAi) {
  name: guid(openAi.id, pullIdentity.id, openAiUserRoleId)
  scope: openAi
  properties: {
    principalId: pullIdentity.properties.principalId
    roleDefinitionId: openAiUserRoleId
    principalType: 'ServicePrincipal'
  }
}

output apiFqdn string = apiApp.properties.configuration.ingress.fqdn
output containerRegistryLoginServer string = registry.properties.loginServer
output keyVaultUri string = keyVault.properties.vaultUri
