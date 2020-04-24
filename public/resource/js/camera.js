$(function () {
    $.getScript('https://cdnjs.cloudflare.com/ajax/libs/exif-js/2.3.0/exif.min.js');

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
        !browser.versions.mobile && !browser.versions.ios && !browser.versions.android &&
        !browser.versions.iPhone && !browser.versions.iPad) {
        // pc client
        const constraints = {
            video: {
                width: {
                    min: 256,
                    exact: 256
                },
                height: {
                    min: 256,
                    exact: 256
                }
            }
        };

        const video = document.querySelector('video#camera-handler');
        navigator.mediaDevices.getUserMedia(constraints).
        then((stream) => {
            video.srcObject = stream
        });

        $("#pnl-photo>video#camera-handler").show();
        $("button#btn-take").on('click', function () {
            let canvas = document.querySelector('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);

            $("#pnl-photo>#img-preview>img").prop('src', canvas.toDataURL('image/jpeg'));
            $("#pnl-photo>video#camera-handler").hide();
            $("#pnl-photo>#img-preview").show();

            $("#pnl-photo>input#tb-image-name").val(`cam-capture-${new Date().getTime()}.jpg`);
            $("#pnl-photo>input#tb-image-base64").val(canvas.toDataURL('image/jpeg'));

            $("button#btn-submit").click();
        });
    } else {
        // mobile
        $uploader = $("#pnl-photo>#tb-photo");
        $("button#btn-take").hide();

        $("#pnl-photo>#svg-take-photo").show().on("click", function () {
            $uploader.click();
        });
        $("#pnl-photo>#img-preview").on("click", function () {
            $uploader.click();
        });

        $uploader.change(function (e) {
            var src;
            var url = window.URL || window.webkitURL || window.mozURL;
            var files = e.target.files;

            for (var i = 0; i < files.length; ++i) {
                var file = files[i];
                console.log(file)

                if (url) {
                    src = url.createObjectURL(file);
                } else {
                    src = e.target.result;
                }

                let fr = new FileReader();
                fr.onload = () => {
                    let img = new Image();
                    img.onload = () => {
                        // let canvas = document.querySelector('canvas');
                        // canvas.width = img.width;
                        // canvas.height = img.height;
                        // let ctx = canvas.getContext("2d");
                        // ctx.drawImage(img, 0, 0);

                        // read file metadata
                        var orient = getPhotoOrientation(img);
                        console.log('orient:', orient);

                        let canvas = document.querySelector("canvas");
                        ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;

                        ctx.drawImage(img, 0, 0, img.width, img.height);

                        // force to rotate -90
                        // canvas.width = img.height;
                        // canvas.height = img.width;
                        // ctx.rotate(3 * Math.PI / 2);
                        // ctx.drawImage(img, -(img.width), 0, img.width, img.height);


                        // if (orient && orient > 0) {
                        //     alert('orient if:', orient);
                        //     switch (orient) {
                        //         case 1:
                        //             ctx.drawImage(img, 0, 0, img.width, img.height);
                        //             break;
                        //         case 6:     // 旋转90度
                        //             canvas.width = img.height;
                        //             canvas.height = img.width;
                        //             ctx.rotate(Math.PI / 2);
                        //             // (0,-imgHeight) 从旋转原理图那里获得的起始点
                        //             ctx.drawImage(img, 0, -(img.height), img.width, img.height);
                        //             break;
                        //         case 3:     // 旋转180度
                        //             ctx.rotate(Math.PI);
                        //             ctx.drawImage(img, -(img.width), -(img.height), img.width, img.height);
                        //             break;
                        //         case 8:     // 旋转-90度
                        //             canvas.width = img.height;
                        //             canvas.height = img.width;
                        //             ctx.rotate(3 * Math.PI / 2);
                        //             ctx.drawImage(img, -(img.width), 0, img.width, img.height);
                        //             break;
                        //         // default:
                        //         //     canvas.width = img.height;
                        //         //     canvas.height = img.width;
                        //         //     ctx.rotate(3 * Math.PI / 2);
                        //         //     ctx.drawImage(img, -(img.width), 0, img.width, img.height);
                        //     }                
                        // } else {
                        //     alert('orient else:', 'force rotate -90');
                        //     // force to rotate -90
                        //     canvas.width = img.height;
                        //     canvas.height = img.width;
                        //     ctx.rotate(3 * Math.PI / 2);
                        //     ctx.drawImage(img, -(img.width), 0, img.width, img.height);
                        // }

                        $("#pnl-photo>input#tb-image-name").val(file.name);
                        $("#pnl-photo>input#tb-image-base64").val(canvas.toDataURL(file.type));
                        // click the submit button after loading the image
                        $("button#btn-submit").click();
                    };

                    img.src = fr.result;
                    $("#pnl-photo>#img-preview>img").prop("src", img.src);
                };
                fr.readAsDataURL(file);
            }

            $("#pnl-photo>#svg-take-photo").hide();
            $("#pnl-photo>#img-preview").show();
        });
    }
});

function cavasToBlob(dataURL) {
    var blobBin = atob(dataURL.split(',')[1]);
    var array = [];
    for (let i = 0; i < blobBin.length; i++) {
        array.push(blobBin.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], {
        type: 'image/png'
    });
}

//获取照片的元信息（拍摄方向）
function getPhotoOrientation(img) {
    var orient;
    EXIF.getData(img, function () {
        orient = EXIF.getTag(this, "Orientation");
    });
    return orient;
}