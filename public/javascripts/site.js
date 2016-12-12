/**
 * Created by alexey-dev on 31.10.16.
 */
$(document).ready(function () {
    var width = $('body > div.container-fluid > div:nth-child(2) > div > table > tbody > tr:nth-child(1) > td:nth-child(1)').width();
    $('.taskCard').css('width', width);
    $(".droppable").droppable({
        accept: '.draggable',
        hoverClass: "drop-hover",
        drop: function (event, ui) {
            $(this).append(ui.draggable);
            $.ajax({
                method: "POST",
                url: "/change-state",
                data: {id: ui.draggable.data('id'), status: $(this).data('status')}
            })
                .done(function (msg) {
                    alertify.success("Статус задачи успешно изменен!");
                })
                .fail(function (msg) {
                    alertify.error("Случилась ошибка операции!");
                })
        }
    });
    $(".draggable").draggable({
        helper: "clone",
        axis: "x",
        cursor: "crosshair",
        opacity: 0.45
    });

});
function removeTask(taskID) {
    "use strict";
    $.ajax({
        method: "POST",
        url: "/removeTask",
        data: {id: taskID}
    })
        .done(function (id) {
            alertify.success("Задача успешно удалена");
            window.location.replace('/board?project=' + id.id);
        })
        .fail(function (id) {
            alertify.error("Случилась ошибка операции!");
            window.location.replace('/board?project=' + id.id);
        })
}
function executeTask(taskID) {
    "use strict";
    $.ajax({
        method: "POST",
        url: "/executeTask",
        data: {id: taskID}
    })
        .done(function (successInfo) {
            $("#execute").html("<h3>Задача в разработке</h3>");
            alertify.success(successInfo.successInfo);
        })
        .fail(function (errInfo) {
            alertify.error(errInfo.responseJSON.errInfo);
        })
}
function removeProject(projectID) {
    "use strict";
    $.ajax({
        method: "POST",
        url: "/removeProject",
        data: {id: projectID}
    })
        .done(function (msg) {
            alertify.success("Проект успешно удален");
            window.location.replace("/profile");
        })
        .fail(function (msg) {
            alertify.error("Случилась ошибка операции!");
            window.location.replace("/profile");
        })
}
function fireLogout() {
    $.post("/logout")
        .done(function () {
            "use strict";
            window.location.replace("/");
        })
        .fail(function () {
            "use strict";
            alertify.error("Случилась ошибка операции!");
        })
}
$(document).on('focusin', function (e) {
    if ($(e.target).closest(".mce-window").length) {
        e.stopImmediatePropagation();
    }
});

