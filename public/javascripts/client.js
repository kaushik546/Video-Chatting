var createProxy = function(scope, fn) {
    return function() {
        return fn.apply(scope, arguments);
    };
};

var myIdentity;
var localVideo;
var remoteDivTag;
var localStream;
var remoteStream;
var channelReady = false;
var socket;
var _isCaller = true;
// Set up audio and video regardless of what devices are present.
var sdpConstraints = {'mandatory': {
        'OfferToReceiveAudio': true,
        'OfferToReceiveVideo': true}};
var isVideoMuted = false;
var isAudioMuted = false;

var peersArray = [];
function peerFromID(id) {
    console.log("searching for -- ", id);
    for (var i = 0; i < peersArray.length; i++) {
        if (peersArray[i].MyPeerID == id) {
            return peersArray[i];
        }
    }
    console.log("returning null -- ", peersArray);
    return null;
}

function sendIOMessage(message, receiver) {
    message.senderID = myIdentity;
    message.receiverID = receiver;
    console.log('sending msg:',JSON.stringify(message));
    socket.emit("message", JSON.stringify(message));
}


function Connection(myPeerID, remoteVideoTag) {
    this.MyPeerID = myPeerID;
    this.RemoteVideoTag = remoteVideoTag;
    this.RemoteStream = null;
    this.PeerConnection = null;
    this.Started = false;
    this.dataChannel = "";
    this.createPeer();
}

Connection.prototype.createPeer = function() {
    if (!this.Started) {
        console.log("Creating PeerConnection.");
        this.createPeerConnection();
        console.log("Adding local stream.");
        this.Started = true;
    }
};


Connection.prototype.createPeerConnection = function() {
    console.log("createPeerConnection get called!");
    var pc_config = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
    var pc_constraints = {"optional": [{DtlsSrtpKeyAgreement: true}, {RtpDataChannels: true}]};

    // Force the use of a number IP STUN server for Firefox.
    if (webrtcDetectedBrowser == "firefox") {
        pc_config = {"iceServers": [{"url": "stun:23.21.150.121"}]};
    }
    this.PeerConnection = new RTCPeerConnection(pc_config, pc_constraints);
    try {
        // Create an RTCPeerConnection via the polyfill (adapter.js).
        
        
       var pc = this.PeerConnection;
       
        this.PeerConnection.onicecandidate = createProxy(this, this.onIceCandidate);
        console.log("Created RTCPeerConnnection with:\n" +
                "  config: \"" + JSON.stringify(pc_config) + "\";\n" +
                "  constraints: \"" + JSON.stringify(pc_constraints) + "\".");
       var Tthis = this;
        if (_isCaller) {
            dataChannel = pc.createDataChannel('DataChannelSend'+this.MyPeerID, {reliable:false});
            dataChannel.onopen = createProxy(this, this.ChannelOpen);
            dataChannel.onmessage = createProxy(this, this.ChannelMessage);
            Tthis.dataChannel = dataChannel;
           // bindEvents(this.dataChannel, this.MyPeerID);
        } else {
           
            pc.ondatachannel = function(e) {
                dataChannel = e.channel;
                dataChannel.onopen = createProxy(Tthis, Tthis.ChannelOpen);
                dataChannel.onmessage = createProxy(Tthis, Tthis.ChannelMessage);
                Tthis.dataChannel = dataChannel;
                //channel.binaryType = 'blob';
                 //bindEvents(Tthis.dataChannel, Tthis.MyPeerID); //now bind the events
            };
        }
        
    } catch (e) {
        console.log("Failed to create PeerConnection, exception: " + e.message);
        alert("Cannot create RTCPeerConnection object; WebRTC is not supported by this browser.");
        return;
    }

    this.PeerConnection.onaddstream = createProxy(this, this.onRemoteStreamAdded);
    this.PeerConnection.onremovestream = createProxy(this, this.onRemoteStreamRemoved);
    
}
 var bindEvents = function(dataChannel,myPeerID) {
                dataChannel.onopen = function() {
                    console.log("finally Channel Open");
                    //dataChannel.send("Hi.....");
                    //dataChannel = this.dataChannel;
                    
                    $('#chatInput').attr('Placeholder','Write in this box and press ENTER to send to '+myPeerID);
                    $('#chatHistory,#chatInput').css('display','block');
                    $("#chatInput").on('keyup',sendEventHandler);
                    //$('#sendMessageBtn').css('display','block').$('#sendMessageBtn')onclick(sendEventHandler);;
                    
                }
                dataChannel.onmessage = function(e) {
                    // add the message to the chat log
                    //console.log();
                    //$('#chatHistory').html()
                    $("#chatHistory").append(e.data);
                    var n = $("#chatHistory").height();
        $("#chatHistory").animate({scrollTop: n}, 50);
    };
    dataChannel = null;
    
}
Connection.prototype.ChannelMessage = function(e) {
            // add the message to the chat log
            //console.log();
            //$('#chatHistory').html()
            $("#chatHistory").append(e.data);
            var n = $("#chatHistory").height();
            $("#chatHistory").animate({scrollTop: n}, 50);
        };
Connection.prototype.ChannelOpen = function () {
            console.log("finally Channel Open");
            //dataChannel.send("Hi.....");
            //dataChannel = this.dataChannel;

            $('#chatInput').attr('Placeholder', 'Write in this box and press ENTER to send to ' + this.MyPeerID);
            $('#chatHistory,#chatInput').css('display', 'block');
            $("#chatInput").unbind('keyup').on('keyup', createProxy(this, this.SendEventHandler));
            //$('#sendMessageBtn').css('display','block').$('#sendMessageBtn')onclick(sendEventHandler);;

        }
Connection.prototype.SendEventHandler = function(e) {
    //if(e.keyCode == 13 && $(this).val().trim() == ''){return;}
    if ((e.keyCode == 13 && e.ctrlKey) ) {
        $(e.target).val($(e.target).val() + '\n');
    } else if(e.keyCode == 13 && e.shiftKey){
        $(e.target).val($(e.target).val() );
    }else if ((e.keyCode == 13 && (!e.ctrlKey || !e.shiftKey ))) {
        if($(e.target).val() == '\n' || ($(e.target).val().length > 0 && $(e.target).val().trim() == '')){$(e.target).val('');return;}
        var msg = "<li><strong>" + myIdentity + ":</strong> " + $(e.target).val().trim().replace(/(\r\n|\n|\r)/gm, "<br>") + "</li>";
        this.dataChannel.send(msg);
        $("#chatHistory").append(msg);
        var n = $("#chatHistory").height();
        $("#chatHistory").animate({scrollTop: n}, 50);
        $(e.target).val('');
    }
};
;
Connection.prototype.onIceCandidate = function(event) {
    console.log("onIceCandidate");
    if (event.candidate) {
        this.sendMessage({type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate});
    } else {
        console.log("End of candidates.");
    }
}

Connection.prototype.onRemoteStreamAdded = function(event) {
    console.log("Remote stream added.");
    this.RemoteStream = event.stream;
    attachMediaStream(this.RemoteVideoTag, event.stream);
}

Connection.prototype.onRemoteStreamRemoved = function(event) {
    this.RemoteStream = null;
    this.RemoteVideoTag.src = "";
    console.log("Remote stream removed.");
}
Connection.prototype.sendMessage = function(message) {
    console.log("sending message: " + message.type + " - " + myIdentity + " - " + this.MyPeerID);
    sendIOMessage(message, this.MyPeerID);
}

Connection.prototype.doCall = function() {
    var constraints = {"optional": [], "mandatory": {}};
    // temporary measure to remove Moz* constraints in Chrome
    if (webrtcDetectedBrowser === "chrome") {
        for (prop in constraints.mandatory) {
            if (prop.indexOf("Moz") != -1) {
                delete constraints.mandatory[prop];
            }
        }
    }
    constraints = mergeConstraints(constraints, sdpConstraints);
    console.log("Sending offer to peer");
    this.PeerConnection.createOffer(createProxy(this, this.setLocalAndSendMessage), function(){console.log('Success offer creation');}, constraints);
}

Connection.prototype.doAnswer = function(msg) {
    this.PeerConnection.setRemoteDescription(new RTCSessionDescription(msg));
    console.log("Sending answer to peer." + this.MyPeerID);
    this.PeerConnection.createAnswer(createProxy(this, this.setLocalAndSendMessage), function(){console.log('Success answer creation');}, sdpConstraints);
}

Connection.prototype.setLocalStream = function(stream) {
    console.log("Adding local stream.");
    this.PeerConnection.addStream(stream);
}


Connection.prototype.setLocalAndSendMessage = function(sessionDescription) {
    // Set Opus as the preferred codec in SDP if Opus is present.
    console.log("setLocalAndSendMessage get called - ", this);
    console.log(sessionDescription);
    sessionDescription.sdp = preferOpus(sessionDescription.sdp);
    this.PeerConnection.setLocalDescription(sessionDescription);
    this.sendMessage({'sd':sessionDescription,'type':sessionDescription.type});
    var TthisConn = this;
     $('#'+this.MyPeerID).find('.video-btn').css('display','none');
    $('#'+this.MyPeerID).find('.video-close-btn').css('display','block');
    
    $('#'+this.MyPeerID).find('.video-close-btn').unbind('click').on('click',function(){
           
            TthisConn.sendMessage({'type':'closeConnection',topic:'closeConnection'});
             //TthisConn.close();
                remoteDivTag.removeChild(document.getElementById("remoteVideo_" + TthisConn.MyPeerID));
                peersArray.splice(peersArray.indexOf(peerFromID(TthisConn.MyPeerID)), 1);
                TthisConn.close();
             $(this).css('display','none');
            //TthisConn.onChannelMessage({'type':'bye','senderID':});
             
        });
}

Connection.prototype.processSignalingMessage = function(msg) {
    if (msg.type === 'answer' && this.Started) {
        this.PeerConnection.setRemoteDescription(new RTCSessionDescription(msg.sd),function(){console.log('Success setRemote desc');},function(e){console.log('Success setRemote desc e:',e);});
    } else if (msg.type === 'candidate' && this.Started) {
        var candidate = new RTCIceCandidate({sdpMLineIndex: msg.label,
            candidate: msg.candidate});
        this.PeerConnection.addIceCandidate(candidate);
    } else if (msg.type === 'closeConnection' && this.Started) {
//       this.PeerConnection.close();
       //if(this.Started){this.sendMessage({'type':'bye',topic:'closeConnection'});this.Started = false}
        remoteDivTag.removeChild(document.getElementById("remoteVideo_" + msg.senderID));
        peersArray.splice(peersArray.indexOf(peerFromID(msg.senderID)), 1);
        this.close();
        
    }
}

Connection.prototype.close = function() {
    
    $('#' + this.MyPeerID).find('.video-close-btn').css('display', 'none');
    $('#' + this.MyPeerID).find('.video-btn').css('display', 'block');
    this.Started = false;
   
    localStream.stop();
    console.log('Connection is closing between you and ' + this.MyPeerID + '!!!!');
    $('#chatInput').val('').css('display', 'none');
    $('#chatHistory').text('').css('display', 'none');
    
    $("#container").css("opacity", "0"); 
    this.dataChannel.close();
    this.PeerConnection.close();
    
}

function initializeCall() {
    $("#container").css("opacity", "1");
    console.log("initializing...");
    card = document.getElementById("card");
    localVideo = document.getElementById("localVideo");
    remoteDivTag = document.getElementById("remote");
    attachMediaStream(localVideo, localStream);
    localVideo.style.opacity = 1;
}

function openChannel() {
    console.log('openChannel called from doc.ready')
    var myURL = parseURL(document.location.href);
    socket = io.connect('http://' + myURL.host + ':' + myURL.port);
    //socket = io.connect('http://localhost:3000');
    socket.on('connect', onChannelOpened);
    socket.on('message', onChannelMessage);
    socket.on('disconnect', onChannelClosed);
    socket.on('reconnect', onChannelReconnected);
    socket.on('recentUser', recentUserEvent);
    socket.on('friendRequest', friendRequestComing);
    socket.on('friendRequestResponse', friendRequestResponse);
    socket.on('alive', function(message) {
        console.log('alive got-responding:', message);
        socket.emit('alive', JSON.stringify(message));
    });
}

function resetStatus() {
    setStatus("Initializing...");
}

function doGetUserMedia() {
    try {
        var constraints = window.constraints = {
  audio: true,
  video: true
};
        navigator.mediaDevices.getUserMedia(constraints).
    then(onUserMediaSuccess).catch(onUserMediaError);

        var constraints = {"mandatory": {}, "optional": []};
        // var getMedia = (navigator.getUserMedia ||
        //                navigator.webkitGetUserMedia ||
        //                navigator.mozGetUserMedia ||
        //                navigator.msGetUserMedia ||
        //                navigator.mediaDevices.getUserMedia);
        // getMedia({'audio': true, 'video': true}, onUserMediaSuccess, onUserMediaError);
        console.log("Requested access to local media with mediaConstraints:\n");
    } catch (e) {
        alert("getUserMedia() failed. Is this a WebRTC capable browser?");
        console.log("getUserMedia failed with exception: " + e.message);
    }
}

function onUserMediaSuccess(stream) {
    console.log("User has granted access to local media.");
    // Call the polyfill wrapper to attach the media stream to this element.
    localStream = stream;

    if (_isCaller) {
        $(".caller-popup").fadeOut("fast");
        onChannelMessage({'type': "call", 'peerID': peerIdentity});
    }
    else {
        $(".calling-popup").fadeOut("fast");
        sendIOMessage({'type': "calling-ack", 'accepted': true}, peerIdentity);
    }
}

function onUserMediaError(error) {
    console.log("Failed to get access to local media. Error code was " + error.code);
    alert("Failed to get access to local media. Error code was " + error.code + ".");
    if (_isCaller) {
        $(".caller-popup").fadeOut("fast");
    }
    else {
        $(".calling-popup").fadeOut("fast");
        sendIOMessage({'type': "calling-ack", 'accepted': false}, peerIdentity);
    }
}

function setStatus(state) {
    footer.innerHTML = state;
}

function mergeConstraints(cons1, cons2) {
    var merged = cons1;
    for (var name in cons2.mandatory) {
        merged.mandatory[name] = cons2.mandatory[name];
    }
    merged.optional.concat(cons2.optional);
    return merged;
}


function onChannelOpened() {
    console.log('Channel opened.');
    channelReady = true;
    sendIOMessage({type: "boot", 'senderID': myIdentity});
}


function incomingCallAccept() {
    doGetUserMedia();
    $("#calling-tone").get(0).pause();
    $("#calling-tone").get(0).currentTime = 0;
}

function incomingCallCancel() {
    $(".calling-popup").fadeOut("fast");
    $("#calling-tone").get(0).pause();
    $("#calling-tone").get(0).currentTime = 0;
    sendIOMessage({'type': "calling-ack", 'accepted': false}, peerIdentity);
}

function outGoingCallCancel() {
    $(".caller-popup").fadeOut("fast");
    $("#caller-tone").get(0).pause();
    $("#caller-tone").get(0).currentTime = 0;
    sendIOMessage({'type': "caller-ack", 'accepted': false}, peerIdentity);
}

function onChannelMessage(msg) {
    
    //var msg = JSON.parse(msg1);
    console.log("receving message: " + msg.type);
    if (msg.type === 'calling') {
        _isCaller = false;
        peerIdentity = msg.senderID;
        console.log("peerIdentity: " + peerIdentity);
        $(".calling-popup").fadeIn("fast");
        $(".called-from").html('Call from ' + msg.senderID);
        $("#calling-tone").get(0).play();
    }
    else if (msg.type === 'calling-ack') {
        if (msg.accepted) {
            doGetUserMedia();
            $("#caller-tone").get(0).pause();
            $("#caller-tone").get(0).currentTime = 0;
        }
        else {
            $(".caller-popup").fadeOut("fast");
            $("#caller-tone").get(0).pause();
            $("#caller-tone").get(0).currentTime = 0;
        }
    }
    else if (msg.type === 'caller-ack') {
        if (!msg.accepted) {
            $(".calling-popup").fadeOut("fast");
            $("#calling-tone").get(0).pause();
            $("#calling-tone").get(0).currentTime = 0;
        }
    }
    else if (msg.type === 'call' || msg.type === 'offer') {
      //  alert('in call offer: calling initializing...');
        initializeCall();
        var peerID = msg.type === 'call' ? msg.peerID : msg.senderID;
        var minvideotag = document.createElement("video");
        minvideotag.setAttribute("src", "");
        minvideotag.setAttribute("autoplay", "true");
        minvideotag.setAttribute("id", "remoteVideo_"+peerID);
        remoteDivTag.appendChild(minvideotag);
        console.log("document.getlele - ", minvideotag);
        var connection = new Connection(peerID, minvideotag);
        console.log('new connection -  ' + connection);
        if (localStream) {
            connection.setLocalStream(localStream);
        }
        peersArray.push(connection);
        if (msg.type === 'call') {
           // alert('in do call calling...');
            connection.doCall();
        }
        else {
           // alert('in answer call calling...');
            connection.doAnswer(msg.sd);
        }
    } else if (msg.type === 'online') {
        var onlineFriends = msg.friends;
        console.log('Got online friend:' + onlineFriends);
        for (var i = 0; i < onlineFriends.length; i++) {
            console.log('setting online friend:' + onlineFriends[i]);
            $('#' + onlineFriends[i]).find('.operation-list').css('display', 'block');
            $('#' + onlineFriends[i]).find('.online-status').removeClass('offline').addClass('online');
            online_friends_number++;
            $('#online_friends_number').html(online_friends_number);
        }

    } else {
        console.log('msg.senderID:' + JSON.stringify(msg.senderID));
        var connection = peerFromID(msg.senderID);
        console.log('get connection -  ' + connection);
        if (connection != null && connection != undefined) {
            connection.processSignalingMessage(msg);
        }
    }
}

// online friends
var online_friends_number = -1;
function recentUserEvent(recentUserEvent) {
    if (recentUserEvent.type === 'recentLogin') {
        $('#' + recentUserEvent.recentLoginID).find('.operation-list').show();
        $('#' + recentUserEvent.recentLoginID).find('.online-status').removeClass('offline').addClass('online');
        online_friends_number++;
        //$('#online_friends_number').html(online_friends_number);
    }
    else if (recentUserEvent.type === 'recentLogout') {
        $('#' + recentUserEvent.recentLogoutID).find('.operation-list').hide();
        $('#' + recentUserEvent.recentLogoutID).find('.online-status').removeClass('online').addClass('offline');
        online_friends_number--;
        $('#online_friends_number').html(online_friends_number);
         onChannelMessage({'type': "bye", 'senderID': recentUserEvent.recentLogoutID});
    }
}

//friend request coming
var req_in;
function friendRequestComing(request) {
    if (request.requestReceiver === myIdentity) {
        req_in = request.requestSender;
        if (req_in === null)
            var req_in_no = 0;
        else
            var req_in_no = req_in.length;
        if (req_in_no === 0) {
            $(".friend-request-no-body").css("display", "none");
            $(".friend-request-no-arrow").css("display", "none");
            $(".noti-icon-in").css("opacity", ".3");
            $(".friend-request-popup-body").html('<div class="friend-request"><span id="requested-name">No request come</span></div>');
        }
        else {
            $(".friend-request-no-arrow").css("display", "block");
            $(".friend-request-no-body").css("display", "block").html(req_in_no);
            $(".noti-icon-in").css("opacity", "1");
            $.ajax({
                url: "get_fullname_for_friend_request",
                type: "GET",
                data: {"req_id": req_in},
                success: function(allName) {
                    $(".friend-request-popup-body").html('');
                    for (var i = 0; i < allName.rows.length; i++)
                        $(".friend-request-popup-body").append('<div class="friend-request"><span id="requested-name">' + allName.rows[i].value + '</span><br><button class="friend-request-btn friend-request-accept-btn" request_id="' + allName.rows[i].key + '">Accept</button><button class="friend-request-btn friend-request-cancel-btn" request_id="' + allName.rows[i].key + '">Cancel</button></div>');
                }
            });
        }
        console.log(req_in_no);
    }
}

// friend request response
var req_out;
function friendRequestResponse(requestResponse) {
    if (requestResponse.requestSenderId === myIdentity) {
        req_out = requestResponse.senderReqOut;
        console.log(JSON.stringify(req_out));
        if (req_out === null)
            var req_out_no = 0;
        else
            var req_out_no = req_out.length;
        if (req_out_no === 0) {
            $(".friend-request-send-no-body").css("display", "none");
            $(".friend-request-send-no-arrow").css("display", "none");
            $(".noti-icon-out").css("opacity", ".3");
            $(".friend-request-send-popup-body").html('<div class="friend-request"><span id="requested-name">No request send</span></div>');
        }
        else {
            $(".friend-request-no-arrow").css("display", "block");
            $(".friend-request-no-body").css("display", "block").html(req_out_no);
            $(".noti-icon-out").css("opacity", "1");
            $.ajax({
                url: "get_fullname_for_friend_request",
                type: "GET",
                data: {"req_id": req_out},
                success: function(allName) {
                    for (var i = 0; i < allName.rows.length; i++)
                        $(".friend-request-send-popup-body").append('<div class="friend-request"><span id="requested-name">' + allName.rows[i].value + '</span><br><button class="friend-request-btn friend-request-send-cancel-btn" request_id="' + allName.rows[i].key + '">Cancel request</button></div>');
                }
            });
        }
        console.log(req_out_no);
        
        if(typeof(requestResponse.senderFriends) !== 'undefined' && requestResponse.senderFriends.length !== 0){
                var fndArray = new Array();
                fndArray.push(requestResponse.senderFriends);
                $.ajax({
                    url: "get_fullname_for_friend_request",
                    type: "GET",
                    data: {"req_id":fndArray },
                    success: function(allfnds) {
                            $("#popup-list-total-fnd").append(
                                '<div id="' + allfnds.rows[0].id + '"  class="popup-list-friend-div">' +
                                '<button class="popup-list-single-fnd">' + allfnds.rows[0].value +
                                '<div class="online-status '+requestResponse.recentJoinFriendStatus+'"></div>' +
                                '</button>' +
                                '<ul class="operation-list ' + allfnds.rows[0].id + '" style="display:'+requestResponse.operationListStatus+'">' +
                                '<li class="video-btn ' + allfnds.rows[0].id + '" peerIdentity="' + allfnds.rows[0].id + '" >Video Call</li>' +
                                '<li class="video-close-btn ' + allfnds.rows[0].id + '" peerIdentity="' + allfnds.rows[0].id + '" style="display:none" >End Call</li>' +
//                                             '<li class="call-btn '+allfnds.rows[i].id+'" peerIdentity="'+allfnds.rows[i].id+'" >Call</li>'+
//                                            '<li id="chat-btn" peerIdentity="'+allfnds.rows[i].id+'" class="'+allfnds.rows[i].id+'">Chat</li>'+
                                '</ul>' +
                                '</div>'
                             );
                        
                    }
                });
                          
         }
    }
}


function onChannelError() {
    console.log('Channel error.');
}
function onChannelClosed() {
    console.log('Channel closed.');
    //window.location.reload();
}
function onChannelReconnected(){
    window.location.reload();
}


function onHangup() {
    console.log("Hanging up.");
    transitionToDone();
    stop();
    // will trigger BYE from server
    if (socket != null && socket != undefined) {
        socket.close();
    }
}

function onRemoteHangup() {
    console.log('Session terminated.');
    transitionToWaiting();
    stop();
}

function stop() {
    started = false;
    isAudioMuted = false;
    isVideoMuted = false;
    pc.close();
    pc = null;
}

function waitForRemoteVideo() {
    // Call the getVideoTracks method via adapter.js.
    videoTracks = remoteStream.getVideoTracks();
    if (videoTracks.length === 0 || remoteVideo.currentTime > 0) {
        transitionToActive();
    } else {
        setTimeout(waitForRemoteVideo, 100);
    }
}
function transitionToActive() {
    remoteVideo.style.opacity = 1;
    card.style.webkitTransform = "rotateY(180deg)";
    setTimeout(function() {
        localVideo.src = "";
    }, 500);
    setTimeout(function() {
        miniVideo.style.opacity = 1;
    }, 1000);
    setStatus("<input type=\"button\" id=\"hangup\" value=\"Hang up\" onclick=\"onHangup()\" />");
}
function transitionToWaiting() {
    card.style.webkitTransform = "rotateY(0deg)";
    setTimeout(function() {
        localVideo.src = miniVideo.src;
        miniVideo.src = "";
        remoteVideo.src = ""
    }, 500);
    miniVideo.style.opacity = 0;
    remoteVideo.style.opacity = 0;
    resetStatus();
}
function transitionToDone() {
    localVideo.style.opacity = 0;
    remoteVideo.style.opacity = 0;
    miniVideo.style.opacity = 0;
}
function enterFullScreen() {
    container.webkitRequestFullScreen();
}

function toggleVideoMute() {
    // Call the getVideoTracks method via adapter.js.
    videoTracks = localStream.getVideoTracks();

    if (videoTracks.length === 0) {
        console.log("No local video available.");
        return;
    }

    if (isVideoMuted) {
        for (i = 0; i < videoTracks.length; i++) {
            videoTracks[i].enabled = true;
        }
        console.log("Video unmuted.");
    } else {
        for (i = 0; i < videoTracks.length; i++) {
            videoTracks[i].enabled = false;
        }
        console.log("Video muted.");
    }

    isVideoMuted = !isVideoMuted;
}

function toggleAudioMute() {
    // Call the getAudioTracks method via adapter.js.
    audioTracks = localStream.getAudioTracks();

    if (audioTracks.length === 0) {
        console.log("No local audio available.");
        return;
    }

    if (isAudioMuted) {
        for (i = 0; i < audioTracks.length; i++) {
            audioTracks[i].enabled = true;
        }
        console.log("Audio unmuted.");
    } else {
        for (i = 0; i < audioTracks.length; i++) {
            audioTracks[i].enabled = false;
        }
        console.log("Audio muted.");
    }

    isAudioMuted = !isAudioMuted;
}


// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
    var sdpLines = sdp.split('\r\n');

    // Search for m line.
    for (var i = 0; i < sdpLines.length; i++) {
        if (sdpLines[i].search('m=audio') !== -1) {
            var mLineIndex = i;
            break;
        }
    }
    if (mLineIndex === null)
        return sdp;

    // If Opus is available, set it as the default in m line.
    for (var i = 0; i < sdpLines.length; i++) {
        if (sdpLines[i].search('opus/48000') !== -1) {
            var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
            if (opusPayload)
                sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
            break;
        }
    }

    // Remove CN in m line and sdp.
    sdpLines = removeCN(sdpLines, mLineIndex);

    sdp = sdpLines.join('\r\n');
    return sdp;
}

function extractSdp(sdpLine, pattern) {
    var result = sdpLine.match(pattern);
    return (result && result.length == 2) ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
    var elements = mLine.split(' ');
    var newLine = new Array();
    var index = 0;
    for (var i = 0; i < elements.length; i++) {
        if (index === 3) // Format of media starts from the fourth.
            newLine[index++] = payload; // Put target payload to the first.
        if (elements[i] !== payload)
            newLine[index++] = elements[i];
    }
    return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
    var mLineElements = sdpLines[mLineIndex].split(' ');
    // Scan from end for the convenience of removing an item.
    for (var i = sdpLines.length - 1; i >= 0; i--) {
        var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
        if (payload) {
            var cnPos = mLineElements.indexOf(payload);
            if (cnPos !== -1) {
                // Remove CN payload from m line.
                mLineElements.splice(cnPos, 1);
            }
            // Remove CN line in sdp
            sdpLines.splice(i, 1);
        }
    }

    sdpLines[mLineIndex] = mLineElements.join(' ');
    return sdpLines;
}


// Send BYE on refreshing(or leaving) a demo page
// to ensure the room is cleaned for next session.
//window.onbeforeunload = closeForUnload;
  
//$(body).unload(function() {
//                if(event.clientY < 0) {
//                    return "Yes";
//                    //do whatever you want when closing the window..
//                }
//            });
// Ctrl-D: toggle audio mute; Ctrl-E: toggle video mute.
// On Mac, Command key is instead of Ctrl.
// Return false to screen out original Chrome shortcuts.
document.onkeydown = function() {
    return;
    if (navigator.appVersion.indexOf("Mac") != -1) {
        if (event.metaKey && event.keyCode === 68) {
            toggleAudioMute();
            return false;
        }
        if (event.metaKey && event.keyCode === 69) {
            toggleVideoMute();
            return false;
        }
    } else {
        if (event.ctrlKey && event.keyCode === 68) {
            toggleAudioMute();
            return false;
        }
        if (event.ctrlKey && event.keyCode === 69) {
            toggleVideoMute();
            return false;
        }
    }
}
