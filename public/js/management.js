{
	// 새로운 프로젝트 생성 팝업
	let $newBtn = $(".new-button");
	let $blackground = $(".blackground");
	let $popupCancel = $(".popup-cancel");

	$newBtn.on("click", function(){
	    $blackground.fadeIn(300);
	});
	$popupCancel.on("click", function(){
	    $blackground.fadeOut(100);
	});

	//프로젝트 타입 선택 fadeIn, fadeOut 효과
	let $projectType = $(".project-type");
	let $hideProjectType = $(".hide-project-type");

	$projectType.on("click", function(){
	    if($hideProjectType.css("display") == "none"){
	        $hideProjectType.fadeIn(300);
	    }else{
	        $hideProjectType.fadeOut(300);
	    }
	});


	// 아바타 이미지 클릭시 공유프로젝트 대기 목록 fadeIN, fadeOut
	let $userAvatar = $(".user-avatar");
	let $waitShare = $(".wait-share");

	$userAvatar.on("click", function(){
		if($waitShare.css("display") == "none"){
			$waitShare.fadeIn(300);
		}else{
			$waitShare.fadeOut(200);
		}
	});
}