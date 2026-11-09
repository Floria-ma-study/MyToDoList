# MyToDoList 本地極簡 HTTP 伺服器 (Zero-dependency PowerShell HTTP Server)
param (
    [int]$Port = 5000
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "無法在通訊埠 $Port 啟動伺服器，可能已被佔用。嘗試通訊埠 5001..." -ForegroundColor Yellow
    $Port = 5001
    $prefix = "http://localhost:$Port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($prefix)
    $listener.Start()
}

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   MyToDoList 本地協作待辦網頁已啟動！" -ForegroundColor Green
Write-Host "   網址: $prefix" -ForegroundColor Yellow
Write-Host "   專案路徑: $scriptDir" -ForegroundColor Gray
Write-Host "   按 Ctrl + C 可停止伺服器" -ForegroundColor Gray
Write-Host "======================================================" -ForegroundColor Cyan

# 自動開啟瀏覽器
Start-Process $prefix

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8";
    ".css"  = "text/css; charset=utf-8";
    ".js"   = "application/javascript; charset=utf-8";
    ".json" = "application/json; charset=utf-8";
    ".png"  = "image/png";
    ".jpg"  = "image/jpeg";
    ".svg"  = "image/svg+xml";
    ".ico"  = "image/x-icon";
    ".txt"  = "text/plain; charset=utf-8";
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS 標頭支援
        $response.Headers.Add("Access-Control-Allow-Origin", "*")

        $rawUrl = $request.RawUrl.Split('?')[0]
        if ($rawUrl -eq "/" -or $rawUrl -eq "") {
            $rawUrl = "/index.html"
        }

        $localPath = Join-Path $scriptDir ($rawUrl.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar))

        if (Test-Path $localPath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            $mime = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $mime = $mimeTypes[$ext]
            }
            $response.ContentType = $mime
            
            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.StatusCode = 200
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
