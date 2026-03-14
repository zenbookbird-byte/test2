$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8080
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)

function Write-Response {
  param(
    [Parameter(Mandatory = $true)] $Client,
    [int] $StatusCode = 200,
    [string] $StatusText = "OK",
    [string] $ContentType = "text/plain; charset=utf-8",
    [byte[]] $Body = @()
  )

  $stream = $Client.GetStream()
  $writer = [System.IO.StreamWriter]::new($stream, [System.Text.Encoding]::UTF8, 1024, $true)
  $writer.NewLine = "`r`n"
  $writer.WriteLine("HTTP/1.1 $StatusCode $StatusText")
  $writer.WriteLine("Content-Type: $ContentType")
  $writer.WriteLine("Content-Length: $($Body.Length)")
  $writer.WriteLine("Connection: close")
  $writer.WriteLine()
  $writer.Flush()

  if ($Body.Length -gt 0) {
    $stream.Write($Body, 0, $Body.Length)
    $stream.Flush()
  }

  $writer.Dispose()
  $stream.Dispose()
  $Client.Close()
}

function Write-JsonResponse {
  param(
    [Parameter(Mandatory = $true)] $Client,
    [Parameter(Mandatory = $true)] $Data,
    [int] $StatusCode = 200,
    [string] $StatusText = "OK"
  )

  $json = $Data | ConvertTo-Json -Depth 20
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  Write-Response -Client $Client -StatusCode $StatusCode -StatusText $StatusText -ContentType "application/json; charset=utf-8" -Body $bytes
}

function Get-ContentType {
  param([string] $Path)

  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".js" { "application/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".svg" { "image/svg+xml" }
    ".png" { "image/png" }
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    default { "application/octet-stream" }
  }
}

function Get-DataObject {
  $dataPath = Join-Path $root "data\war_data.json"
  (Get-Content -Raw -Path $dataPath) | ConvertFrom-Json -Depth 20
}

function Get-Markets {
  $data = Get-DataObject
  @($data.markets | Where-Object { -not $_.closed } | ForEach-Object {
    [PSCustomObject]@{
      id = $_.id
      title = $_.title
      slug = $_.slug
      url = "https://polymarket.com/search?q=$([uri]::EscapeDataString($_.title))"
      yes_price = $_.yes_price
      volume = $_.volume
      closed = $_.closed
    }
  })
}

function Get-Wallets {
  $data = Get-DataObject
  $marketLookup = @{}
  foreach ($market in $data.markets) {
    $marketLookup[$market.id] = "https://polymarket.com/search?q=$([uri]::EscapeDataString($market.title))"
  }

  @($data.wallet_rows | Where-Object {
    $_.address -match '^0x[a-fA-F0-9]{40}$' -and
    [double]$_.net_pnl -gt 0 -and
    [int]$_.profitable_exits -gt 0
  } | ForEach-Object {
    $latestBet = if ($_.latest_bets -and $_.latest_bets.Count -gt 0) { $_.latest_bets[0] } else { $null }
    [PSCustomObject]@{
      address = $_.address
      wallet_url = "https://polygonscan.com/address/$($_.address)"
      trades = $_.trades
      win_rate = $_.win_rate
      profitable_exits = $_.profitable_exits
      total_exits = $_.total_exits
      net_pnl = $_.net_pnl
      period_score = $_.period_score
      gross_in = $_.gross_in
      gross_out = $_.gross_out
      latest_bet = if ($latestBet) { $latestBet.market_title } else { $null }
      latest_bet_url = if ($latestBet) { $marketLookup[$latestBet.market_id] } else { $null }
      latest_bet_date = if ($latestBet) { $latestBet.date } else { $null }
    }
  })
}

function Get-Signals {
  $data = Get-DataObject
  @($data.t50_signals | ForEach-Object {
    [PSCustomObject]@{
      market_title = $_.marketTitle
      market_url = "https://polymarket.com/search?q=$([uri]::EscapeDataString($_.marketTitle))"
      yes_price = $_.yesPrice
      wallet_count = $_.walletCount
      ev = $_.ev
      allocation = $_.allocation
      net_profit = $_.netProfit
    }
  })
}

function Resolve-StaticPath {
  param([string] $RequestPath)

  $relativePath = if ($RequestPath -eq "/") { "index.html" } else { $RequestPath.TrimStart("/") }
  $safeRelative = $relativePath -replace "/", "\"
  Join-Path $root $safeRelative
}

$listener.Start()
Write-Host "PolyTrack API running at http://localhost:$port/"
Write-Host "Open http://localhost:$port/"
Write-Host "API endpoints:"
Write-Host "  /api/health"
Write-Host "  /api/data"
Write-Host "  /api/markets"
Write-Host "  /api/wallets"
Write-Host "  /api/signals"

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      while ($reader.Peek() -ge 0) {
        $line = $reader.ReadLine()
        if ([string]::IsNullOrWhiteSpace($line)) { break }
      }
      $reader.Dispose()

      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        Write-Response -Client $client -StatusCode 400 -StatusText "Bad Request"
        continue
      }

      $parts = $requestLine.Split(" ")
      $method = $parts[0]
      $path = if ($parts.Length -gt 1) { $parts[1].Split("?")[0] } else { "/" }

      if ($method -ne "GET") {
        Write-Response -Client $client -StatusCode 405 -StatusText "Method Not Allowed"
        continue
      }

      switch ($path) {
        "/api/health" {
          Write-JsonResponse -Client $client -Data @{
            ok = $true
            service = "polytrack-api"
            timestamp = [DateTimeOffset]::UtcNow.ToString("o")
          }
          continue
        }
        "/api/data" {
          Write-JsonResponse -Client $client -Data (Get-DataObject)
          continue
        }
        "/api/markets" {
          Write-JsonResponse -Client $client -Data (Get-Markets)
          continue
        }
        "/api/wallets" {
          Write-JsonResponse -Client $client -Data (Get-Wallets)
          continue
        }
        "/api/signals" {
          Write-JsonResponse -Client $client -Data (Get-Signals)
          continue
        }
      }

      $filePath = Resolve-StaticPath -RequestPath $path
      if ((Test-Path -LiteralPath $filePath -PathType Leaf) -and $filePath.StartsWith($root)) {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        Write-Response -Client $client -StatusCode 200 -StatusText "OK" -ContentType (Get-ContentType -Path $filePath) -Body $bytes
      } else {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
        Write-Response -Client $client -StatusCode 404 -StatusText "Not Found" -Body $body
      }
    } catch {
      $body = [System.Text.Encoding]::UTF8.GetBytes($_.Exception.Message)
      Write-Response -Client $client -StatusCode 500 -StatusText "Internal Server Error" -Body $body
    }
  }
}
finally {
  $listener.Stop()
}
