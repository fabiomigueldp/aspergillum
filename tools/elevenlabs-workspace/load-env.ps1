$envFile = Join-Path $PSScriptRoot '.env'

if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Arquivo de configuracao ausente: $envFile"
}

foreach ($line in Get-Content -LiteralPath $envFile) {
    if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith('#')) {
        continue
    }

    $name, $value = $line -split '=', 2
    if (-not [string]::IsNullOrWhiteSpace($name)) {
        [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), 'Process')
    }
}

