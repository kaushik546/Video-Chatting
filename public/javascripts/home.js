$(document).ready(function() {
    // search friends dialog-------------------------
    $(function() {
        $("#dialog").dialog({
            autoOpen: false,
            modal: true,
            show: {
                effect: "blind",
                duration: 500
            },
            hide: {
                effect: "explode",
                duration: 500
            }
        });
    });

    $(".add-new-btn").click(function() {
        $("#search-fnd").val("");
        $("#found-fnd").empty();
        $("#add-user-btn").hide();
        $.ajax({
            url: "check_session",
            type: "GET",
            success: function(session_status) {
                if (session_status == "y") {
                    $("#dialog").dialog("open");
                }
                else if (session_status == "n") {
                    window.location = "login";
                }
            }
        });
    });

});
function parseURL(url) {
    var globaltextevent = '';
    var a = document.createElement('a');
    a.href = url;
    return {
        source: url,
        host: a.hostname,
        port: a.port
    };
}
