# =====================================================================
#  SharePoint 목록 8개를 한 번에 만드는 스크립트 (선택 사항)
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
    @('ExpectedHeadcount','Number'),@('AttendeeCount','Number'),@('FormsLink','Note'),@('AdminMemo','Note'),@('ConsentAt','DateTime'),
    @('FeedbackMailAt','DateTime'),@('Guides','Note')
))

New-ListWithFields 'VisitAttendees' @(
    @('RequestNo','Text'),@('JobTitle','Text'),@('Org','Text'),@('Email','Text'),@('CarNo','Text'),@('Jobs','Text'),
    @('ConsentAt','DateTime'),@('ResponseId','Text'),@('VisitDate','Date')
)

New-ListWithFields 'TourBusy' (@(@('DateKey','Text'),@('MonthKey','Text')) + $segments + @(@('Kind','Text'),@('Reason','Text')))

New-ListWithFields 'TourAdmins' @(@('Site','Text'))

# [PA 전용] 센터별 오시는 길(약도). Title = main(메가와이즈 · Lab) 또는 mtv(시화MTV). 웹은 apps-script/Code.gs 의 VISIT_GUIDE 상수
New-ListWithFields 'CenterGuides' @(
    @('Address','Text'),@('MapUrl','Text'),@('MapImageUrl','Text'),@('Parking','Text'),@('Meeting','Text'),@('MeetingTours','Text'),@('ArriveBefore','Number')
)

# [PA 전용] 투어 가이드 명단 (인솔자 · 운영 인원). Title = 이름, CanOperate = Y/N (N = 인솔자만). 웹은 src/admin/guideRoster.ts 에 고정
New-ListWithFields 'GuideRoster' @(@('RankTitle','Text'),@('CanOperate','Text'),@('SortOrder','Number'))

# 방명록 원본 (실명 · 실제 소속, 관리자만). Title = 이름. 웹은 guestbook 시트
New-ListWithFields 'Guestbook' @(
    @('Company','Text'),@('Team','Text'),@('Role','Text'),@('Rating','Number'),@('Message','Note'),@('Tour','Text'),
    @('Hidden','Text'),@('ConsentAt','DateTime'),@('Source','Text'),@('RequestNo','Text')
)
# [PA 전용] 방명록 공개용 (가명 값만, 전 직원 읽기). Title = 원본 Guestbook 의 ID. 웹은 서버가 가명 값만 내려 줌
New-ListWithFields 'GuestbookPublic' @(
    @('DisplayName','Text'),@('DisplayCompany','Text'),@('DisplayTeam','Text'),@('Role','Text'),@('Rating','Number'),
    @('Message','Note'),@('Tour','Text'),@('WrittenAt','DateTime')
)

# 자주 거르는 열에 인덱스 (목록이 커져도 빠르게)
foreach ($pair in @(@('VisitRequests','Title'),@('VisitRequests','ApplicantEmail'),@('VisitRequests','VisitDate'),
                    @('VisitAttendees','RequestNo'),@('TourBusy','MonthKey'),@('TourBusy','DateKey'),@('TourBusy','Title'),
                    @('GuestbookPublic','Title'),@('GuestbookPublic','WrittenAt'))) {
    $field = Get-PnPField -List $pair[0] -Identity $pair[1]
    $field.Indexed = $true; $field.Update()
}
Invoke-PnPQuery

# 참석자 개인정보 목록은 상속을 끊어 관리자만 보게 한다 (사이트 소유자 그룹만 남김)
Set-PnPList -Identity 'VisitAttendees' -BreakRoleInheritance -CopyRoleAssignments:$false
$owners = Get-PnPGroup -AssociatedOwnerGroup
Set-PnPListPermission -Identity 'VisitAttendees' -Group $owners.Title -AddRole 'Full Control'
Write-Host "VisitAttendees: 사이트 소유자 그룹만 접근하도록 바꿨습니다. 관리자를 소유자 그룹(또는 별도 그룹)에 추가하세요."
# 항목 수준 권한 (가이드 3-4)
#  - VisitRequests: 신청자는 자기 신청만 읽고 고친다 (관리자는 소유자 그룹이라 전체가 보임)
#  - TourBusy: 모두 읽고, 신청할 때 '대기' 행을 추가하며, 자기가 만든 행만 고칠 수 있다
#    (ReadSecurity 1 = 모든 항목, 2 = 자기 항목만 / WriteSecurity 1 = 모든 항목, 2 = 자기 항목만)
foreach ($pair in @(@('VisitRequests', 2, 2), @('TourBusy', 1, 2))) {
    $list = Get-PnPList -Identity $pair[0]
    $list.ReadSecurity = $pair[1]
    $list.WriteSecurity = $pair[2]
    $list.Update()
}
Invoke-PnPQuery

# 방명록 원본은 관리자만 (VisitAttendees 와 같은 방식). 작성은 흐름이 흐름 소유자 권한으로 저장하므로 작성자에게 권한이 없어도 된다.
Set-PnPList -Identity 'Guestbook' -BreakRoleInheritance -CopyRoleAssignments:$false
Set-PnPListPermission -Identity 'Guestbook' -Group $owners.Title -AddRole 'Full Control'
# 방명록 공개용은 모두 읽기, 고치기는 관리자(소유자)만
Set-PnPList -Identity 'GuestbookPublic' -BreakRoleInheritance -CopyRoleAssignments:$true
$members = Get-PnPGroup -AssociatedMemberGroup
Set-PnPListPermission -Identity 'GuestbookPublic' -Group $members.Title -RemoveRole 'Edit' -AddRole 'Read'
Write-Host "Guestbook: 소유자 그룹만, GuestbookPublic: 구성원은 읽기만 하도록 바꿨습니다."

Write-Host '완료'
