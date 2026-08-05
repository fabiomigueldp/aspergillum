[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'load-env.ps1')

if ([string]::IsNullOrWhiteSpace($env:ELEVENLABS_API_KEY)) {
    throw 'ELEVENLABS_API_KEY nao foi encontrada no arquivo .env.'
}

$subscription = Invoke-RestMethod `
    -Uri 'https://api.elevenlabs.io/v1/user/subscription' `
    -Headers @{ 'xi-api-key' = $env:ELEVENLABS_API_KEY } `
    -Method Get

[pscustomobject]@{
    tier              = $subscription.tier
    status            = $subscription.status
    credits_used      = $subscription.character_count
    credit_limit      = $subscription.character_limit
    credits_remaining = $subscription.character_limit - $subscription.character_count
}
