function New-StrongPassword {
    [CmdletBinding()]
    param(
        [int]$Length = 40,
        [switch]$NoSymbols
    )
    # Character sets (exclude easily confused chars)
    $upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    $lower = 'abcdefghijkmnopqrstuvwxyz'
    $digits = '23456789'
    $symbols = '!@#$%^&*()-_=+[]{}'
    $pool = if ($NoSymbols) { $upper + $lower + $digits } else { $upper + $lower + $digits + $symbols }
    if ($Length -lt 12) { throw 'Password length should be >= 12 for security.' }
    # Ensure at least one from each required set (except symbols if excluded)
    $required = @(
        $upper[(Get-Random -Max $upper.Length)],
        $lower[(Get-Random -Max $lower.Length)],
        $digits[(Get-Random -Max $digits.Length)]
    )
    if (-not $NoSymbols) { $required += $symbols[(Get-Random -Max $symbols.Length)] }
    $remaining = $Length - $required.Count
    $rest = -join ((1..$remaining) | ForEach-Object { $pool[(Get-Random -Max $pool.Length)] })
    $raw = ($required + ($rest.ToCharArray() | Sort-Object { Get-Random })) -join ''
    return $raw
}

