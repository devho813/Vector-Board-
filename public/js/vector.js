 /* 한글입력 방지 */
 function fn_press_han(obj){
 	//좌우 방향키, 백스페이스, 딜리트, 탭키에 대한 예외
 	if(event.keyCode == 8 || event.keyCode == 9 || event.keyCode == 37 || event.keyCode == 39
 		|| event.keyCode == 46 ) return;
 		obj.value = obj.value.replace(/[\ㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
 }

 (function(){
 	// 도구 클릭시 border 생성 
 	// 펜 색상, 링크, 비디오 클릭시 숨겨져있는 div 박스의 display 변환
 	var $tools = $(".toolBox > li > img");
 	var $toolsESC = $("img.hide-esc");
 	var $hideTools = $(".pen-hide, .link-hide, .video-hide");
 	var $penColor = $(".pen-option > li");

 	$tools.on("click", function(e){
 		$tools.css("border", "none");
 		$(this).css("border", "2px dashed white");

 		if($(this).parent().prop("id") == "toolPen" || $(this).parent().prop("id") == "toolLink" || $(this).parent().prop("id") == "toolVideo"){

 			if(($(this).nextAll("div.hide")).css("display") == "none"){   
 				$hideTools.css("display", "none");
 				$(this).nextAll("div.hide").fadeIn(500);
 			}else{
 				$(this).nextAll("div.hide").fadeOut(300);
 			}

 		}else{
 			$hideTools.fadeOut(500);
 		}
 	});

 	// 툴 취소 버튼 클릭시
 	$toolsESC.on("click", function(){
 		if(!($(this).parent().prop("class") == "pen-hide")){
 			$tools.css("border", "none");
 		}
 		$hideTools.fadeOut(500);
 	});

    // 프로젝트 INFO 아이콘 클릭시 fadeIn, fadeOut 효과
    let $projectInfo = $(".project-info");
    let $projectDes = $(".project-description");

    $projectInfo.on("click", function(){
    	if($projectDes.css("display") === "none"){
    		$projectDes.fadeIn(500);
    	}else{
    		$projectDes.fadeOut(200);
    	}
    });

    // 공유하기 버튼 클릭시 fadeIn, fadeOut 효과
    var $shareBtn = $(".share-button");
    var $shareHide = $(".share-hide");

    $shareBtn.on("click", function(){
    	if($shareHide.css("display") === "none"){
    		$shareHide.fadeIn(500);
    	}else{
    		$shareHide.fadeOut(200);
    	}
    });

    // vector 페이지 로딩 화면 제거
    setTimeout(function(){
        $(".vector-loading").remove();            
    },3000);
})();