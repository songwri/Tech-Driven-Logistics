# =====================================================================
#  SharePoint 목록 4개를 한 번에 만드는 스크립트 (선택 사항)
#  - PnP.PowerShell 2.x 이상 필요:  Install-Module PnP.PowerShell -Scope CurrentUser
#  - 회사 테넌트에 PnP 로그인용 Entra ID 앱 등록(ClientId)이 있어야 합니다.
#    없으면 IT 팀에 요청하거나, 가이드의 'CSV 로 목록 만들기' 방법을 쓰세요.
#  사용:  ./provision.ps1 -SiteUrl "https://회사.sharepoint.com/sites/TDLVisit" -ClientId "앱ID"
# =====================================================================
param(
    [Parameter(Mandatory = $true)][string]$SiteUrl,
    [Parameter(Mandatory = $true)][string]$ClientId
)

Connect-PnPOnline -Url $SiteUrl -Interactive -ClientId $ClientId

function New-ListWithFields($name, $fields) {
    if (-not (Get-PnPList -Identity $name -ErrorAction SilentlyContinue)) {
        New-PnPList -Title $name -Template GenericList -OnQuickLaunch | Out-Null
        Write-Host "목록 생성: $name"
    }
    foreach ($f in $fields) {
        $internal = $f[0]; $type = $f[1]
        if (Get-PnPField -List $name -Identity $internal -ErrorAction SilentlyContinue) { continue }
        switch ($type) {
            'Text'     { Add-PnPField -List $name -DisplayName $internal -InternalName $internal -Type Text -AddToDefaultView | Out-Null }
            'Note'     { Add-PnPField -List $name -DisplayName $internal -InternalName $internal -Type Note -AddToDefaultView | Out-Null }
            'Number'   { Add-PnPField -List $name -DisplayName $internal -InternalName $internal -Type Number -AddToDefaultView | Out-Null }
            'Date'     { Add-PnPFieldFromXml -List $name -FieldXml "<Field Type='DateTime' DisplayName='$internal' Name='$internal' StaticName='$internal' Format='DateOnly' />" | Out-Null }
            'DateTime' { Add-PnPField -List $name -DisplayName $internal -InternalName $internal -Type DateTime -AddToDefaultView | Out-Null }
        }
    }
}

$segments = @(@('CFrom','Number'),@('CTo','Number'),@('LFrom','Number'),@('LTo','Number'),@('MFrom','Number'),@('MTo','Number'))

New-ListWithFields 'VisitRequests' (@(
    @('Tour','Text'),@('TourName','Text'),@('VisitDate','Date'),@('DateKey','Text'),@('Slot','Text'),@('ScheduleText','Text')
) + $segments + @(
    @('ForMain','Text'),@('ForMtv','Text'),@('ApproveMain','Text'),@('ApproveMtv','Text'),@('Status','Text'),
    @('Category','Text'),@('ClientType','Text'),@('Company','Text'),@('Industry','Text'),@('Purpose','Text'),
    @('Language','Text'),@('Interpreter','Text'),@('InterpreterLanguage','Text'),
    @('HostName','Text'),@('HostTitle','Text'),@('HostDivision','Text'),@('HostOrg','Text'),@('HostPhone','Text'),
    @('HostEmail','Text'),@('ApplicantEmail','Text'),@('HostComment','Note'),
    @('ExpectedHeadcount','Number'),@('AttendeeCount','Number'),@('FormsLink','Note'),@('AdminMemo','Note'),@('ConsentAt','DateTime')
))

New-ListWithFields 'VisitAttendees' @(
    @('RequestNo','Text'),@('JobTitle','Text'),@('Org','Text'),@('Email','Text'),@('CarNo','Text'),@('Jobs','Text'),
    @('ConsentAt','DateTime'),@('ResponseId','Text'),@('VisitDate','Date')
)

New-ListWithFields 'TourBusy' (@(@('DateKey','Text'),@('MonthKey','Text')) + $segments + @(@('Kind','Text'),@('Reason','Text')))

New-ListWithFields 'TourAdmins' @(@('Site','Text'))

# 자주 거르는 열에 인덱스 (목록이 커져도 빠르게)
foreach ($pair in @(@('VisitRequests','Title'),@('VisitRequests','ApplicantEmail'),@('VisitRequests','VisitDate'),
                    @('VisitAttendees','RequestNo'),@('TourBusy','MonthKey'),@('TourBusy','DateKey'),@('TourBusy','Title'))) {
    $field = Get-PnPField -List $pair[0] -Identity $pair[1]
    $field.Indexed = $true; $field.Update()
}
Invoke-PnPQuery

# 참석자 개인정보 목록은 상속을 끊어 관리자만 보게 한다 (사이트 소유자 그룹만 남김)
Set-PnPList -Identity 'VisitAttendees' -BreakRoleInheritance -CopyRoleAssignments:$false
$owners = Get-PnPGroup -AssociatedOwnerGroup
Set-PnPListPermission -Identity 'VisitAttendees' -Group $owners.Title -AddRole 'Full Control'
Write-Host "VisitAttendees: 사이트 소유자 그룹만 접근하도록 바꿨습니다. 관리자를 소유자 그룹(또는 별도 그룹)에 추가하세요."
Write-Host '완료'
