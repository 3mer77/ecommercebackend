# Save as: ultimate-test.ps1

Write-Host @"
╔══════════════════════════════════════════════════════╗
║         1 MILLION REQUEST CHALLENGE                  ║
║         Can your API survive?                        ║
╚══════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

$startTime = Get-Date
$totalRequests = 0
$totalErrors = 0

# Round 1: 100k
Write-Host "`n🎯 ROUND 1: 100,000 Requests" -ForegroundColor Green
$result1 = autocannon -c 500 -d 120 -m POST -H "Content-Type: application/json" -i test-login.json http://localhost:3000/api/v1/auth/login --json | ConvertFrom-Json
$totalRequests += $result1.requests.total
$totalErrors += $result1.errors
Write-Host "   Requests: $($result1.requests.total) | Errors: $($result1.errors) | Avg: $([math]::Round($result1.latency.average))ms"

# Round 2: 200k
Write-Host "`n🎯 ROUND 2: 200,000 Requests" -ForegroundColor Yellow
$result2 = autocannon -c 800 -d 180 -m POST -H "Content-Type: application/json" -i test-login.json http://localhost:3000/api/v1/auth/login --json | ConvertFrom-Json
$totalRequests += $result2.requests.total
$totalErrors += $result2.errors
Write-Host "   Requests: $($result2.requests.total) | Errors: $($result2.errors) | Avg: $([math]::Round($result2.latency.average))ms"

# Round 3: 300k
Write-Host "`n🎯 ROUND 3: 300,000 Requests" -ForegroundColor Magenta
$result3 = autocannon -c 1000 -d 200 -m POST -H "Content-Type: application/json" -i test-login.json http://localhost:3000/api/v1/auth/login --json | ConvertFrom-Json
$totalRequests += $result3.requests.total
$totalErrors += $result3.errors
Write-Host "   Requests: $($result3.requests.total) | Errors: $($result3.errors) | Avg: $([math]::Round($result3.latency.average))ms"

# Round 4: 400k
Write-Host "`n🎯 ROUND 4: 400,000 Requests" -ForegroundColor Red
$result4 = autocannon -c 1500 -d 250 -m POST -H "Content-Type: application/json" -i test-login.json http://localhost:3000/api/v1/auth/login --json | ConvertFrom-Json
$totalRequests += $result4.requests.total
$totalErrors += $result4.errors
Write-Host "   Requests: $($result4.requests.total) | Errors: $($result4.errors) | Avg: $([math]::Round($result4.latency.average))ms"

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalMinutes

Write-Host @"

╔══════════════════════════════════════════════════════╗
║              🏆 FINAL RESULTS 🏆                     ║
╠══════════════════════════════════════════════════════╣
║ Total Requests:  $($totalRequests.ToString('N0'))                  
║ Total Errors:    $totalErrors
║ Duration:        $([math]::Round($duration, 2)) minutes
║ Success Rate:    $([math]::Round((($totalRequests - $totalErrors) / $totalRequests) * 100, 2))%
║ Requests/Min:    $([math]::Round($totalRequests / $duration, 0)).ToString('N0')
╚══════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

if ($totalErrors -eq 0) {
    Write-Host "🎉 PERFECT! Zero errors! Production ready!" -ForegroundColor Green
} elseif ($totalErrors -lt ($totalRequests * 0.01)) {
    Write-Host "✅ Great! Less than 1% errors!" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  Needs improvement. Check server logs." -ForegroundColor Red
}