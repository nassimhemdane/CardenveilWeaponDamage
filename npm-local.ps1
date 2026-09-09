param([Parameter(ValueFromRemainingArguments=$true)][string[]]$NpmArguments)
$ErrorActionPreference = 'Stop'
$portable = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '.tools') -Directory -Filter 'node-*-win-x64' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($portable) {
  $env:PATH = $portable.FullName + [IO.Path]::PathSeparator + $env:PATH
  & (Join-Path $portable.FullName 'npm.cmd') @NpmArguments
} else {
  & npm.cmd @NpmArguments
}
exit $LASTEXITCODE
