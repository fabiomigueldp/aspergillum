[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string] $Prompt,

    [ValidateRange(0.5, 30)]
    [double] $DurationSeconds = 2,

    [ValidateRange(0, 1)]
    [double] $PromptInfluence = 0.3,

    [ValidatePattern('^[^\\/:*?"<>|]+\.mp3$')]
    [string] $OutputName = 'sound-effect.mp3'
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'load-env.ps1')

if ([string]::IsNullOrWhiteSpace($env:ELEVENLABS_API_KEY)) {
    throw 'ELEVENLABS_API_KEY nao foi encontrada no arquivo .env.'
}

$outputDirectory = Join-Path $PSScriptRoot 'outputs'
$outputPath = Join-Path $outputDirectory $OutputName
$body = @{
    text               = $Prompt
    duration_seconds   = $DurationSeconds
    prompt_influence   = $PromptInfluence
    model_id           = 'eleven_text_to_sound_v2'
} | ConvertTo-Json

$response = Invoke-WebRequest `
    -UseBasicParsing `
    -Uri 'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128' `
    -Headers @{ 'xi-api-key' = $env:ELEVENLABS_API_KEY } `
    -Method Post `
    -ContentType 'application/json' `
    -Body $body `
    -OutFile $outputPath `
    -PassThru

[pscustomobject]@{
    output_path = $outputPath
    credit_cost = $response.Headers['character-cost']
    content_type = $response.Headers['Content-Type']
    bytes = (Get-Item -LiteralPath $outputPath).Length
}
