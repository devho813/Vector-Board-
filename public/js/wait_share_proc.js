{
    let $share = $(".share");
    let $waitRemove = $(".waitRemove");
    let $waitShareCount = $(".wait-share-count"); // 공유 대기 프로젝트 개수

    $share.on("click", function(){
        let $li = $(this).parent(); // <li>
        let $pid = $(this).prevAll(".pid"); // <input hidden>

        $.ajax({
            type: 'POST',
            data: {
                pid: $pid.val()
            },
            url: '/waitToShare',
            success: function(data){
                $li.fadeOut(300);
                $waitShareCount.text($waitShareCount.text()-1); // 프로젝트 개수 - 1
                setTimeout(function(){
                    $li.remove();
                },400);
            },
            error: function(xhr, status, e){
                alert(e);
            }
        });
    });

    $waitRemove.on("click", function(){
        let $li = $(this).parent(); // <li>
        let $pid = $(this).prevAll(".pid"); // <input hidden>

        $.ajax({
            type: 'POST',
            data: {
                pid: $pid.val()
            },
            url: '/removeWaitShare',
            success: function(data){
                $li.fadeOut(300);
                $waitShareCount.text($waitShareCount.text()-1); // 프로젝트 개수 - 1
                setTimeout(function(){
                    $li.remove();
                },400);
            },
            error: function(xhr, status, e){
                alert(e);
            }
        });
    });
}