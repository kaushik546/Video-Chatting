var express = require('express'),
        http = require('http'),
        url = require('url'),
        querystring = require('querystring'),
        couchdb = require('felix-couchdb'),
        bcrypt = require('bcrypt-nodejs'),
        nodemailer = require('nodemailer'),
        path = require('path');
var io = require('socket.io');
var clients = new Array();
var transport = nodemailer.createTransport('SMTP', {
    'service': 'Gmail',
    'auth': {
        'user': 'kcl.webrtc@gmail.com',
        'pass': 'kcl098765'
    }
});

var client = couchdb.createClient(5984, 'localhost');
var db = client.db('registration');

var app = express();
app.configure(function() {
//    process.argv.forEach(function (val, index, array) {
//        console.log(index + ': ' + val);
//    });
//  console.log(process.argv ," -------------");

    //app.set('port', process.env.PORT || 3000);
    app.set('port', process.argv[2] || 3000);
    app.engine('html', require('ejs').renderFile);
    app.set('view engine', 'html');
    app.set('views', __dirname + '/views');

    app.use(express.static(__dirname + '/public'));
    app.use(express.cookieParser('KCL0SECRET'));
    app.use(express.session());
    app.use(express.bodyParser({
        keepExtensions: true,
        uploadDir: './public/profile_pictures'
    }));

    app.use(app.router);

});
var routes = require('./routes');
var user = require('./routes/users');


app.get('/', function(req, res) {
    res.redirect('home');
});

app.get('/login', user.login);

app.get('/signup', user.signup);

app.get('/logout', function(req, res) {
    var user = req.session.kcl_web_rtc_user;
    logOutUserById(user,req,res)
});
function logOutUserById(user, req, res) {
    if (logedInUsers.indexOf(user) > -1) {
        logedInUsers.splice(logedInUsers.indexOf(user), 1);
    }
    var recentLogout = {
                'type': 'recentLogout',
                'recentLogoutID': user
            };
            removeClient(user);
            io.sockets.emit('recentUser', recentLogout);
            if (req) {
                delete req.session.name;
                delete req.session.kcl_web_rtc_user;
                req.session.destroy(function() {
                res.redirect('/login');
            });
            }
//    db.getDoc('logs', function(err, doc) {
//        if (err)
//            throw err;
//        else {
//            doc.logUsers.splice(doc.logUsers.indexOf(user), 1);
//            db.saveDoc('logs', doc, function(err, ok) {
//                if (err){
//                    console.log('error:',err);
//                    //throw err;
//                }
//            });
//            var recentLogout = {
//                'type': 'recentLogout',
//                'recentLogoutID': user
//            };
//            removeClient(user);
//            io.sockets.emit('recentUser', recentLogout);
//            if (req) {
//                delete req.session.name;
//                delete req.session.kcl_web_rtc_user;
//                req.session.destroy(function() {
//                res.redirect('/login');
//            });
//            }
//            
//           // console.log('Clients:',clients);
//        }
//    });
}
app.get('/home', function(req, res) {
    if (req.session.name === 'kaushik') {
        db.getDoc(req.session.kcl_web_rtc_user, function(err, doc) {
            if (!err) {
                var profile_data = {
                    "profile_name": doc.fullName,
                    "profile_id": doc._id,
                    "req_in": doc.reqIn,
                    "friends": doc.friends,
                    "profile_picture": doc.profilePicture,
                    "req_out": doc.reqOut
                };
                res.render('home', profile_data);
            }
        });
    }
    else {
        res.redirect('/login');
    }
});

app.get('/check_user', function(req, res) {
    var user = req.query.userName;
    db.getDoc(user, function(err, doc) {
        if (err) {
            res.send('yes');
        }
        else {
            res.send('no');
        }
    });
});

app.get('/check_email', function(req, res) {
    var email = req.query.email;
    db.view('emails', 'get_email', function(err, allemail) {
        var e = new Array();
        for (var i = 0; i < allemail.total_rows; i++) {
            e.push(allemail.rows[i].value);
        }
        if (e.indexOf(email) == -1)
            res.send('yes');
        else
            res.send('no');
    });
});

app.get('/save_signup_data', function(req, res) {
    var salt = bcrypt.genSaltSync(10);
    req.query.password = bcrypt.hashSync(req.query.password, salt);
    req.query.reqIn = new Array();
    req.query.reqOut = new Array();
    req.query.friends = new Array();
    req.query.profilePicture = null;
    db.saveDoc(req.query.userName, req.query, function(err, ok) {
        if (err) {
            res.send('Error to registration!');
            console.log(JSON.stringify(err));
        }
        else {
            res.send('Registration successful!');
        }
    });

});

app.get('/authen', function(req, res) {
    var id = req.query.userName;
    db.getDoc(id, function(err, doc) {
        if (!err) {
            bcrypt.compare(req.query.password, doc.password, function(err, result) {
                if (!err) {
                    if (result) {
                        req.session.name = 'kaushik';
                        req.session.kcl_web_rtc_user = id;
                        res.send('authenticated');
                        if (logedInUsers.indexOf(id) == -1) {
                            logedInUsers.push(id);
                        }
                        var recentLogin = {
                            'type': 'recentLogin',
                            'recentLoginID': id
                        };
                        io.sockets.emit('recentUser', recentLogin);
//                        db.getDoc('logs', function(err, doc) {
//                            if (err)
//                                console.log('Error from getDoc:logs');
//                            else {
//                                if (doc.logUsers.indexOf(id) == -1) {
//                                    doc.logUsers.push(id);
//                                    db.saveDoc('logs', doc, function(err, ok) {
//                                        if (err)
//                                            console.log('Error from saveDoc:logs');
//                                    });
////                                    var recentLogin = {
////                                        'type': 'recentLogin',
////                                        'recentLoginID': id
////                                    };
////                                    io.sockets.emit('recentUser', recentLogin);
//                                }
//                            }
//                        });
                    }
                    else {
                        res.send('Wrong password! Please Try again');
                    }
                }
            });
        }
        else {
            res.send('Unregistered user! Please Signup');
        }
    });
});

app.get('/search_fnd', function(req, res) {
    var user_id = req.query.user_id;
    var myIdentity = req.query.myIdentity;
    if (myIdentity == user_id)
        res.send('Not found!');
    else {
        db.getDoc(myIdentity, function(err, doc) {
            if (err)
                console.log('Error from search friend');
            else {
                if (doc.friends.indexOf(user_id) >= 0)
                    res.send('Already friend');
                else if(doc.reqOut.indexOf(user_id) >= 0){
                    res.send('Request already sent');
                }
                else {
                    db.getDoc(user_id, function(err, doc) {
                        if (err) {
                            res.send('Not found!');
                        }
                        else if(doc.reqOut.indexOf(myIdentity) >= 0){
                            res.send('Request already come');
                        }
                        else{
                            res.send(doc.fullName);
                        }
                    })
                }
            }
        });

    }
});

app.get('/friend_request', function(req, res) {
    var myIdentity = req.query.myIdentity;
    var fnd_id = req.query.fnd_id;
    db.getDoc(myIdentity, function(err, doc) {
        if (err)
            console.log("Error from get doc");
        doc.reqOut.push(fnd_id);
        res.send(doc.reqOut);
        db.saveDoc(myIdentity, doc, function(err, ok) {
            if (err)
                console.log('Error from save doc');
        });
    });

    db.getDoc(fnd_id, function(err, doc) {
        if (err)
            console.log("Error from get doc");
        doc.reqIn.push(myIdentity);
        db.saveDoc(fnd_id, doc, function(err, ok) {
            if (err)
                console.log('Error from save doc: ' + JSON.stringify(err));
        });
        var friendRequest = {
            'requestSender': doc.reqIn,
            'requestReceiver': fnd_id
        };
        io.sockets.emit('friendRequest', friendRequest);
    });
});

app.get('/get_fullname_for_friend_request', function(req, res) {
    var req_id = req.query.req_id;
    db.view('users', 'full_name', {"keys": req_id}, function(err, allName) {
        if(err) throw err;
        res.send(allName);
    });
});

app.get('/friend_request_accept', function(req, res) {
    var myIdentity = req.query.myIdentity;
    var requested_fnd_id = req.query.requested_fnd_id;
    db.getDoc(myIdentity, function(err, doc) {
        if (err)
            console.log('Error from "friend_request_accept:getDoc"');
        else {
            doc.friends.push(requested_fnd_id);
            doc.reqIn.splice(doc.reqIn.indexOf(requested_fnd_id), 1);
            var recentJoinFriendStatus;
            var operationListStatus;
            if(logedInUsers.indexOf(myIdentity) > -1){
                recentJoinFriendStatus = "online";
                operationListStatus = "block";
            }
            else{
                recentJoinFriendStatus = "offline";
                operationListStatus = "none";
            }
            var friendRequestResponse = {
                'reqIn':doc.reqIn,
                'recentJoinFriendStatus':recentJoinFriendStatus,
                'operationListStatus':operationListStatus
            };
            res.send(friendRequestResponse);
            db.saveDoc(myIdentity, doc, function(err, ok) {
                if (err)
                    console.log('Error from "friend_request_accept:saveDoc"');
            });
        }
    });
    db.getDoc(requested_fnd_id, function(err, doc) {
        if (err)
            console.log('Error from "friend_request_accept:getDoc"');
        else {
            doc.friends.push(myIdentity);
            doc.reqOut.splice(doc.reqOut.indexOf(myIdentity), 1);
            db.saveDoc(requested_fnd_id, doc, function(err, ok) {
                if (err)
                    console.log('Error from "friend_request_accept:saveDoc"');
            });
            var recentJoinFriendStatus;
            var operationListStatus;
            if(logedInUsers.indexOf(myIdentity) > -1){
                recentJoinFriendStatus = "online";
                operationListStatus = "block";
            }
            else{
                recentJoinFriendStatus = "offline";
                operationListStatus = "none";
            }
            var friendRequestResponse = {
                'requestSenderId': requested_fnd_id,
                'senderReqOut': doc.reqOut,
                'senderFriends':myIdentity,
                'recentJoinFriendStatus':recentJoinFriendStatus,
                'operationListStatus':operationListStatus
            };
            io.sockets.emit('friendRequestResponse', friendRequestResponse);
        }
    });
});

app.get('/friend_request_cancel', function(req, res) {
    var myIdentity = req.query.myIdentity;
    var requested_fnd_id = req.query.requested_fnd_id;
    var _receiverReqIn;
    db.getDoc(myIdentity, function(err, doc) {
        if (err)
            console.log('Error from "friend_request_accept:getDoc"');
        else {
            _receiverReqIn = doc.reqIn;
            doc.reqIn.splice(doc.reqIn.indexOf(requested_fnd_id), 1);
            res.send(_receiverReqIn);
            console.log(_receiverReqIn);
            db.saveDoc(myIdentity, doc, function(err, ok) {
                if (err)
                    console.log('Error from "friend_request_accept:saveDoc"');
            });
        }
    });
    db.getDoc(requested_fnd_id, function(err, doc) {
        if (err)
            console.log('Error from "friend_request_accept:getDoc"');
        else {
            doc.reqOut.splice(doc.reqOut.indexOf(myIdentity), 1);
            db.saveDoc(requested_fnd_id, doc, function(err, ok) {
                if (err)
                    console.log('Error from "friend_request_accept:saveDoc"');
            });
            var friendRequestResponse = {
                'requestSenderId': requested_fnd_id,
                'senderReqOut': doc.reqOut
            };
            io.sockets.emit('friendRequestResponse', friendRequestResponse);
        }
    });
});

//app.get('/getReqInForReceiver', function(req, res){
//    var myIdentity = req.query.myIdentity;
//    db.getDoc(myIdentity, function(err, doc) {
//        if (err) throw err;
//        else {
//          res.send(doc.reqIn);
//        }
//    });   
//});

app.get('/friend_request_send_cancel', function(req, res) {
    var myIdentity = req.query.myIdentity;
    var requested_to_fnd_id = req.query.requested_to_fnd_id;
    db.getDoc(myIdentity, function(err, doc) {
        if (err)
            console.log('Error from "friend_request_send_cancel:getDoc"');
        else {
            doc.reqOut.splice(doc.reqOut.indexOf(requested_to_fnd_id), 1);
            res.send(doc.reqOut);
            db.saveDoc(myIdentity, doc, function(err, ok) {
                if (err)
                    console.log('Error from "friend_request_accept:saveDoc"');
            });
        }
    });
    db.getDoc(requested_to_fnd_id, function(err, doc) {
        if (err)
            console.log('Error from "friend_request_send_cancel:getDoc"');
        else {
            doc.reqIn.splice(doc.reqIn.indexOf(myIdentity), 1);
            db.saveDoc(requested_to_fnd_id, doc, function(err, ok) {
                if (err)
                    console.log('Error from "friend_request_send_cancel:saveDoc"');
            });
            var friendRequest = {
                'requestSender': doc.reqIn,
                'requestReceiver': requested_to_fnd_id
            };
            io.sockets.emit('friendRequest', friendRequest);
        }
    });
});

app.get('/check_session', function(req, res) {
    if (req.session.name == 'kaushik')
        res.send('y');
    else
        res.send('n');
});

app.get('/get_account_info_for_update', function(req, res) {
    db.getDoc(req.session.kcl_web_rtc_user, function(err, doc) {
        if (err)
            throw err;
        else {
            if (typeof doc.skype === 'undefined')
                var skype = 'Not set yet';
            else
                var skype = doc.skype;
            var changableData = {
                "name": doc.fullName,
                "email": doc.email,
                "skype": skype
            };
            res.send(changableData);
        }
    });
});

app.get('/save_account_info_for_update', function(req, res) {
    db.getDoc(req.session.kcl_web_rtc_user, function(err, doc) {
        if (err)
            throw err;
        else {
            doc.fullName = req.query.fullName;
            doc.email = req.query.email;
            doc.skype = req.query.skype;
            db.saveDoc(req.session.kcl_web_rtc_user, doc, function(err, ok) {
                if (err)
                    res.send('Fail to update data');
                else
                    res.send('Update successful');
            });
        }
    });
});

app.get('/save_password_for_update', function(req, res) {
    db.getDoc(req.session.kcl_web_rtc_user, function(err, doc) {
        if (err)
            throw err;
        else {
            var salt = bcrypt.genSaltSync(10);
            doc.password = bcrypt.hashSync(req.query.new_pass, salt);
            db.saveDoc(req.session.kcl_web_rtc_user, doc, function(err, ok) {
                if (err)
                    res.send('Fail to update password');
                else
                    res.send('Password update successful');
            });
        }
    });
});

app.get('/recover_password', function(req, res) {
    var recover_user = req.query.recover_user;
    var recover_pass = req.query.recover_pass;
    db.getDoc(recover_user, function(err, doc) {
        if (err)
            res.send('Unrecognized user name');
        else {
            var user_email = doc.email;
            var salt = bcrypt.genSaltSync(10);
            doc.password = bcrypt.hashSync(recover_pass, salt);
            db.saveDoc(recover_user, doc, function(err, ok) {
                if (!err) {
                    var mailOptions = {
                        'from': 'kcl.webrtc@gmail.com',
                        'to': user_email,
                        'subject': 'KCL WebRTC response:Password recover',
                        'text': 'Your new password: ' + recover_pass
                    };
                    transport.sendMail(mailOptions, function(err, response) {
                        if (err)
                            console.log('Fail to send mail');
                        else {
                            console.log('Send mail successfully');
                            res.send('A new password has been sent to your email address, please check your inbox');
                        }
                    });

                }
            });
        }
    });
});

app.post('/save_profile_pic', function(req, res) {
    var pic_name = path.basename(req.files.profile_picture.path);
    db.getDoc(req.session.kcl_web_rtc_user, function(err, doc) {
        if (err)
            throw err;
        else {
            doc.profilePicture = pic_name;
            db.saveDoc(req.session.kcl_web_rtc_user, doc, function(err, ok) {
                if (err)
                    throw err;
                else
                    res.redirect('/home');
            });
        }
    });
});

var server = http.createServer(app).listen(app.get('port'),'0.0.0.0', function() {
    console.log('Express server listening on port: ' + app.get('port'));
    //clear logged in list
    logedInUsers = [];
//    db.getDoc('logs', function(err, doc) {
//        if (err)
//            throw err;
//        else {
//            doc.logUsers = [];
//            db.saveDoc('logs', doc, function(err, ok) {
//                if (err) {
//                    console.log('Error from saveDoc:logs',err);
//                }
//            });
//        }
//    });
});



// WEB RTC----------------------------------

io = io.listen(server,{'log':false});

function clientFromID(id) {
    //console.log("searching for -- ", id);
    for (var i = 0; i < clients.length; i++) {
        if (clients[i].ID == id) {
            return clients[i];
        }
    }
   // console.log("returning null -- ", clients);
    return null;
}

function clientFromSocket(socket) {
    for (var i = 0; i < clients.length; i++) {
        if (clients[i].Socket == socket) {
            return clients[i];
        }
    }
    //console.log("returning null -- ", clients);
    return null;
}

function removeClient(param,logout) {
    var client = clientFromID(param) || clientFromSocket(param);
    if (client && client.ID) {
        console.log((new Date()) + " Peer disconnected - " + client.ID);
        clients.splice(clients.indexOf(client), 1);
        if(logout){
            logOutUserById(client.ID);
        }
        console.log('clients:',clients);
    }
}

function pushClientIfNotAlready(senderID, socket) {
    for (var i in clients) {
        if (clients[i].ID == senderID) {
            return clients[i];
        }
    }
    var newClient = {
        ID: senderID,
        Socket: socket};
    clients.push(newClient);
    console.log('pushed client ', senderID);
}


// This callback function is called every time someone
// tries to connect to the WebSocket server
io.sockets.on('connection', function(socket) {
    var lastHearBeat;
    var lastResponse=0;
   // console.log('--got new socket:' , socket);
    socket.on('message', function(message1) {
        var message = JSON.parse(message1);
        console.log("--got message:type:" + message.type + " senderID:" + message.senderID + " receiverID:" + message.receiverID);
        switch (message.type) {
            case 'boot':
                {
                    removeClient(socket)||removeClient(message.senderID);
                    pushClientIfNotAlready(message.senderID, socket);
                    if(logedInUsers.indexOf(message.senderID) == -1){logedInUsers.push(message.senderID);}
                    var onlineFriends = {
                        'type': 'online',
                        'friends': logedInUsers
                    };
                    console.log("Data from DB-------" + onlineFriends.friends);
                    io.sockets.emit('message', onlineFriends);
                }
                break;
            case 'bye':
                {
                  //  removeClient(socket, true) || removeClient(message.senderID, true);
                    //io.sockets.emit('message',message);
                    //if(message.topic){break;}
                     console.log('got bye from:'+message.senderID);
                     tryCount = 0;
                    var intterVal = setInterval(function() {
                        tryCount++;
                        
                        lastHearBeat = new Date().getTime();
                        console.log('got called setinterval '+tryCount+' time at '+lastHearBeat);
                        socket.emit('alive', {'time': lastHearBeat}, function() {
                            console.log('success to send alive');
                            clearInterval(intterVal);
                        });
                        if((lastHearBeat - lastResponse) > 1500 && tryCount > 1){
                            clearInterval(intterVal);
                            removeClient(socket,true);//logout
                        }
                    }, 500);
                    socket.on('alive', function(messageStr) {
                        console.log('success to get alive');
                        message = JSON.parse(messageStr);
                        if (message.time) {
                            lastResponse = Number(message.time);
                            console.log('success to get alive with time');
                            clearInterval(intterVal);
                        }
                    });
                }
                break;
        }
        // just forward the message to the receiver
        if (message.receiverID) {
            var client = clientFromID(message.receiverID);
            if (client) {
                console.log("sending message to " + message.receiverID+" msg:",message);
                client.Socket.emit("message", message);
            }
        }
         console.log("--clients:", clients);
    });

    // send online friends for first time
//    db.getDoc('logs', function(err, doc) {
//        if (err)
//            throw err;
//        else {
//            var onlineFriends = {
//                'type': 'online',
//                'friends': doc.logUsers.length>logedInUsers.length?doc.logUsers.length:logedInUsers
//            };
//            console.log("Data from DB-------" + onlineFriends.friends);
//            socket.emit('message', onlineFriends);
//        }
//    });



    socket.on('disconnect', function() {
       // removeClient(socket);//
        //clearInterval(intterVal);
    });
    socket.on('close', function() {
        removeClient(socket,true);//logout
    });
    
    console.log('A new connect established');
});