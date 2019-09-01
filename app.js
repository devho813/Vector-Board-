const express = require("express");
const app = express();
const server = require('http').createServer(app);
const session = require("express-session");
const mysql = require('mysql');
const MySQLStore = require('express-mysql-session')(session);
const bodyParser = require('body-parser');
const sha256 = require('sha256');
const fs = require('fs-extra');
const path = require('path');
// http server를 socket.io server로 upgrade한다
const io = require('socket.io')(server);

const conn = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : 'rootpass',
    port     : 3306,
    database : 'vbDB'
});

app.use(express.static("public"));
app.use('/project', express.static(path.join(__dirname+'/project')));

app.use(bodyParser.urlencoded({ extended: false })); // for parsing application/x-www-form-urlencoded
app.use(session({
    //mysql session store
    secret: 's!e@s!s@i##onse!c@r!e@t',
    resave: false,
    saveUninitialized: true,
    store: new MySQLStore({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'rootpass',
        database: 'vbDB'
    })
}));

app.set("view engine", "ejs");
app.set("views", "./views");

// project 폴더 내부 비정상적인 접근 차단
app.all("/project/*", function(req, res){
    res.send("접근 차단된 PATH입니다.");
});

// 메인 PATH
app.get("/", function(req, res){

     // 현재 회원수 추출을 위한 데이터베이스 연동
     var query = "SELECT count(*) AS userCount FROM userINFO";
     conn.query(query, function(err, rows, fields){
        if(err){console.log(err); throw err;}

        var userCount = rows[0].userCount;
        res.render("main", {sessionEmail: req.session.sessionEmail, userCount:userCount});
    });

 });

// 로그인 PATH
app.get("/login", function(req, res){

    // 현재 회원수 추출을 위한 데이터베이스 연동
    var query = "SELECT count(*) AS userCount FROM userINFO";
    conn.query(query, function(err, rows, fields){
        if(err){console.log(err); throw err;}

        var userCount = rows[0].userCount;
        res.render("login", {userCount: userCount});
    });
});

// 로그인 처리 PATH
app.post("/login", function(req, res){
    var email = req.body.email,
    password = req.body.password;
    var userCount = null;

    // 현재 회원수 추출을 위한 데이터베이스 연동
    var query = "SELECT count(*) AS userCount FROM userINFO";
    conn.query(query, function(err, rows, fields){
        if(err){console.log(err); throw err;}

        userCount = rows[0].userCount;
    });


    var query = "SELECT email FROM userINFO WHERE email=? AND password=?",
    params = [email, sha256(password+email)];

    conn.query(query, params, function(err, rows, fields){
        if(err){console.log(err); throw err;}

        if(rows.length){
            // 로그인 성공
            req.session.sessionEmail = rows[0].email;
            req.session.save(function(){
                console.log("로그인 성공");
                res.redirect('/');
            });
        }else{
            // 로그인 실패
            console.log("로그인 실패");
            res.render("login", {loginError: true, userCount: userCount});
        }
        
    });
});

// 로그아웃 PATH
app.get("/logout", function(req, res){
    delete req.session.sessionEmail;
    res.redirect('/');
});

// 회원가입 PATH
app.get("/signup", function(req, res){
    res.render("signup");
});

// 회원가입 처리 PATH
app.post("/signup", function(req, res){
    // 입력된 사용자 정보 저장
    var email = req.body.email,
    password = req.body.password,
    name = req.body.name,
    job = req.body.job,
    workplace = req.body.workplace;

    // userINFO 테이블에 데이터 저장
    var query = "INSERT INTO userINFO VALUES (?, ?, ?, ?, ?, '', '', '')";
    params = [email, sha256(password+email), name, job, workplace];
    conn.query(query, params, function(err, rows, fields){
        if(err){console.log(err); throw err;}

        res.redirect("/");
    });
});

// ajax 이메일 체크 PATH
app.get("/emailCheck", function(req, res){
    var email = req.query.email;

    var query = "SELECT email FROM userINFO WHERE email='"+email+"'";
    conn.query(query, function(err, rows, fields){
        if(err){console.log(err); throw err;}

        if(rows.length){
            // 해당 이메일 주소가 중복 될때
            res.send({email: null});
        }else{
            // 해당 이메일 주소가 중복되지 않을때
            res.send({email: email});
        }
    });
});

// 프로젝트 관리 페이지 PATH (get)
app.get(["/management","/management/:projectType"], function(req, res){

    // 유저 이름 추출
    var userName = null;

    conn.query("SELECT name AS userName FROM userINFO WHERE email='"+req.session.sessionEmail+"'", function(err, rows, fields){
        if(err){console.log(err); throw err;}
        userName = rows[0].userName;
    });

    var query = "SELECT own_project as ownPIDs, share_project as sharePIDs, wait_share as waitPIDs FROM userINFO WHERE email='"+req.session.sessionEmail+"'";
    conn.query(query, function(err, rows, fields){
        if(err){console.log(err); throw err;}

        // 결과 "/0//1//2//3//4//5/" --> ["/0", "1", "2", "3", "4", "5/"]
        // 결과 "/1/" --> ["/1/"]
        var ownPIDs = rows[0].ownPIDs.split("//");
        var sharePIDs = rows[0].sharePIDs.split("//");
        var waitPIDs = rows[0].waitPIDs.split("//");

        // 결과 ["/0", "1", "2", "3", "4", "5/"] --> ["0","1","2","3","4","5"]
        // 결과 ["/1/"] --> ["1"]
        for(let i=0; i<ownPIDs.length; i++){
            ownPIDs[i] = ownPIDs[i].replace(/\//g,'');
        }

        for(let i=0; i<sharePIDs.length; i++){
            sharePIDs[i] = sharePIDs[i].replace(/\//g,'');
        }

        for(let i=0; i<waitPIDs.length; i++){
            waitPIDs[i] = waitPIDs[i].replace(/\//g,'');
        }

        // waitShare Prepared 물음표 개수 처리
        var waitPrepared = "?";
        for(var i=0; i<waitPIDs.length-1; i++){
            waitPrepared += ",?";
        }

        var waitResultSet = null;

        // watiShare
        var query = "SELECT pid, pname, owner FROM projectINFO WHERE pid in ("+waitPrepared+")";
        conn.query(query, waitPIDs, function(err, rows, fields){
            if(err){console.log(err); throw err;}

            waitResultSet = rows;
        });

        if(req.params.projectType == "myProject" || !(req.params.projectType)){
            // --------> /management or /management/myProject로 접속

            // own Prepared 물음표 개수 처리
            var ownPrepared = "?";
            for(var i=0; i<ownPIDs.length-1; i++){
                ownPrepared += ",?";
            }
            // own
            var query = "SELECT pid, pname, owner, DATE_FORMAT(creation_date, '%Y-%m-%d %H:%i') as date FROM projectINFO WHERE pid in ("+ownPrepared+")";
            conn.query(query, ownPIDs, function(err, rows, fields){
                if(err){console.log(err); throw err;}

                res.render("management", {projectType: "myProject", ownProjectInfo: rows, waitShareInfo: waitResultSet, userName: userName});                  
            });
        }else if(req.params.projectType == "shareProject"){
            // -------> /myProject/shareProject로 접속

            // share Prepare 물음표 개수 처리
            var sharePrepared = "?";
            for(var i=0; i<sharePIDs.length-1; i++){
                sharePrepared += ",?";
            }

            var query = "SELECT pid, pname, owner, DATE_FORMAT(creation_date, '%Y-%m-%d %H:%i') as date FROM projectINFO WHERE pid in ("+sharePrepared+")";

            conn.query(query, sharePIDs, function(err, rows, fields){
                if(err){console.log(err); throw err;}

                res.render("management", {projectType: "shareProject", shareProjectInfo: rows, waitShareInfo: waitResultSet, userName: userName});                    
            });
        }else if(req.params.projectType == "searchProject"){
            // -------> /myProject/searchProject로 접속

            var searchContent = req.query.searchContent;

            var query = "SELECT pid, pname, owner, DATE_FORMAT(creation_date, '%Y-%m-%d %H:%i') as date FROM projectINFO WHERE pname LIKE '%"+searchContent+"%'";
            conn.query(query, function(err, rows, fields){
                res.render("management", {projectType: "searchProject", searchProjectInfo: rows, waitShareInfo: waitResultSet, userName: userName});
            });
        }else{
            // -------> 잘못된 주소 접속

            res.send("Cannot GET /management/"+req.params.projectType);
        }
    });
});


// 새로운 프로젝트 생성 처리 PATH
app.post("/management/newProject", function(req, res){
    var pname = req.body.pname,
    projectDescription = req.body.projectDescription;

    var query = "INSERT INTO projectINFO(pname, owner, project_description) VALUES (?, ?, ?)",
    params = [pname, req.session.sessionEmail, projectDescription];
    conn.query(query, params, function(err, rows, fields){
        if(err){console.log(err); throw err;}

        // userinfo 테이블 own_project에 프로젝트 고유번호 추가
        conn.query("UPDATE userINFO SET own_project=CONCAT(own_project,'/"+rows.insertId+"/') WHERE email='"+req.session.sessionEmail+"'", function(err2, rows2, fields2){
            if(err2){console.log(err2); throw err2;}
        });

        fs.mkdirSync(__dirname+"/project/"+rows.insertId); // 프로젝트 폴더 생성
        fs.copySync(__dirname+"/public/images/demo.svg", __dirname+"/project/"+rows.insertId+"/project.svg");
        res.redirect("/management");
    });
});

// 내 프로젝트 제거 처리 PATH
app.post("/management/myProject/removeProject", function(req, res){
    var pid = req.body.pid;

    // userINFO 테이블 own_project 컬럼값 업데이트
    conn.query("UPDATE userINFO SET own_project=replace(own_project,'/"+pid+"/','')", function(err, rows, fields){
        if(err){console.log(err); throw err;}
    });

    // 프로젝트 테이블에서 해당 프로젝트 제거
    conn.query("DELETE FROM projectINFO WHERE pid="+pid, function(err, rows, fields){
        if(err){console.log(err); throw err;}
    });

    // 해당 프로젝트를 공유하고 있던 다른 사용자 share_project 컬럼값 업데이트
    conn.query("UPDATE userINFO SET share_project=replace(share_project,'/"+pid+"/','')", function(err, rows, fields){
        if(err){console.log(err); throw err;}
    });

    // 해당 프로젝트를 공유하고 있던 다른 사용자 wait_share 컬럼값 업데이트
    conn.query("UPDATE userINFO SET wait_share=replace(wait_share,'/"+pid+"/','')", function(err, rows, fields){
        if(err){console.log(err); throw err;}
    });

    fs.removeSync(__dirname+"/project/"+pid); // 프로젝트 폴더 제거
    res.redirect("/management");
});

// 공유 프로젝트 제거 처리 PATH
app.post("/management/shareProject/removeProject", function(req, res){
    var pid = req.body.pid;

    // userINFO 테이블 share_project 컬럼값 업데이트
    conn.query("UPDATE userINFO SET share_project=replace(share_project,'/"+pid+"/','')", function(err, rows, fields){
        if(err){console.log(err); throw err;}
    });

    res.redirect("/management");
});

// 공유 대기 프로젝트를 실제 공유로 전환 (ajax)
app.post("/waitToShare", function(req, res){
    var pid = req.body.pid;

    var query="UPDATE userINFO SET share_project=CONCAT(share_project,'/"+pid+"/'), wait_share=replace(wait_share,'/"+pid+"/','') WHERE email='"+req.session.sessionEmail+"'";
    conn.query(query, function(err, rows, fields){
        if(err){console.log(err); throw err;}
    });

    res.send();
});

// 공유 프로젝트 대기 목록 삭제 (ajax)
app.post("/removeWaitShare", function(req, res){
    var pid = req.body.pid;
    
    var query="UPDATE userINFO SET wait_share=REPLACE(wait_share,'/"+pid+"/','') WHERE email='"+req.session.sessionEmail+"'";
    conn.query(query, function(err, rows, fields){
        if(err){console.log(err); throw err;}
    });

    res.send();
});

app.get("/vectorLoading", function(req, res){
    res.render("vector_loading");
});

// 협업 페이지 PATH
app.get("/vector", function(req, res){
    var pid = req.query.pid;
    var userEmail = null // 유저 이메일 추출
    var userName = null; // 유저 이름 추출

    // 현재 로그인된 세션 계정이 소유하고 있는 프로젝트가 맞는지 확인
    var query = "SELECT email, name FROM userINFO WHERE (own_project LIKE '%/"+pid+"/%' OR share_project LIKE '%/"+pid+"/%') AND email='"+req.session.sessionEmail+"'";
    conn.query(query, function(err, rows, fields){
        if(err){console.log(err); throw err;}

        userEmail = rows[0].email; // 유저 이메일 추출
        userName = rows[0].name; // 유저 이름 추출

        if(rows.length){
            var query2 = "SELECT pid, pname, owner, project_description, DATE_FORMAT(creation_date, '%Y-%m-%d %H:%i') AS creationDate FROM projectINFO WHERE pid="+pid;
            conn.query(query2, function(err2, rows2, fields2){
                if(err2){console.log(err2); throw err2;}

                var pid = rows2[0].pid;
                var projectName = rows2[0].pname;
                var projectOwner = rows2[0].owner;
                var projectDescription = rows2[0].project_description;
                var creationDate = rows2[0].creationDate;

                res.render("vector", {pid: pid, projectName: projectName, projectOwner: projectOwner, projectDescription: projectDescription, creationDate: creationDate, userEmail:userEmail, userName:userName}); 
            });
        }else{
            res.send("잘못된 접근입니다. 소유하고 있는 프로젝트에 접근해주세요.");
        }
    });
});

// 공유하기 처리 PATH (ajax)
app.post("/shareProc", function(req, res){
    var shareEmail = req.body.email;
    var pid = req.body.pid;

    // 공유 이메일 공백제거
    shareEmail = shareEmail.replace( /(\s*)/g, "");

    // shareEmail이 현재 로그인된 계정이 아닌지 체크
    if(req.session.sessionEmail === shareEmail){
        res.send({success: false, notify: "본인 이메일 주소를 입력하셨습니다."});
        return;
    }

    // 로그인된 계정이 현재 프로젝트의 소유자일 경우만 공유가능
    var query = "SELECT email FROM userINFO WHERE email='"+req.session.sessionEmail+"' AND own_project LIKE '%/"+pid+"/%'";
    conn.query(query, function(err, rows, fields){
        if(err){console.log(err); throw err;}

        if(rows.length === 0){
            res.send({success: false, notify: "프로젝트 소유자가 아니면 공유가 불가능합니다"});
            return;
        }

        // 입력한 계정이 존재하는 이메일인지 체크
        conn.query("SELECT email FROM userINFO WHERE email='"+shareEmail+"'", function(err2, rows2, fields2){
            if(err2){console.log(err2); throw err2;}

            if(rows2.length){
                // 중복 공유 인지 체크
                var query3 = "SELECT email FROM userINFO WHERE email='"+shareEmail+"' AND share_project LIKE '%/"+pid+"/%' OR wait_share LIKE '%/"+pid+"/%'";
                conn.query(query3, function(err3, rows3, fields3){
                    if(err3){console.log(err3); throw err3;}

                    if(rows3.length){
                        res.send({success: false, notify: "현재 공유되고 있거나 공유 대기중에 있는 사용자입니다."});
                    }else{

                        // 공유될 계정에 wait_share 컬럼에 해당 프로젝트ID 추가
                        var query4 = "UPDATE userINFO SET wait_share=CONCAT(wait_share,'/"+pid+"/') WHERE email='"+shareEmail+"'";
                        conn.query(query4, function(err4, rows4, fields4){
                            if(err4){console.log(err4); throw err4;}
                            res.send({success: true, shareEmail: shareEmail});
                        });
                    }
                });
            }else{
                res.send({success: false, notify: "존재하지 않는 사용자입니다."});
            }
        });
    });
});

// 서버 연결
server.listen(3000, function(){
   console.log("connect 3000 port!");
});



/*************************************
        서버 socket.io
*************************************/
var accessUsers = new Array(); // 현재 접속된 유저 정보 [이메일][이름]

io.on('connection', (socket) => { // 웹소켓 연결 시
    // 접속한 클라이언트의 정보가 수신되면
    socket.on('access', function(data) {
        var overlapEmail = false; // 중복 체크
        var accessUsers_sub = new Array(); // 다중 배열을 다루기 위한 선언
        socket.email = data.email;
        socket.name = data.name;

        for(var i = 0; i < accessUsers.length; i++){
            if(accessUsers[i][0] === data.email){
                overlapEmail = true;
            }
        }

        // 중복된 이메일이 없을때 accessUsers 다중 배열에 사용자 정보 추가
        if(!overlapEmail){
            accessUsers_sub.push(data.email);
            accessUsers_sub.push(data.name);
            accessUsers.push(accessUsers_sub);
        }

        // 클라이언트로 접근한 유저 정보 전달
        io.emit('access', accessUsers );
    });

    // SVG 업데이트
    socket.on('updateSVG', function(data) {
        console.log(data.email+" ("+data.name+")님이 프로젝트를 수정하였습니다.");
        // viewBox 문자열 추가
        data.svgString = (data.svgString).replace("<svg ","<svg viewBox=\"0, 0, "+data.viewBoxWidth+", "+data.viewBoxHeight+"\" ");

        // SVG 업데이트
        fs.writeFile(__dirname+"/project/"+data.pid+"/project.svg", data.svgString);

        // 나를 제외한 모든 클라이언트에게 메시지를 전송
        socket.broadcast.emit('updateSVG', {svgString: data.svgString});
        // 나를 포함한 모든 클라이언트에게 메세지 전송 - 수정자 알림 기능을 위한
        io.emit("updateModifier", {email: data.email, name: data.name});
    });

    // force client disconnect from server
    socket.on('forceDisconnect', function() {
        socket.disconnect();
    })

    // 서버 접속이 끊겼을때
    socket.on('disconnect', function() {
        console.log(socket.name+"님 접속 끊김");

        // 접속이 끊긴 유저 정보 제거
        for(var i=0; i<accessUsers.length; i++){
            if(accessUsers[i][0] === socket.email){
                accessUsers.splice(i,1); 
            }
        }
        // 접속된 모든 클라이언트에게 메시지를 전송한다
        io.emit('access', accessUsers);
    });
});