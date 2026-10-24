param([int]$Port = 8766)
$ErrorActionPreference = 'Stop'
$pythonCommand = Get-Command python -ErrorAction Stop
$previewUrl = "http://127.0.0.1:$Port/"
try {
    $response = Invoke-WebRequest -Uri $previewUrl -TimeoutSec 2 -UseBasicParsing
    if ($response.Content -match 'Osmo Action 4' -and $response.Content -match 'ENGINEERED FOR ADVENTURE') {
        Start-Process $previewUrl
        Write-Host "Preview already running: $previewUrl"
        exit 0
    }
} catch { }
$portProbe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try { $portProbe.Start() } catch { $Port = 0; $portProbe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0); $portProbe.Start() }
$Port = $portProbe.LocalEndpoint.Port
$portProbe.Stop()
$previewUrl = "http://127.0.0.1:$Port/"
Write-Host "Osmo Action 4 preview: $previewUrl"
Write-Host 'Keep this window open. Press Ctrl+C to stop.'
Start-Process $previewUrl
& $pythonCommand.Source -m http.server $Port --bind 127.0.0.1 --directory $PSScriptRoot
