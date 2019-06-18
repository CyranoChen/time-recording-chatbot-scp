$(function () {
    $.getScript('https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.4.1/js/bootstrap.min.js');
    $.getScript('https://cdnjs.cloudflare.com/ajax/libs/admin-lte/2.4.10/js/adminlte.min.js');

    // load shared web parts
    $("#header").load("./shared/header.html");
    $("#footer").load("./shared/footer.html");
});