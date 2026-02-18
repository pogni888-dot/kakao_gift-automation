
# Deploy Update Script for LevyPlay
$ErrorActionPreference = "Stop"

$KeyFile = "ssh-key-2026-02-15.key"
$ServerIP = "168.107.4.197"
$User = "ubuntu"
$ContainerName = "my-dashboard"
$RemoteTempDir = "~/levyplay_update_temp"

Write-Host "Starting deployment to $ServerIP..."

# 1. Fix SSH Key Permissions (Crucial for Windows)
Write-Host "Setting SSH key permissions..."
icacls $KeyFile /c /t /inheritance:d
icacls $KeyFile /c /t /grant "${env:USERNAME}:F"
icacls $KeyFile /c /t /remove "Administrator" "Authenticated Users" "Users"

# 2. Upload Files via SCP
Write-Host "Uploading updated files (auth.json, tests, config)..."
# Create remote temp directory first
ssh -i $KeyFile -o StrictHostKeyChecking=no "${User}@${ServerIP}" "mkdir -p ${RemoteTempDir}"

# Copy auth.json
scp -i $KeyFile -o StrictHostKeyChecking=no "auth.json" "${User}@${ServerIP}:${RemoteTempDir}/auth.json"

# Copy playwright.config.ts
scp -i $KeyFile -o StrictHostKeyChecking=no "playwright.config.ts" "${User}@${ServerIP}:${RemoteTempDir}/playwright.config.ts"

# Copy tests folder
scp -i $KeyFile -o StrictHostKeyChecking=no -r "tests" "${User}@${ServerIP}:${RemoteTempDir}/"

# 3. Apply to Docker Container via SSH
Write-Host "Applying updates to Docker container ($ContainerName)..."
$UpdateCommands = @"
    echo "Updating container files with sudo..."
    sudo docker cp ${RemoteTempDir}/auth.json ${ContainerName}:/app/auth.json
    sudo docker cp ${RemoteTempDir}/playwright.config.ts ${ContainerName}:/app/playwright.config.ts
    sudo docker cp ${RemoteTempDir}/tests ${ContainerName}:/app/
    echo "Cleaning up temp files..."
    rm -rf ${RemoteTempDir}
    echo "Deployment Complete!"
"@

ssh -i $KeyFile -o StrictHostKeyChecking=no "${User}@${ServerIP}" "$UpdateCommands"

Write-Host "Success! The server has been updated."
