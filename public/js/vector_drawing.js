// vector drawing javascript
// 벡터 보드 - 이찬호 

// SVG파일 저장, 프린트, 슬라이드 쇼
function outputSetting(paper){
    let $saveSVG = $("#saveSVG");
    let $printing = $("#printing");
    let $slideShow = $("#slideShow");

    // svg 아이콘 클릭시 svg 파일 다운로드
    $saveSVG.on("click", () => {
        let svgString = paper.toSVG();
        let a = document.createElement('a');
        a.download = projectName+".svg";
        a.type = 'image/svg+xml';
        blob = new Blob([svgString], {"type": "image/svg+xml"});
        a.href = (window.URL || webkitURL).createObjectURL(blob);
        if (confirm('해당 프로젝트를 SVG형식으로 다운로드 받습니다')) {
            // Save it!
            a.click();
        }
    });

    // 풀 스크린 슬라이드 쇼
    $slideShow.on("click", function(){
        var element = document.getElementById("workSpace");
        if(element.requestFullScreen) {
            element.requestFullScreen();
        } else if(element.webkitRequestFullScreen ) {
            element.webkitRequestFullScreen();
        } else if(element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen(); // IE
        }
    });
}



$(window).on("pageshow", function(){
    var workSpace = document.getElementById("workSpace");
    var paper = Raphael(workSpace, "100%", "100%");
    outputSetting(paper); // SVG output 처리 함수
    var paperBackground = paper.rect(0,0,"100%","100%");
    paperBackground.attr({
        // paperBackground 속성
        fill: "white",
        stroke: "none"
    });

    var initialSet = paper.set(); // 요소(SVG) 그룹화를 위한 유사배열 선언
    var dragBox; // 드래그 박스
    var selectBox = null; // 선택된 요소(SVG)들의 테두리 박스
    var sizeBox = null; // 선택된 요소(SVG)들의 사이즈 조절 박스
    var removeBox = null; // 선택된 요소(SVG) 제거를 위한 박스
    var selectElement = paper.set(); // 선택된 요소(SVG) 저장

    var svgElement = null; // SVG 요소 저장
    var svgType = "hand"; // 현재 도구 종류 - 펜, 이미지, 동영상..
    var pathArray = null; // 패스 경로
    var pathOption = {
        strokeWidth: 2,
        stroke: "#000000"
    };

    var editText = null; // 수정되고 있는 text 요소 변수
    var textOption = {
        fill: "#000000",
        fontSize: "40px"
    };
    var $tools = $(".toolBox > li");
    var $penOption = $(".pen-option > li");

    // 초기 SVG 불러오기
    $.ajax({
        type: "GET",
        url: "/project/"+pid+"/project.svg",
        dataType: "xml",
        success: function(svgXML) {
            initialSet = paper.importSVG(svgXML);
        }
    });

    /*************************************
                클라이언트 소켓
    **************************************/
    // socket.io 서버에 접속
    var socket = io();

    // 서버로 자신의 정보를 전송
    socket.emit("access", {
        email: userEmail,
        name: userName
    });

    // 서버로부터의 접근한 유저 정보를 받고 화면에 유저 정보를 뿌려줌
    socket.on("access", function(data) {
        $(".participant-list").empty();
        for(var i = 0; i<data.length; i++)
            $(".participant-list").prepend("<li><img src='/images/user_avatar.jpg'><span>"+data[i][1]+"</span></li>");
    });


    socket.on("updateSVG", function(data) {
        // SVG 업데이트
        $.ajax({
            type: "GET",
            url: "/project/"+pid+"/project.svg",
            dataType: "xml",
            success: function(svgXML) {
                paper.clear();

                // 백그라운드 재 생성 
                var paperBackground = paper.rect(0,0,"100%","100%");
                paperBackground.attr({
                    // paperBackground 속성
                    fill: "white",
                    stroke: "none"
                });

                // 배경 클릭시
                paperBackground.click(function(e) {
                    // text 요소 수정중에 배경을 클릭시
                    if(editText){
                        editText.inlineTextEditing.stopEditing();
                        editText = null;
                    }
                    
                    selectElement = paper.set();
                    initialSet.attr("opacity", 1);
                });

                paperBackground.drag(moveBackGround, startBackGround, upBackGround);

                initialSet = paper.importSVG(svgXML);
            }
        });
    });


    // notice 타이밍 함수 (전역)
    var noticeTiming = null;

    // 프로젝트 수정자 알림
    socket.on("updateModifier", function(data) {
        var email = data.email;
        var name = data.name;
        var $noticeWrap = $(".notice-modifier");
        var $noticeContent = $(".notice-content");

        $noticeContent.text(email+" ("+name+") 님이 프로젝트를 수정하였습니다.");
        $noticeWrap.css("bottom", "0");

        clearTimeout(noticeTiming);
        noticeTiming = setTimeout(function(){
            $noticeWrap.css("bottom", "-35px");
        }, 3500);
    });


    // 이미지 첨부하기
    var $imageAddress = $("#linkAddress");
    var $imageBtn = $("#linkBtn");

    $imageBtn.on("click", function(){
        // 이미지 소스 기존 크기 유지를 위한 선언
        var img = new Image();
        img.src = $imageAddress.val();

        if(img.width > 0){
            // 입력한 이미지 링크 주소가 유효한 주소일때
            svgElement = paper.image(img.src, 10, 10, img.width, img.height);
            initialSet.push(svgElement); // 해당 요소 initialSet에 저장 (나중에 그룹화 후 선택을 위해서)

            // SVG 파일 최신화 
            var svgString = paper.toSVG();

            socket.emit("updateSVG", {
                email: userEmail,
                name: userName,
                pid: pid,
                viewBoxWidth: workSpace.offsetWidth,
                viewBoxHeight: workSpace.offsetHeight,
                svgString: svgString
            });
        }else{
            alert("유효하지 않은 이미지 주소입니다. 이미지 주소를 정확히 입력해주세요");
        }

        $imageAddress.val("").focus();     
    });

    // 동영상 첨부하기
    var $videoAddress = $("#videoAddress");
    var $videoBtn = $("#videoBtn");

    $videoBtn.on("click", function(){
        alert("아직 비디오 첨부를 지원하지 않습니다.");
    });
   

    // 도구 선택
    $tools.on("click", function(){
        switch($(this).prop("id")){
            case "toolHand":
                svgType = "hand";
                workSpace.style.cursor = "pointer"; // 마우스 커서 변경 - 손모양
                // for(var i in ft){
                //     ft[i].showHandles();
                // }
                break;
            case "toolPen":
                svgType = "pen";
                workSpace.style.cursor = 'url("/images/cursor_pen.png"), auto'; // 마우스 커서 변경 - 펜모양
                // for(var i in ft){
                //     ft[i].hideHandles();
                // }
                break;
            case "toolText":
                svgType = "text";
                workSpace.style.cursor = 'url("/images/cursor_text.png") 50 10, auto'; // 마우스 커서 변경 - 텍스트
                break;
            case "toolMemo":
                svgType = "memo";
                workSpace.style.cursor = 'url("/images/cursor_memo.png"), auto'; // 마우스 커서 변경 - 메모지모양
                break;
            case "toolLink":
                svgType = "link";
                workSpace.style.cursor = "default"; // 마우스 커서 변경 - dafault
                break;
            case "toolVideo":
                svgType = "video";
                workSpace.style.cursor = "default"; // 마우스 커서 변경 - dafault
                break;
        }
    });

    // 펜 옵션 설정
    $penOption.on("click", function(){
        switch($(this).prop("id")){
            case "redPen":
                pathOption.stroke = "#ff6160";
                break;
            case "yellowPen":
                pathOption.stroke = "#fff613";
                break;
            case "greenPen":
                pathOption.stroke = "#71ff78";
                break;
            case "skyBluePen":
                pathOption.stroke = "#54b4fe";
                break;
            case "blackPen":
                pathOption.stroke = "#212b2c";
                break;
            case "penSizeUp":
                pathOption.strokeWidth++;
                // 펜 굵기 최대 70으로 설정
                if(pathOption.strokeWidth > 70){
                    pathOption.strokeWidth = 70;
                }
                break;
            case "penSizeDown":
                pathOption.strokeWidth--;
                // 펜 굵기 최소 1으로 설정
                if(pathOption.strokeWidth < 1){
                    pathOption.strokeWidth = 1;
                }
                break;
        }
    });

    var startBackGround = function (x, y, event) {
        switch(svgType){
            // 도구 : 손
            case "hand": 
                dragBox = paper.rect(event.offsetX, event.offsetY, 0, 0).attr({
                    "class": "dasharray-box",
                    "stroke": "#00F",
                    "stroke-width": "0.5",
                    "stroke-opacity": "0.9",
                    "fill": "#00F",
                    "fill-opacity": "0.1"
                });

                selectBox.remove(); // 선택된 요소(SVG)를 감싸고 있는 박스 제거
                sizeBox.remove(); // 선택된 요소(SVG) 사이즈 조절 박스 제거
                removeBox.remove(); // 선택된 요소(SVG) 제거 박스 제거

                //reset
                selectElement = paper.set();
                initialSet.attr("opacity", 1);

                break;

            // 도구 : 펜
            case "pen": 
                pathArray = new Array();

                pathArray[0] = ["M", event.offsetX, event.offsetY];
                svgElement = paper.path(pathArray);
                svgElement.attr({
                    stroke: pathOption.stroke,
                    "stroke-width": pathOption.strokeWidth
                });
                break;
        }
    };

    var moveBackGround = function (dx, dy, x, y, event) {
        switch(svgType){
            // 도구 : 손
            case "hand": 
                var xoffset = 0,
                yoffset = 0;
                if(dx < 0){
                    xoffset = dx;
                    dx = -1 * dx;
                }
                if(dy < 0){
                    yoffset = dy;
                    dy = -1 * dy;
                }
                dragBox.transform("T" + xoffset + "," + yoffset);
                dragBox.attr("width", dx);    
                dragBox.attr("height", dy);

                break;

            // 도구 : 펜
            case "pen":
                if(event.target.nodeName === "circle" || event.target.nodeName === "rect" ||  event.target.nodeName === "path" || event.target.nodeName === "image"){
                    pathArray[pathArray.length] =["L", event.offsetX, event.offsetY];
                    svgElement.attr({path: pathArray});
                }
            break;
        }
    };

    var upBackGround = function (event) {
        switch(svgType){
            // 도구 : 손
            case "hand": 
                //selectElement의 정보를 얻는다.
                var bounds = dragBox.getBBox();
                dragBox.remove();

                for (var i in initialSet.items) {
                    // 제거된 element 제외
                    if(initialSet[i][0] === null){
                        continue;
                    }

                    var elementBounds = initialSet[i].getBBox();
                    if (elementBounds.x >= bounds.x && elementBounds.x <= bounds.x2 || elementBounds.x2 >= bounds.x && elementBounds.x2 <= bounds.x2) {
                        if (elementBounds.y >= bounds.y && elementBounds.y <= bounds.y2 || elementBounds.y2 >= bounds.y && elementBounds.y2 <= bounds.y2) {
                            selectElement.push(initialSet[i]); 
                        }
                    }
                    selectElement.attr("opacity", 0.5);
                }


                // 선택된 요소(SVG)들 box로 감싸기
                // getBBox() --> 요소 정보 추출
                // sb --> selectBox 약자

                if(selectElement.length){
                    var sbX = selectElement.getBBox().x;
                    var sbY = selectElement.getBBox().y;
                    var sbWidth = selectElement.getBBox().width;
                    var sbHeight = selectElement.getBBox().height;


                    selectBox = paper.rect(sbX-3, sbY-3, sbWidth+6, sbHeight+6).attr({
                        "class": "dasharray-box",
                        "stroke": "#00F",
                        "stroke-width": "0.5",
                        "stroke-opacity": "0.9",
                        "fill": "rgba(255, 255, 255, 0)"
                    });

                    // 선택 요소에 마우스를 올렸을시 커서 all-scroll로 변경
                    selectBox.mouseover(function(e){
                        this.attr("cursor", "all-scroll");
                    });

                    // selectBox 더블 클릭시 
                    selectBox.dblclick(function(e){
                        this.remove();
                        sizeBox.remove();
                        removeBox.remove();
                    });

                    // selectBox 드래그시 선택된 요소 이동
                    selectBox.drag(moveSelect, startSelect, upSelect);


                    // sizeBox 드래그시 선택된 요소 크기 변경
                    sizeBox = paper.image("/images/resize.png",sbX+sbWidth-10, sbY+sbHeight-10, 25, 25);
                    sizeBox.mouseover(function(e){
                        this.attr("cursor", "nwse-resize");
                    });

                    sizeBox.drag(moveSizeBox, startSizeBox, upSizeBox);


                    // 요소 제거를 위한 removeBox
                    removeBox = paper.image("/images/remove_icon.png", sbX+sbWidth-40, sbY+sbHeight-10, 25, 25);
                    removeBox.mouseover(function(e){
                        this.attr("cursor", "pointer");
                    });

                    // removeBox 버튼 클릭시 선택된 요소 제거
                    removeBox.click(function(){
                        selectBox.remove();
                        initialSet.attr("opacity", 1);
                        this.remove();
                        sizeBox.remove();

                        selectElement.forEach(function(el){
                            el.remove(); 
                        });

                        selectElement = null;

                        // SVG 파일 최신화 
                        var svgString = paper.toSVG();
                        socket.emit("updateSVG", {
                            email: userEmail,
                            name: userName,
                            pid: pid,
                            viewBoxWidth: workSpace.offsetWidth,
                            viewBoxHeight: workSpace.offsetHeight,
                            svgString: svgString
                        });
                    });
                }
                break;

            // 도구 : 펜
            case "pen":
                initialSet.push(svgElement); // 해당 요소 initialSet에 저장
                svgElement = null;

                // SVG 파일 최신화              
                var svgString = paper.toSVG();
                socket.emit("updateSVG", {
                    email: userEmail,
                    name: userName,
                    pid: pid,
                    viewBoxWidth: workSpace.offsetWidth,
                    viewBoxHeight: workSpace.offsetHeight,
                    svgString: svgString
                });
                break;

            // 도구 : 텍스트
            case "text": 

                svgElement = paper.text(event.offsetX, event.offsetY, 'TEXT').attr({
                    fill: textOption.fill,
                    "font-size": textOption.fontSize
                });

                // text 요소 수정을 위한 초기화
                paper.inlineTextEditing(svgElement);

                // Start inline editing on click
                svgElement.click(function(){
                    if(svgType !== "hand"){
                        return;
                    }

                    editText = this;
                    // Retrieve created <input type=text> field
                    var input = this.inlineTextEditing.startEditing();

                    input.addEventListener("blur", function(e){
                        // 포커스를 잃으면 수정 중단
                        editText.inlineTextEditing.stopEditing();
                        editText = null;
                    }, true);

                    input.addEventListener("keydown", function(event){
                        // 엔터키를 눌르면 수정 중단
                        if(event.keyCode == 13){
                            editText.inlineTextEditing.stopEditing();
                            editText = null;

                            // SVG 파일 최신화 
                            var svgString = paper.toSVG();
                            socket.emit("updateSVG", {
                                email: userEmail,
                                name: userName,
                                pid: pid,
                                viewBoxWidth: workSpace.offsetWidth,
                                viewBoxHeight: workSpace.offsetHeight,
                                svgString: svgString
                            });
                        }
                    }, true);
                });

                initialSet.push(svgElement); // 해당 태그 initialSet에 저장
                svgElement = null;

                // SVG 파일 최신화                
                var svgString = paper.toSVG();
                socket.emit("updateSVG", {
                    email: userEmail,
                    name: userName,
                    pid: pid,
                    viewBoxWidth: workSpace.offsetWidth,
                    viewBoxHeight: workSpace.offsetHeight,
                    svgString: svgString
                });
                break;

            case "memo":
                svgElement = paper.rect(event.offsetX, event.offsetY, 120, 120).attr({
                    fill: "#ffff99",
                    "stroke-width": 0
                });

                initialSet.push(svgElement); // 해당 태그 initialSet에 저장

                // 메모장 내부에 텍스트도 같이 추가
                svgElement = paper.text(event.offsetX+40, event.offsetY+15, 'memo').attr({
                    fill: textOption.fill,
                    "font-size": "15px"
                });

                // text 요소 수정을 위한 초기화
                paper.inlineTextEditing(svgElement);

                // Start inline editing on click
                svgElement.click(function(){
                    if(svgType !== "hand"){
                        return;
                    }

                    editText = this;
                    // Retrieve created <input type=text> field
                    var input = this.inlineTextEditing.startEditing();

                    input.addEventListener("keydown", function(event){
                        // 엔터키를 눌르면 수정 중단
                        if(event.keyCode == 13){
                            editText.inlineTextEditing.stopEditing();
                            editText = null;

                            // SVG 파일 최신화 
                            var svgString = paper.toSVG();
                            socket.emit("updateSVG", {
                                email: userEmail,
                                name: userName,
                                pid: pid,
                                viewBoxWidth: workSpace.offsetWidth,
                                viewBoxHeight: workSpace.offsetHeight,
                                svgString: svgString
                            });
                        }
                    }, true);
                });

                initialSet.push(svgElement); // 해당 태그 initialSet에 저장
                svgElement = null;


                // SVG 파일 최신화 
                var svgString = paper.toSVG();
                socket.emit("updateSVG", {
                    email: userEmail,
                    name: userName,
                    pid: pid,
                    viewBoxWidth: workSpace.offsetWidth,
                    viewBoxHeight: workSpace.offsetHeight,
                    svgString: svgString
                });
            break;
        }
    };

    // 선택된 요소(SVG) 이동 및 크기 변환을 위해 사용될 변수
    var odx = 0; // original dx
    var ody = 0; // original dy

    /**********************************
        Select Box drag event function
    ***********************************/

    // 선택된 요소 이동 이벤트 함수 - start
    function startSelect(){
        this.ox = this.attr("x");
        this.oy = this.attr("y");
        sizeBox.ox = sizeBox.attr("x");
        sizeBox.oy = sizeBox.attr("y");
        removeBox.ox = removeBox.attr("x");
        removeBox.oy = removeBox.attr("y");
    }

    // 선택된 요소 이동 이벤트 함수 - move
    function moveSelect(dx, dy){
        var selectBox_x = this.ox + dx; // selectBox x
        var selectBox_y = this.oy + dy; // selectBox y
        var sizeBox_x = sizeBox.ox + dx; // sizeBox x
        var sizeBox_y = sizeBox.oy + dy; // sizeBox y
        var removeBox_x = removeBox.ox + dx; // removeBox x
        var removeBox_y = removeBox.oy + dy; // removeBox y

        this.attr({
            x: selectBox_x,
            y: selectBox_y
        });

        sizeBox.attr({
            x: sizeBox_x,
            y: sizeBox_y
        });

        removeBox.attr({
            x: removeBox_x,
            y: removeBox_y
        });

        selectElement.transform('...T' + [dx-odx, dy-ody]);
        odx = dx;
        ody = dy;
    }
    // 선택된 요소 이동 이벤트 함수 - up
    function upSelect(){
        odx = 0;
        ody = 0;

        sizeBox.remove();
        removeBox.remove();
        this.remove();
        initialSet.attr("opacity", 1);

        // SVG 파일 최신화 
        var svgString = paper.toSVG();
        socket.emit("updateSVG", {
            email: userEmail,
            name: userName,
            pid: pid,
            viewBoxWidth: workSpace.offsetWidth,
            viewBoxHeight: workSpace.offsetHeight,
            svgString: svgString
        });
    }


    /**********************************
        Size Box drag event function
    ***********************************/

    function startSizeBox(){
        this.ox = this.attr("x");
        this.oy = this.attr("y");
        selectBox.width = selectBox.attr("width");
        selectBox.height = selectBox.attr("height");
        selectBox.attr({
            "stroke-width": 0
        });

        removeBox.remove();
    }

    function moveSizeBox(dx, dy){
        var sizeBox_x = this.ox + dx; // sizeBox x
        var sizeBox_y = this.oy + dy; // sizeBox y

        this.attr({
            x: sizeBox_x,
            y: sizeBox_y
        });

        selectBox.attr({
            width: selectBox.width+dx,
            height: selectBox.height+dy
        });

        selectElement.transform("...S"+[(selectBox.width+dx-odx)/selectBox.width, (selectBox.height+dy-ody)/selectBox.height]);
        odx = dx;
        ody = dy;
    }

    function upSizeBox(){
        odx = 0;
        ody = 0;

        selectBox.remove();
        this.remove();
        initialSet.attr("opacity", 1);

         // SVG 파일 최신화 
        var svgString = paper.toSVG();
        socket.emit("updateSVG", {
            email: userEmail,
            name: userName,
            pid: pid,
            viewBoxWidth: workSpace.offsetWidth,
            viewBoxHeight: workSpace.offsetHeight,
            svgString: svgString
        });
    }

    // 배경 클릭시
    paperBackground.click(function(e) {
        // text 요소 수정중에 배경을 클릭시
        if(editText){
            editText.inlineTextEditing.stopEditing();
            editText = null;
        }
        
        selectElement = paper.set();
        initialSet.attr("opacity", 1);
    });

    paperBackground.drag(moveBackGround, startBackGround, upBackGround);
});