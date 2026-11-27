# Build VISOLIS : télécharge le code depuis GitHub, puis lance les builds APK et AAB avec Expo.
# Lancement : double-clic sur build-visolis.bat (ou clic droit > Exécuter avec PowerShell).
$ErrorActionPreference = 'Stop'
$Repo   = 'https://github.com/maketo8338-code/App-primal.git'
$Branch = 'ccr-dfd32f45-eiv9jo'
$Dir    = Join-Path $HOME 'VISOLIS-build'

function Step($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Need($cmd, $wingetId, $name) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Step "Installation de $name"
    winget install -e --id $wingetId --accept-source-agreements --accept-package-agreements
    $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
  }
}

try {
  Need git 'Git.Git' 'Git'
  Need node 'OpenJS.NodeJS.LTS' 'Node.js'

  Step 'Récupération du code (une fenêtre GitHub peut s''ouvrir pour te connecter)'
  if (Test-Path (Join-Path $Dir '.git')) {
    git -C $Dir fetch origin $Branch
    git -C $Dir checkout -f $Branch
    git -C $Dir reset --hard "origin/$Branch"
  } else {
    git clone --branch $Branch --depth 1 $Repo $Dir
  }

  Set-Location (Join-Path $Dir 'primal-app')
  Step 'Installation des dépendances'
  npm install

  Step 'Connexion à Expo (compte reyflow)'
  npx --yes eas-cli whoami 2>$null
  if ($LASTEXITCODE -ne 0) { npx --yes eas-cli login }

  Step 'Build APK de test (15-20 min)'
  npx --yes eas-cli build -p android --profile preview --non-interactive

  Write-Host "`nInstalle l'APK (lien ci-dessus) et teste tous les écrans." -ForegroundColor Yellow
  $ok = Read-Host "Tout marche ? Taper O pour lancer l'AAB Google Play, autre touche pour arrêter"
  if ($ok -match '^[oO]') {
    Step 'Build AAB Google Play (15-20 min)'
    npx --yes eas-cli build -p android --profile production --non-interactive
    Write-Host "`nTélécharge l'AAB (lien ci-dessus) et envoie-le dans la Play Console, piste Alpha." -ForegroundColor Green
  }
} catch {
  Write-Host "`nERREUR : $($_.Exception.Message)" -ForegroundColor Red
  Write-Host 'Fais une capture de cette fenêtre et envoie-la à Claude.'
}
Read-Host "`nAppuie sur Entrée pour fermer"
