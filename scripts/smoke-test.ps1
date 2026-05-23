param(
    [string]$GatewayUrl = "http://localhost:8080",
    [string]$FrontendUrl = "http://localhost:3000",
    [string]$AuthHealthUrl = "http://localhost:5006/actuator/health",
    [switch]$Help,
    [switch]$CheckCompose,
    [string]$Email,
    [string]$Password = "StrongPass@123",
    [ValidateSet("STUDENT", "TUTOR")]
    [string]$Role = "STUDENT",
    [string]$Otp
)

$ErrorActionPreference = "Stop"
$script:PassCount = 0
$script:FailCount = 0

function Add-Pass {
    param([string]$Message)
    $script:PassCount++
    Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Add-Fail {
    param([string]$Message)
    $script:FailCount++
    Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Add-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Get-StatusCodeFromException {
    param($Exception)

    try {
        if ($null -ne $Exception.Response -and $null -ne $Exception.Response.StatusCode) {
            return [int]$Exception.Response.StatusCode
        }
    } catch {
        return $null
    }

    return $null
}

function Test-Frontend {
    param([string]$Url)

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 20
        if ($response.StatusCode -eq 200) {
            Add-Pass "Frontend is reachable at $Url"
        } else {
            Add-Fail "Frontend returned unexpected status code: $($response.StatusCode)"
        }
    } catch {
        Add-Fail "Frontend check failed at $Url. $($_.Exception.Message)"
    }
}

function Test-AuthHealth {
    param([string]$Url)

    try {
        $result = Invoke-RestMethod -Method Get -Uri $Url -TimeoutSec 20
        if ($result.status -eq "UP") {
            Add-Pass "Auth service health is UP"
        } else {
            Add-Fail "Auth service health check returned status: $($result.status)"
        }
    } catch {
        Add-Fail "Auth health check failed at $Url. $($_.Exception.Message)"
    }
}

function Test-GatewayRouting {
    param([string]$BaseUrl)

    $url = "$BaseUrl/api/v1/profile/me"

    try {
        $null = Invoke-WebRequest -Method Get -Uri $url -UseBasicParsing -TimeoutSec 20
        Add-Fail "Gateway profile endpoint unexpectedly allowed anonymous access"
    } catch {
        $status = Get-StatusCodeFromException -Exception $_.Exception
        if ($status -eq 401 -or $status -eq 403) {
            Add-Pass "Gateway routes to auth service correctly (received $status on protected endpoint)"
        } elseif ($null -eq $status) {
            Add-Fail "Gateway routing check failed. Could not reach $url"
        } else {
            Add-Fail "Gateway routing check failed with unexpected status: $status"
        }
    }
}

function Test-Compose {
    Add-Info "Checking docker compose service status"

    try {
        $composeOutput = docker compose ps --format json | Out-String
        if ([string]::IsNullOrWhiteSpace($composeOutput)) {
            Add-Fail "Could not read docker compose status output"
            return
        }

        $services = $composeOutput | ConvertFrom-Json
        if ($services -isnot [System.Array]) {
            $services = @($services)
        }

        $required = @("frontend", "api-gateway", "auth-service", "usermanagment-api", "postgres", "rabbitmq")
        foreach ($name in $required) {
            $service = $services | Where-Object { $_.Service -eq $name } | Select-Object -First 1
            if ($null -eq $service) {
                Add-Fail "Service not found in compose output: $name"
                continue
            }

            $state = [string]$service.State
            if ($state -match "running") {
                Add-Pass "Service is running: $name"
            } else {
                Add-Fail "Service is not running: $name (state: $state)"
            }
        }
    } catch {
        Add-Fail "docker compose status check failed. $($_.Exception.Message)"
    }
}

function Test-OtpFlow {
    param(
        [string]$BaseUrl,
        [string]$TestEmail,
        [string]$TestPassword,
        [string]$TestRole,
        [string]$ProvidedOtp
    )

    Add-Info "Testing auth signup and OTP endpoints"

    $signupPayload = @{
        name     = "Smoke Test User"
        email    = $TestEmail
        password = $TestPassword
        role     = $TestRole
    } | ConvertTo-Json

    try {
        $signupResponse = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/auth/signup" -ContentType "application/json" -Body $signupPayload -TimeoutSec 30
        if ($signupResponse.success -eq $true) {
            Add-Pass "Signup endpoint responded successfully"
        } else {
            Add-Fail "Signup endpoint response indicates failure"
        }
    } catch {
        Add-Fail "Signup request failed. $($_.Exception.Message)"
        return
    }

    $resendPayload = @{ email = $TestEmail } | ConvertTo-Json
    try {
        $resendResponse = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/auth/resend-otp" -ContentType "application/json" -Body $resendPayload -TimeoutSec 30
        if ($resendResponse.success -eq $true) {
            Add-Pass "Resend OTP endpoint responded successfully"
        } else {
            Add-Fail "Resend OTP endpoint response indicates failure"
        }
    } catch {
        Add-Fail "Resend OTP request failed. $($_.Exception.Message)"
    }

    if ([string]::IsNullOrWhiteSpace($ProvidedOtp)) {
        Add-Info "OTP verification step skipped. Provide -Otp to complete full OTP validation."
        return
    }

    $verifyPayload = @{ email = $TestEmail; otp = $ProvidedOtp } | ConvertTo-Json
    try {
        $verifyResponse = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/auth/verify-otp" -ContentType "application/json" -Body $verifyPayload -TimeoutSec 30
        if ($verifyResponse.success -eq $true -and -not [string]::IsNullOrWhiteSpace($verifyResponse.data.accessToken)) {
            Add-Pass "Verify OTP endpoint returned auth session token"
        } else {
            Add-Fail "Verify OTP endpoint did not return expected auth session"
        }
    } catch {
        Add-Fail "Verify OTP request failed. $($_.Exception.Message)"
    }
}

Write-Host "MentorHub smoke test started" -ForegroundColor Yellow

if ($Help.IsPresent) {
    Write-Host "Usage examples:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File .\\scripts\\smoke-test.ps1"
    Write-Host "  powershell -ExecutionPolicy Bypass -File .\\scripts\\smoke-test.ps1 -CheckCompose"
    Write-Host "  powershell -ExecutionPolicy Bypass -File .\\scripts\\smoke-test.ps1 -Email 'your_test_email@example.com' -Role STUDENT"
    Write-Host "  powershell -ExecutionPolicy Bypass -File .\\scripts\\smoke-test.ps1 -Email 'your_test_email@example.com' -Role STUDENT -Otp '123456'"
    exit 0
}

if ($CheckCompose.IsPresent) {
    Test-Compose
}

Test-Frontend -Url $FrontendUrl
Test-AuthHealth -Url $AuthHealthUrl
Test-GatewayRouting -BaseUrl $GatewayUrl

if (-not [string]::IsNullOrWhiteSpace($Email)) {
    Test-OtpFlow -BaseUrl $GatewayUrl -TestEmail $Email -TestPassword $Password -TestRole $Role -ProvidedOtp $Otp
} else {
    Add-Info "Auth OTP flow skipped. Provide -Email to run signup and OTP endpoint checks."
}

Write-Host "" 
Write-Host "Smoke test summary: $PassCount passed, $FailCount failed" -ForegroundColor Yellow

if ($FailCount -gt 0) {
    exit 1
}

exit 0
