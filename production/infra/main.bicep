targetScope = 'subscription'

@description('Name prefix for all resources, e.g. "beacon".')
param namePrefix string = 'beacon'

@description('Azure region for all resources.')
param location string = 'eastus2'

@description('Environment name (dev, test, prod).')
param environmentName string = 'dev'

@description('Container image reference for the Beacon API.')
param apiImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Runtime provider mode for the API container. "fake" runs fully self-contained; "live" uses Azure services.')
@allowed([ 'fake', 'live' ])
param providerMode string = 'fake'

@description('Provision Azure OpenAI. Disabled by default because sandbox subscriptions often lack quota.')
param deployOpenAi bool = false

var tags = {
  application: 'beacon'
  environment: environmentName
}

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: '${namePrefix}-${environmentName}-rg'
  location: location
  tags: tags
}

module resources 'resources.bicep' = {
  scope: rg
  params: {
    namePrefix: namePrefix
    location: location
    environmentName: environmentName
    apiImage: apiImage
    providerMode: providerMode
    deployOpenAi: deployOpenAi
    tags: tags
  }
}

output apiFqdn string = resources.outputs.apiFqdn
output containerRegistryLoginServer string = resources.outputs.containerRegistryLoginServer
output keyVaultUri string = resources.outputs.keyVaultUri
