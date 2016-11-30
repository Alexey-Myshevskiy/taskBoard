const express = require('express'),
    router = express.Router(),
    os = require('os'),
    fs = require('fs'),
    path = require('path'),
    multer = require('multer'),
    Task = require('../models/Task').Task,
    User = require('../models/Task').User,
    pug = require('pug'),
    async = require('async');

const upload = multer({dest: os.tmpdir()});// save to system tmp dir

router.get('/', function (req, res) {
    "use strict";
    res.render('welcome');
});
router.get('/registerpage', function (req, res) {
    "use strict";
    res.render('register');
});
router.get('/personalarea', function (req, res) {
    "use strict";
    if (req.session.user) {
        Task.find({}, function (err, alltask) {
            if (err) {
                console.error(err);
                res.statusCode(500);
            }
            else{
                console.log(alltask);
                User.findById(req.session.user._id, function (err, person) {
                    if (err) {
                        console.error(err);
                        res.statusCode(500);
                    }
                    else {
                        res.render('personalarea',{person : person,
                            alltask : alltask });
                    }
                });
            }
        });

    }
    else {
        res.redirect("/");
    }
});
router.post('/registerme', function (req, res) {
    "use strict";
    req.check('username','Длина имени должна быть 4-12 символов').isLength({min : 4, max : 12});
    req.check('useremail','Неверный e-mail').isEmail();
    req.check('userpassword','Длина пароля должна быть 4-12 символов').isLength({min : 4, max : 12});
    req.check('confirmpassword','Пароли не совпадают').equals(req.body.userpassword);

    var errors = req.validationErrors();

    if(errors){
        res.render('register',{errors : errors,
                                username : req.body.username,
                                useremail : req.body.useremail,
                                userpassword :req.body.userpassword,
                                confirmpassword : req.body.confirmpassword});
    }
    else {
        User.findByEmail(req.body.email, (error, user)=>{
            if(user){
                let errors={}
                    errors.msg = "Пользователь с таким е-мейл уже существует";
                    errors.param = "useremail";
                res.render('register',{errors :errors,
                    username : req.body.username,
                    useremail : req.body.useremail,
                    userpassword :req.body.userpassword,
                    confirmpassword : req.body.confirmpassword});
            }
            else{
                User.create({
                    name: req.body.username,
                    email: req.body.useremail,
                    password: req.body.userpassword
                }, (err, savedObject) => {
                    if (err) {
                        console.error(err);
                    }
                    else {
                        req.session.user = savedObject;
                        req.session.save(function (err) {
                            if (err) {
                                console.error(err);
                            }
                            else {
                                console.log(savedObject);
                                res.redirect("/board");
                            }
                        });
                    }
                })
            }
        })

    }
});

/* GET board page. */
router.get('/board', function (req, res) {
    console.log(req.user);
    if (req.session.user) {
        Task.find({}, function (err, tasks) {
            if (err) {
                console.error(err);
                res.statusCode(500);
            }
            else {
                res.render('index', {tasks: tasks, username : req.session.user.name});
            }
        });
    }
    else {
        res.redirect("/");
    }
});
router.get('/logout', (req, res) => {
    "use strict";
    // req.logout();
    delete req.session.user;
    res.redirect("/");
});
router.post('/create', upload.array('files', 4), function (req, res) {
    "use strict";
    var date = Date.now();
    console.log(req.body);
    if (req.files.length > 0) {
        let arrayOfTask = [];
        req.files.forEach((elem) => {
            arrayOfTask.push((callback) => {
                fs.readFile(elem.path, (err, content) => {
                    if (!err) {
                        fs.writeFile(path.join(__dirname, '../public/images/') + date + "_" + elem.originalname , content, (err) => {
                            if (err) {
                                callback(err, null);
                            }
                            else {
                                callback(null, "images/" + date + "_" + elem.originalname);
                            }
                        })
                    }
                    else {
                        console.error(err);
                    }
                })
            });
        });

        async.parallel(arrayOfTask, (err, results) => {
            Task.create({
                description: req.body.description,
                priority: req.body.priority,
                images: results
            }, (err, object) => {
                if (err) {
                    console.error(err);
                    res.sendStatus(500);
                }
                object.dateOfcreation = req.app.locals.performDate(object.dateOfcreation);
                let template = pug.renderFile(path.join(__dirname, '../models/taskCard.pug'), {task: object});
                res.status(201).json({html: template});
            });
        })

    } else {
        Task.create({
            description: req.body.description,
            priority: req.body.priority
        }, function (err, object) {
            if (err) {
                console.error(err);
            }
            object.date = req.app.locals.performDate(object.dateOfcreation);
            let template = pug.renderFile(path.join(__dirname, '../models/taskCard.pug'), {task: object});
            res.status(201).json({html: template});
        });
    }

});
router.post('/change-state', function (req, res) {
    Task.findById(req.body.id, function (err, doc) {
        if (err) {
            res.sendStatus(404);
        }
        doc.status = req.body.status;
        doc.save(function (err) {
            if (err) res.sendStatus(500);
            res.sendStatus(200);
        });
    });
});
router.post('/change-avatar', upload.array('avatar', 1),function (req, res, next) {

    console.log(req);
    console.log(req.files[0].originalname);
    var filePath = req.files[0].path;
    var original = req.files[0].originalname;
    fs.readFile(filePath, function (err, content) {
        if(err){
            console.log(1);
            res.sendStatus(500);
        }
        else {
            fs.writeFile(path.join(__dirname, '../public/images/avatars/')+ original, content, function (err) {
                console.log(path.join(__dirname, '../public/images/avatars/') + original);
                if(err){
                    res.sendStatus(500);
                }
                else {
                    User.findByIdAndUpdate(req.session.user._id, {
                            $set: {
                                avatar: "images/avatars/" + original,
                            }
                        },
                        {new: true},
                        function (err) {
                            if (err) {
                                console.error(err);
                            }
                            else {
                                User.findById(req.session.user._id, function (err, person) {
                                    if (err) {
                                        console.error(err);
                                        res.statusCode(500);
                                    }
                                    else {
                                        res.status(201).json({person: person.avatar});
                                    }
                                });
                            }
                        });
                }
            })
        }
    })
});
router.post('/change-password', function (req, res) {
    req.check('password', 'Длина пароля должна быть 4-12 символов').isLength({min: 4, max: 12});
    req.check('confirmpassword', 'Пароли не совпадают').equals(req.body.password);

    var errors = req.validationErrors();
    User.findById(req.session.user._id, function (err, person) {
        if (err) {
            console.error(err);
            res.status(500).json({errInfo: "Ошибка!"});
        }
        else {
            if (person.password === req.body.oldpassword) {
                if (!errors) {
                    User.findByIdAndUpdate(req.session.user._id, {
                            $set: {
                                password: req.body.password
                            }
                        },
                        {new: true},
                        function (err) {
                            if (err) {
                                console.error(err);
                                res.status(500).json({errInfo: "Ошибка!"});
                            }
                            else{
                                res.sendStatus(200);
                            }

                        });
                }
                else{
                    console.log("Have validation errors");
                    res.status(500).json({errInfo: errors});
                }

            }
            else{
                console.log("wrong old password");
                res.status(500).json({errInfo: "Неправильный пароль"});
            }
        }
    });

});
router.post('/change-info', function (req, res) {
    User.findByIdAndUpdate(req.session.user._id, {
            $set: {
                name: req.body.name,
                surname: req.body.surname
            }
        },
        {new: true},
        function (err) {
            if (err) {
                console.error(err);
            }
            else {
                User.findById(req.session.user._id, function (err, info) {
                    if (err) {
                        console.error(err);
                        res.statusCode(500);
                    }
                    else {
                        res.status(201).json({info: info});
                    }
                });
            }
        });
});
router.post('/change-contacts', function (req, res) {
    req.check('contemail','Неверный e-mail').isEmail();

    var errors = req.validationErrors();
    if(!errors){
        User.findByIdAndUpdate(req.session.user._id, {
                $set: {
                    email: req.body.contemail,
                    tel: req.body.conttel,
                    skype: req.body.skype
                }
            },
            {new: true},
            function (err) {
                if (err) {
                    console.error(err);
                }
                else {
                    User.findById(req.session.user._id, function (err, cont) {
                        if (err) {
                            console.error(err);
                            res.statusCode(500);
                        }
                        else {
                            res.status(201).json({cont: cont});
                        }
                    });
                }
            });
    }
    else{
        res.status(500).json({errInfo: errors});
    }

});
router.get('/task/:id', function (req, res, next) {

    Task.findById(req.params.id, function (err, doc) {
        if (err) next(err);
        res.render('taskdesk', {task: doc})
    })
});
router.post("/remove", function (req, res) {
    "use strict";
    if (!req.body.id) res.sendStatus(400);
    Task.findById(req.body.id, function (err, doc) {
        var filesArray = doc.images;
        for (var i = 0; i < filesArray.length; i++) {
            fs.unlink(path.join(__dirname, '../public/') + filesArray[i], (err) => {
                if (err) res.sendStatus(500);
            });
        }
        Task.remove({_id: req.body.id}, function (err) {
            if (err) {
                res.sendStatus(500);
            }
            else {
                res.sendStatus(200);
            }
        })

    });
});

module.exports = router;
