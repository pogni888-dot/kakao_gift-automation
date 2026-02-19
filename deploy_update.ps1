
# Deploy Update Script for LevyPlay
$ErrorActionPreference = "Stop"

$KeyFile = "ssh-key-2026-02-18 (1).key"
$ServerIP = "134.185.101.88"
$User = "ubuntu"
$ContainerName = "levyplay-container"
$RemoteTempDir = "~/levyplay_update_temp"

Write-Host "Starting deployment to $ServerIP..."

# 1. Fix SSH Key Permissions (Crucial for Windows)
Write-Host "Setting SSH key permissions..."
icacls "$KeyFile" /c /t /inheritance:d
icacls "$KeyFile" /c /t /grant "${env:USERNAME}:F"
icacls "$KeyFile" /c /t /remove "Administrator" "Authenticated Users" "Users"

# 2. Upload Files via SCP
Write-Host "Uploading updated files (auth.json, tests, config, dashboard)..."
# Create remote temp directory first
ssh -i "$KeyFile" -o StrictHostKeyChecking=no "${User}@${ServerIP}" "mkdir -p ${RemoteTempDir}"

# Copy auth.json
scp -i "$KeyFile" -o StrictHostKeyChecking=no "auth.json" "${User}@${ServerIP}:${RemoteTempDir}/auth.json"

# Copy playwright.config.ts
scp -i "$KeyFile" -o StrictHostKeyChecking=no "playwright.config.ts" "${User}@${ServerIP}:${RemoteTempDir}/playwright.config.ts"

# Copy tests folder
scp -i "$KeyFile" -o StrictHostKeyChecking=no -r "tests" "${User}@${ServerIP}:${RemoteTempDir}/"

# Copy dashboard build (dashboard/dist)
# Note: Renaming locally to avoid path issues, or just uploading the content
scp -i "$KeyFile" -o StrictHostKeyChecking=no -r "dashboard/dist" "${User}@${ServerIP}:${RemoteTempDir}/dashboard_dist"

# Copy server.js
scp -i "$KeyFile" -o StrictHostKeyChecking=no "server.js" "${User}@${ServerIP}:${RemoteTempDir}/server.js"

# 3. Apply to Docker Container via SSH
Write-Host "Applying updates to Docker container ($ContainerName)..."
$UpdateCommands = (@"
    echo "Updating container files with sudo..."
    # auth.json is bind-mounted, so we update the host file directly
    sudo cp ${RemoteTempDir}/auth.json /home/ubuntu/levyplay/auth.json
    
    # Update other files inside container
    sudo docker cp ${RemoteTempDir}/playwright.config.ts ${ContainerName}:/app/playwright.config.ts
    sudo docker cp ${RemoteTempDir}/tests ${ContainerName}:/app/
    
    echo "Updating dashboard build..."
    # Ensure destination directory exists (though docker cp usually handles it)
    # Remove old dist to be safe
    sudo docker exec ${ContainerName} rm -rf /app/dashboard/dist
    sudo docker cp ${RemoteTempDir}/dashboard_dist ${ContainerName}:/app/dashboard/dist
    sudo docker exec ${ContainerName} chmod -R 755 /app/dashboard/dist

    sudo docker cp ${RemoteTempDir}/server.js ${ContainerName}:/app/server.js

    echo "Restarting container..."
    sudo docker restart ${ContainerName}

    echo "Cleaning up temp files..."
    rm -rf ${RemoteTempDir}
    echo "Deployment Complete!"
"@) -replace "`r`n", "`n"

ssh -i "$KeyFile" -o StrictHostKeyChecking=no "${User}@${ServerIP}" "$UpdateCommands"

Write-Host "Success! The server has been updated."
