/**
 * Created by chanho on 2017. 3. 26..
 */

<!-- form 유효성 검사  -->
(function(){

    // form-left
    var $name = $("input[name='name']");
    var $pw = $("input[name='password']");
    var $pwCheck = $("input[name='passwordCheck']"); // 비밀번호 재확인 (input 객체)
    var $pwCheckIcon = $("#checkPw, #checkPw2"); // input 태그 옆 체크 아이콘 (div 객체)

    $name.on("blur", function(){
        if($(this).val() !== ""){
            $("#checkName").addClass("check-complete");
        }else{
            $("#checkName").removeClass("check-complete");
        }
    });

    // add()가 안되는 현상...
    $("input[name='password'], input[name='passwordCheck']").on("blur", function(){
        if($pw.val() === "" || $pwCheck.val() === ""){
            return;
        }else if($pw.val() === $pwCheck.val()){
            $pwCheckIcon.addClass("check-complete");
        }else if($pw.val() !== $pwCheck.val()){
            $pwCheckIcon.removeClass("check-complete");
            $pwCheck.val("");
        }
    });

    /************************************************************************************/

    // form-right
    var $job = $("input[name='job']");
    var $workplace = $("input[name='workplace']");

    $job.on("blur", function(){
        if($(this).val() !== ""){
            $("#checkJob").addClass("check-complete");
        }else{
            $("#checkJob").removeClass("check-complete");
        }
    });

    $workplace.on("blur", function(){
        if($(this).val() !== ""){
            $("#checkWorkPlace").addClass("check-complete");
        }else{
            $("#checkWorkPlace").removeClass("check-complete");
        }
    });
})();