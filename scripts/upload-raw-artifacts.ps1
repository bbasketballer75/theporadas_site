<#
upload-raw-artifacts.ps1

Uploads a folder of raw scan artifacts to a configured cloud storage provider.

Usage (recommended):
  ./scripts/upload-raw-artifacts.ps1 -ArtifactsPath security-scans/raw -Provider aws -Bucket my-bucket

Notes:
- This script intentionally is opt-in. Do NOT wire it into workflows unless you have a secure bucket and the required secrets.
- For AWS provider the script uses the AWS CLI. The runner MUST have AWS credentials via environment variables or an IAM role.
- For GCS provider the script uses gsutil; the runner must have gcloud configured or credentials available.
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$ArtifactsPath,

    [Parameter(Mandatory = $true)]
    [ValidateSet('aws', 'gcs')]
    [string]$Provider,

    [Parameter(Mandatory = $true)]
    [string]$Bucket,

    [string]$Region = 'us-east-1'
)

if (-not (Test-Path $ArtifactsPath)) {
    Write-Error "Artifacts path not found: $ArtifactsPath"; exit 2
}

switch ($Provider) {
    'aws' {
        Write-Output "Uploading $ArtifactsPath to s3://$Bucket/"
        # aws cli must be available on the runner
        $awsCmd = "aws s3 cp --recursive --acl private --region $Region `"$ArtifactsPath`" s3://$Bucket/"
        Write-Output "Running: $awsCmd"
        Invoke-Expression $awsCmd
        if ($LASTEXITCODE -ne 0) { Write-Error "AWS CLI upload failed with exit code $LASTEXITCODE"; exit $LASTEXITCODE }
    }
    'gcs' {
        Write-Output "Uploading $ArtifactsPath to gs://$Bucket/"
        $gsCmd = "gsutil -m cp -r `"$ArtifactsPath/*`" gs://$Bucket/"
        Write-Output "Running: $gsCmd"
        Invoke-Expression $gsCmd
        if ($LASTEXITCODE -ne 0) { Write-Error "gsutil upload failed with exit code $LASTEXITCODE"; exit $LASTEXITCODE }
    }
}

Write-Output "Upload completed."
