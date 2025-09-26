<#
notify-collaborators.ps1

Prints a concise set of commands and a templated message to notify project collaborators about the forced history rewrite.

This script does not send messages automatically — it prints the text for manual copy/paste into Slack, email, or chat.
#>

param(
    [string]$Remote = 'origin',
    [string]$Branch = 'main'
)

Write-Output "Important: a forced history rewrite was performed on this repository. Collaborators must re-sync their local clones to avoid working on the old history."
Write-Output ""
Write-Output "Recommended safe actions (pick one):"
Write-Output "1) Re-clone the repository (cleanest):"
Write-Output "   git clone git@github.com:bbasketballer75/theporadas_site.git"
Write-Output ""
Write-Output "2) Reset an existing clone to the rewritten main (will discard local unpushed commits):"
Write-Output "   git fetch $Remote && git reset --hard $Remote/$Branch"
Write-Output ""
Write-Output "If you have local work to keep, create a patch first:"
Write-Output "   git format-patch $Remote/$Branch..HEAD --stdout > my-unpublished-work.patch"
Write-Output "Or stash your changes:"
Write-Output "   git stash push -m 'pre-history-rewrite-$(Get-Date -Format yyyyMMdd)'
"

# Provide a templated Slack/email message
$template = @'
Hi team — please note we performed a forced history rewrite on the repository to remove sensitive data and a large accidental backup file.

Actions you must take (choose one):
- Re-clone the repository: git clone git@github.com:bbasketballer75/theporadas_site.git
- Or reset your local clone: git fetch origin && git reset --hard origin/main

If you have uncommitted or unpublished work, create a patch or stash it before resetting. If you need help, ping the repo maintainers.

Also: rotate any credentials you may have stored that were committed historically. See the SECURITY_NOTICE.md at the repo root for full instructions.

Thanks — the ops/security team.
'@

Write-Output "---- Copy/paste message for Slack or email ----"
Write-Output $template
Write-Output "---- End message ----"
Write-Output ""

# List recent authors to help target notifications
Write-Output "Recent contributors (last 6 months):"
try {
    $contributors = & git log --since='6 months ago' --format='%aN <%aE>' 2>$null | Sort-Object -Unique
    if ($contributors) { $contributors | ForEach-Object { Write-Output " - $_" } } else { Write-Output " (no recent contributors found or git unavailable)" }
}
catch {
    Write-Output " (git not available to list contributors)"
}
