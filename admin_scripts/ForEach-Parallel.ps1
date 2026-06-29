<#
.SYNOPSIS
    Parallel for-each, using PowerShell runspaces.
.DESCRIPTION
    Parallel for-each, using PowerShell runspaces.
 
.PARAMETER Items
    The items for which to execute the ScripBlock.
.PARAMETER ScripBlock
    The script-block to execute for each item.
.PARAMETER ArgumentList
    The arguments that will be passed to the scriptblock.
.PARAMETER MaxRunspaces
    The maximum number of runspaces (to attempt) to run in parallel.
    The actual number of runspaces executing in parallel is determined by the runtime and is e.g. limited by available cores.
    Default is 16.
.PARAMETER WaitTimeout
    The time to wait for each runspace to complete, in milliseconds.
    Default is 1 hour.
#>
function ForEach-Parallel {
    [Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSUseApprovedVerbs', '', Justification = 'The used verb makes the most sense in this case.')]
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true, ValueFromPipeline = $true)]
        [Array]$Items,

        [Parameter(Mandatory = $true)]
        [scriptblock]$ScriptBlock,

        [Parameter(Mandatory = $false)]
        [Object[]]$ArgumentList,

        [Parameter(Mandatory = $false)]
        [int]$MaxRunspaces = 16,

        [Parameter(Mandatory = $false)]
        [int]$WaitTimeout = (60 * 60 * 1000)
    )

    if ($Input) {
        try {
            # create the optional argument- & parameter-lists to be used in the script-block
            $arguments = ''
            $parameters = ''
            if ($ArgumentList) {
                for ($index = 0; $index -lt $ArgumentList.Length; $index++) {
                    $arguments += ", `$$index"
                    $parameters += " `$$index"
                }
            }

            # create the script-block to be executed
            # - the provided script-block is wrapped, so the provided arguments (ArgumentList) can be passed along with the current item ($_)
            # - the current module is always loaded
            $scriptText = 
@"
[CmdletBinding()]
param (`$_$arguments)
 
function Wrapper {
$ScriptBlock
}
 
Wrapper $parameters
"@

            $sessionState = [System.Management.Automation.Runspaces.InitialSessionState]::CreateDefault()

            # providing the current host makes the output of each runspace show up in the current host
            $pool = [runspacefactory]::CreateRunspacePool(1, $MaxRunspaces, $sessionState, $Host)
            $pool.Open()

            # create a new runspace for each item
            $runspaces = @()
            $asyncResults = @()
            $exceptions = @()
            foreach ($item in $Input) {
                $runspace = [powershell]::create()
                $runspace.RunSpacePool = $pool
                $runspaces += $runspace

                $runspace.Streams.Error.add_DataAdded({
                    Param (
                        [Object]$sender,
                        [System.Management.Automation.DataAddedEventArgs]$e
                    )

                    foreach ($item in $sender.ReadAll()) {
                        throw "$($item.Exception.Message)"
                    }
                })

                # add the generated script-block, passing the current item and optional arguments
                [void]$runspace.AddScript($scriptText)
                [void]$runspace.AddArgument($item)
                if ($ArgumentList) {
                    [void]$runspace.AddParameters($ArgumentList)
                }
                # pass the Verbose-parameter
                [void]$runspace.AddParameter('Verbose', $VerbosePreference -eq 'Continue')

                # start the runspace synchronously
                $asyncResult = $runspace.BeginInvoke()
                $asyncResults += $asyncResult
            }

            # wait for all runspaces to finish
            for ($index = 0; $index -lt $asyncResults.Length; $index++) {  
                $null = [System.Threading.WaitHandle]::WaitAll($asyncResults[$index].AsyncWaitHandle, $WaitTimeout)
            }

            # retrieve the result of each runspace
            $errors = @()
            for ($index = 0; $index -lt $asyncResults.Length; $index++) {  
                $asyncResult = $asyncResults[$index]
                $runspace = $runspaces[$index]

                # if needed, the following properties provide details of the runspace completion-status
                # $runspace.InvocationStateInfo.State
                # $runspace.InvocationStateInfo.Reason

                try {
                    Write-Output ($runspace.EndInvoke($asyncResult))
                }
                catch {
                    # collect each error, so they can be provided as a single error
                    $errors += $_
                }  
            }
        }
        finally {
            if ($pool) {
                $pool.Close()
            }
        }

        # handle the error(s)
        if ($errors) {
            if($errors.Length -eq 1) {
                throw $errors[0]
            }
            else {
                $exceptions = [exception[]]($errors).Exception
                throw (New-Object AggregateException -ArgumentList "One or more errors occurred:`n$([string]::Join("`n", $exceptions.Message))",$exceptions)
            }
        }
    }
}
