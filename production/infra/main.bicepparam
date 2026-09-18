using 'main.bicep'

param namePrefix = 'beacon'
param location = 'eastus2'
param environmentName = 'dev'
// Overridden by CI/azd with the freshly pushed image tag.
param apiImage = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
// First stand-up runs self-contained; flip to 'live' + deployOpenAi once quota is confirmed.
param providerMode = 'fake'
param deployOpenAi = false
