<#
.SYNOPSIS
  Creates (or reuses) the Entra app registration that powers Beacon "Production mode".

.DESCRIPTION
  Production mode signs the user in with MSAL and reads their real Microsoft directory
  (their profile via User.Read and their frequent colleagues via People.Read) directly
  from Microsoft Graph. Both scopes are user-consentable and require NO admin consent.

  This script registers a public-client / SPA application with the correct redirect
  URIs and delegated Graph permissions, then prints the exact build values to set.

  IMPORTANT: run this in the tenant whose people you want to see.
    - To see your real @microsoft.com colleagues, an admin must register the app in the
      Microsoft corporate tenant (this script must be run by someone with rights there).
    - For a self-contained demo, run it in any tenant where you can create app registrations;
      sign-in will then surface that tenant's users.

.PARAMETER DisplayName
  App registration name. Defaults to "Beacon Production".

.PARAMETER RedirectUri
  One or more SPA redirect URIs. Defaults to localhost dev + must be extended with your
  deployed Container App URL, e.g. https://beacondev-api.<hash>.eastus2.azurecontainerapps.io

.EXAMPLE
  ./register-app.ps1 -RedirectUri "http://localhost:5173","https://beacondev-api.victoriouswater-76454934.eastus2.azurecontainerapps.io"
#>
[CmdletBinding()]
param(
  [string]$DisplayName = 'Beacon Production',
  [string[]]$RedirectUri = @('http://localhost:5173')
)

$ErrorActionPreference = 'Stop'

# Microsoft Graph well-known IDs (delegated scopes).
$graphAppId = '00000003-0000-0000-c000-000000000000'
$userRead   = 'e1fe6dd8-ba31-4d61-89e7-88639da4683d'  # User.Read
$peopleRead = 'ba47897c-39ec-4d64-8b45-8f38b8d97f7d'  # People.Read

Write-Host "Signed-in Azure CLI context:" -ForegroundColor Cyan
az account show --query '{tenant:tenantId, user:user.name}' -o table

# Reuse an existing registration with the same display name if present.
$existing = az ad app list --display-name $DisplayName --query "[0].appId" -o tsv
if ($existing) {
  Write-Host "Reusing existing app registration ($existing)." -ForegroundColor Yellow
  $appId = $existing
} else {
  Write-Host "Creating app registration '$DisplayName'..." -ForegroundColor Green
  $appId = az ad app create `
    --display-name $DisplayName `
    --sign-in-audience AzureADMyOrg `
    --query appId -o tsv
}

# Configure SPA redirect URIs (public client, no secret).
Write-Host "Setting SPA redirect URIs: $($RedirectUri -join ', ')" -ForegroundColor Green
$spaJson = (@{ spa = @{ redirectUris = $RedirectUri } } | ConvertTo-Json -Depth 5 -Compress)
$objectId = az ad app show --id $appId --query id -o tsv
az rest --method PATCH `
  --uri "https://graph.microsoft.com/v1.0/applications/$objectId" `
  --headers 'Content-Type=application/json' `
  --body $spaJson | Out-Null

# Add delegated Graph permissions (User.Read + People.Read).
Write-Host "Adding delegated Graph permissions (User.Read, People.Read)..." -ForegroundColor Green
az ad app permission add --id $appId --api $graphAppId `
  --api-permissions "$userRead=Scope" "$peopleRead=Scope" | Out-Null

$tenantId = az account show --query tenantId -o tsv

Write-Host ""
Write-Host "==================== Beacon Production config ====================" -ForegroundColor Cyan
Write-Host "  VITE_AAD_CLIENT_ID = $appId"
Write-Host "  VITE_AAD_TENANT_ID = $tenantId"
Write-Host "================================================================="
Write-Host ""
Write-Host "Build the image with these values baked in, for example:" -ForegroundColor Cyan
Write-Host "  az acr build --registry <acr> --image beacon-app:vN --file Dockerfile ." -ForegroundColor DarkGray
Write-Host "    --build-arg VITE_AAD_CLIENT_ID=$appId --build-arg VITE_AAD_TENANT_ID=$tenantId" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Users consent to User.Read + People.Read on first sign-in. No admin consent required." -ForegroundColor DarkGray
