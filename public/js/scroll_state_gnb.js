/**
 * Created by chanho on 2017. 3. 31..
 */

// 스크롤 상태에 따른 GNB 레이아웃 변경
// *jquery 필수

function scrollStateGNB(state){
    // true : gnb 문서 최상단 고정(relative)
    // false : gnb 화면 최상단 고정(fixed)

    var $headerCon = $(".header-container");
    var $mainLogo = $(".main-logo");
    var $gnbList = $(".header .header-container .gnb > li, " +
        ".header .header-container .gnb li > a");

    if(state){
        $headerCon.css({
            position: "relative",
            borderRadius: "",
            boxShadow: "",
            backgroundColor: ""
        });

        $mainLogo.css({
            width: "80px",
            marginLeft: "",
            marginTop: ""
        }).prop("src", "./images/LOGO1.png");

        $gnbList.css("color", "white");
    }else{
        $headerCon.css({
            position: "fixed",
            boxShadow: "0 0 15px black",
            backgroundColor: "rgba(235, 235, 235, 0.85)",
            top: 0
        });

        $mainLogo.css({
            width: "60px",
            marginLeft: "3%",
            marginTop: "5px"
        }).prop("src", "./images/LOGO2.png");

        $gnbList.css("color", "black");
    }
}
