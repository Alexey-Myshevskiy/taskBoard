import express from "express";
import os from "os";
import fs from "fs";
import path from "path";
import multer from "multer";
import {Task, User, Project} from "../models/Task";
import pug from "pug";
import async from "async";
import underscore from "underscore";
import mongoose from "mongoose";
const router = express.Router();

const upload = multer({dest: os.tmpdir()});// save to system tmp dir

router.get('/', (req, res) => {
    "use strict";
    res.render('welcome',{user: req.session.user});
});
router.get('/login',(req, res)=>{
    "use strict";
    if (req.session.user) {
        res.redirect("/profile");
    }
    else{
        res.render("loginform");
    }
});
router.get('/contacts',(req, res)=>{
    "use strict";
    console.log(req.session.user);
    if (req.session.user) {
        User.findById(req.session.user._id, function (err, user) {
            if (err) {
                console.error(err);
                res.statusCode(500);
            }
            else {
                res.render('contacts',{user: user});
            }
        });


    }
    else{
        res.redirect("/register");
    }
});
router.get('/register', (req,res)=>{
    "use strict";
    res.render("registerform");
});
router.post('/registerme', (req, res) => {
    /*
     const UserModel = new Schema({
     name:  String,
     surname: String,
     avatar:{ type: String, default: '/images/avatars/no-avatar_jpg.jpg' },
     email:  String,
     tel: { type: String, default: '-'},
     skype: { type: String, default: '-'},
     password: String,
     tasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }]
     });
     */
    "use strict";
    req.check('userFirstName', 'Длина имени должна быть 2-12 символов').isLength({min: 2, max: 12});
    req.check('userLastName', 'Длина фамилии должна быть 2-12 символов').isLength({min: 2, max: 12});
    req.check('userEmail', 'Введите действующий e-mail').isEmail();
    req.check('password', 'Длина пароля должна быть 4-12 символов').isLength({min: 4, max: 12});

    let errors = req.validationErrors();

    if(errors.length < 3) {
        User.findOne({email: req.body.userEmail}, (err, user) => {
            if (!user) {
                User.create({
                    name: req.body.userFirstName,
                    surname: req.body.userLastName,
                    email: req.body.userEmail,
                    password: req.body.password
                }, (err, savedObject) => {
                    if (err) {
                        console.error(err);
                    }
                    else {
                        req.session.user = savedObject;
                        req.session.save((err) => {
                            if (err) {
                                console.error(err);
                            }
                            else {
                                console.log(savedObject);
                                res.redirect("/profile");
                            }
                        });
                    }
                })
            }
            else {
                res.status(500).json({errInfo: "Пользователь с таким е-мейлом существует!"});
            }
        });
    }
    else{
        res.status(500).json({errInfo: "Введите коректные данные!"});
    }

});
router.get('/profile',(req,res)=>{
    "use strict";
    if(req.session.user){
        User
            .findById(req.session.user._id)
            .populate('projects') // only works if we pushed refs to children
            .populate('tasks')
            .exec((err, person) => {
                if (err) next(err);
                console.log(person);
                res.render("profile", {user: person});
            });

    }
    else{
        res.redirect("/login");
    }
});
/* GET board page. */
router.get('/board', (req, res) => {
    if (req.session.user) {
        Project
            .findOne({ _id: req.query.project })
            .populate('tasks') // only works if we pushed refs to children
            .exec(function (err, tasks) {
                if (err) {
                    console.error(err);
                    res.statusCode(500);
                }
                else {
                    //console.log(tasks);
                    Project
                        .findById(req.query.project)
                        .populate('users')
                        .exec(function (err, users) {
                            if (err) {
                                console.error(err);
                                res.statusCode(500);
                            }
                            else{
                                res.render('index', {user: req.session.user, tasks: tasks.tasks, ownerProject: req.query.project, projectUsers: users.users});
                            }
                        });
                   /*User.find({tasks : req.query.project}.where(req.query.project).in(['tasks']), (err, user) => {
                        console.log(req.query.project);
                        console.log(user);
                    });*/
                }
            })

    }
    else {
        res.redirect("/login");
    }
});
router.get('/logout', (req, res) => {
    "use strict";
    // req.logout();
    delete req.session.user;
    req.session.save((err) => {
        if (err) {
            console.error(err);
            res.redirect('/');
        }
        else {
            res.redirect("/");
        }
    });
});
router.post('/create', upload.array('files', 4), (req, res, next) => {
    "use strict";

/*    var headers = req.headers.referer,
        projectID = headers.split("=");*/

    //console.log(projectID[1]);
    if (req.files.length > 0) {
        let arrayOfTask = [];
        req.files.forEach((elem) => {
            arrayOfTask.push((callback) => {
                fs.readFile(elem.path, (err, content) => {
                    if (!err) {
                        fs.writeFile(path.join(__dirname, '../public/images/') + elem.originalname, content, (err) => {
                            if (err) {
                                callback(err, null);
                            }
                            else {
                                callback(null, "images/" + elem.originalname);
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
                project: req.body.ownerProject,
                description: req.body.description,
                priority: req.body.priority,
                images: results
            }, (err, object) => {
                if (err) {
                    console.error(err);
                    res.sendStatus(500);
                }
                else {
                    Project.findOne({_id: req.body.ownerProject}, (err, doc) => {
                        doc.tasks.push(object);
                        doc.save((err) => {
                            if(err){
                                next(err);
                            }
                            else{
                                res.status(200);
                            }
                        });
                    })
                }
                object.dateOfcreation = req.app.locals.performDate(object.dateOfcreation);
                let template = pug.renderFile(path.join(__dirname, '../models/taskCard.pug'), {task: object});
                res.status(201).json({html: template});
            });
        })

    } else {

        console.log(req.body);
        Task.create({
            project: req.body.ownerProject,
            description: req.body.description,
            priority: req.body.priority
        }, (err, object) => {
            if (err) {
                console.error(err);
            }
            else {
                Project.findOne({_id: req.body.ownerProject}, (err, doc) => {
                    doc.tasks.push(object);
                    doc.save((err) => {
                        if(err){
                            console.log(err);
                        }
                        else{
                            res.status(200);
                        }
                    });
                })
            }
            object.date = req.app.locals.performDate(object.dateOfcreation);
            let template = pug.renderFile(path.join(__dirname, '../models/taskCard.pug'), {task: object});
            res.status(201).json({html: template});
        });
    }

});
router.post('/change-state', (req, res) => {
    Task.findById(req.body.id, (err, doc) => {
        if (err) {
            res.sendStatus(404);
        }
        doc.status = req.body.status;
        doc.save(err => {
            if (err) res.sendStatus(500);
            res.sendStatus(200);
        });
    });
});
router.post('/change-avatar', upload.array('avatar', 1),function (req, res, next) {

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
    req.check('confirmPassword', 'Пароли не совпадают').equals(req.body.password);

    var errors = req.validationErrors();
    User.findById(req.session.user._id, function (err, person) {
        if (err) {
            console.error(err);
            res.status(500).json({errInfo: "Ошибка!"});
        }
        else {
            if (person.password === req.body.oldPassword) {
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
    req.check('userFirstName', 'Длина имени должна быть 2-12 символов').isLength({min: 2, max: 12});
    req.check('userLastName', 'Длина фамилии должна быть 2-12 символов').isLength({min: 2, max: 12});
    var errors = req.validationErrors();
    if(!errors) {User.findByIdAndUpdate(req.session.user._id, {
            $set: {
                name: req.body.userFirstName,
                surname: req.body.userLastName
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
                        res.sendStatus(200);
                    }
                });
            }
        });
    }
    else{
        res.status(500).json({errInfo: "Длина имени или фамилии должна быть 2-12 символов"});
    }

});
router.post('/change-contacts', function (req, res) {
    req.check('userTelephone', 'Длина телефона должна быть 3-16 символов').isLength({min: 3, max: 16});
    req.check('userSkype', 'Длина Skype должна быть 3-16 символов').isLength({min: 3, max: 16});
    var errors = req.validationErrors();
    if(!errors) {
        User.findByIdAndUpdate(req.session.user._id, {
                $set: {
                    tel: req.body.userTelephone,
                    skype: req.body.userSkype
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
                            res.sendStatus(200);
                        }
                    });
                }
            })
    }
    else{
        res.status(500).json({errInfo: "Длина телефона или Skypa должна быть 3-16 символов"});
    }



});
router.get('/task/:id', (req, res, next) => {

    Task.findById(req.params.id, (err, doc) => {
        if (err) next(err);
        res.render('taskdesk', {task: doc, user: req.session.user});
    })
});
router.post('/login', (req, res) => {
    "use strict";
    User.findByEmail(req.body.username, (err, user) => {
        if (err) {
            res.redirect('/');
        }
        else {
            req.session.user = user;
            req.session.save((err) => {
                if (err) {
                    console.error(err);
                    res.redirect('/');
                }
                else {
                    res.redirect("/profile");
                }
            });
        }
    })
});
router.post('/searchUser', (req, res) => {
    "use strict";
    Project.findById(req.body.ownerProject, (err, project) => {
            if (err) {
                res.status(500).json({errInfo: "Проект был удален!"});
            }
            else {
                if(project.owner_id==req.session.user._id){
                    //if(project.users.)
                    User.findOne({email : req.body.searchPerson}, (err, user) => {
                        var simmilars = underscore.find(project.users,function (personFind) {
                            return personFind.toString()===user._id.toString()
                        });
                        if(!simmilars) {
                            if (user !== null) {
                                user.projects.push(req.body.ownerProject);
                                user.save((err) => {
                                    if (err) {
                                        res.status(500).json({errInfo: "Ошибка записи пользователя!"});
                                    }
                                    else {
                                        Project.findById(req.body.ownerProject, (err, project) => {
                                            project.users.push(user._id);
                                            project.save((err) => {
                                                if (err) {
                                                    res.status(500).json({errInfo: "Ошибка записи проекта!"});
                                                }
                                                else {
                                                    res.status(200).json({emailInfo: req.body.searchPerson});
                                                }
                                            })
                                        });
                                    }
                                });
                            }

                            else {
                                res.status(500).json({errInfo: "Такого пользователя не существует!"});
                            }
                        }
                        else{
                            res.status(500).json({errInfo: "Пользователь уже добавлен к проекту!"});
                        }
                    })
                }
                else{
                    res.status(500).json({errInfo: "Вы не являетесь автором этого проекта!"});
                }
            }
        })
    //if(req.body.ownerProject==req.session.user._id){}

});
router.post('/executeTask', (req, res) => {
    "use strict"
    Task.findById(req.body.id, (err, task) => {
        console.log(task.executant_id);
        if(!task.executant_id){
            task.executant_id = req.session.user._id;
            task.save((err) => {
                if (err) {
                    res.status(500).json({errInfo: "Не удалось взять задачу!"});
                }
                else {
                    User
                        .findById(req.session.user._id)
                        .populate('tasks')
                        .exec((err, user) => {
                            var simmilars = underscore.find(user.tasks,(taskFind) => {
                                return taskFind._id.toString() === req.body.id.toString()
                            });
                            if(!simmilars){
                                user.tasks.push(req.body.id);
                                user.save((err) => {
                                    if (err) {
                                        res.status(500).json({errInfo: "Не удалось взять задачу!"});
                                    }
                                    else {
                                        res.status(200).json({successInfo: "Задача добавлена в Ваш список задач!"});
                                    }
                                });
                            }
                            else {
                                res.status(500).json({errInfo: "Вы уже выполняете эту задачу!"});
                            }
                        });
                }
            })
        }
        else{
            res.status(500).json({errInfo: "Задача уже выполняется!"});
        }


    })


            /*User.findOne({_id: req.session.user._id}, (err, doc) => {
        doc.tasks.push(req.body.id);
        doc.save((err, updatedDoc) => {
            next(err);
            console.log(updatedDoc);
        });
    });*/
});
router.post('/newProject', upload.single('cover'), (req, res, next) => {
    "use strict";
    req.checkBody('projectname', 'Invalid postparam').notEmpty().isLength({max: 30});
    req.checkBody('projectdescription', 'Invalid postparam').notEmpty().isLength({max: 255});
    if (req.file) {
        if (req.file.size > 8388608) next("Размер обложки проекта слишком большой (8мб максимум)");
        const newFileName = Date.now() + req.file.originalname;
        fs.readFile(req.file.path, function (err, content) {
            if (err) {
                next(err);
            }
            else {
                fs.writeFile(path.join(__dirname, '../public/images/covers/') + newFileName, content, function (err) {
                    if (err) {
                        next(err);
                    }
                    else {
                        Project.create({
                            owner_id : req.session.user._id,
                            name: req.body.projectname,
                            cover: 'images/covers/' + newFileName,
                            description: req.body.projectdescription,
                            users: req.session.user._id
                        }, (err, project) => {
                            if (err) {
                                next(err);
                            }
                            else {
                                User.findOne({_id: req.session.user._id}, (err, doc) => {
                                    doc.projects.push(project);
                                    doc.save((err, updatedDoc) => {
                                        next(err);
                                        res.redirect('/profile');
                                    });
                                })
                            }
                        })
                    }
                })
            }
        })
    }
    else{
        Project.create({
            owner_id : req.session.user._id,
            name: req.body.projectname,
            cover: 'images/dc.png',
            description: req.body.projectdescription,
            users: req.session.user._id
        }, (err, project) => {
            if (err) {
                next(err);
            }
            else {
                User.findOne({_id: req.session.user._id}, (err, doc) => {
                    doc.projects.push(project);
                    doc.save((err, updatedDoc) => {
                        next(err);
                        res.redirect('/profile');
                    });
                })
            }
        })
    }





});
router.post('/removeTask', (req, res) => {
    "use strict";
    if (!req.body.id) res.sendStatus(400);
    Task.findById(req.body.id, function (err, doc) {
        var filesArray = doc.images;
        for (var i = 0; i < filesArray.length; i++) {
            fs.unlink(path.join(__dirname, '../public/') + filesArray[i], (err) => {
                res.status(500).json({id: doc.project});
            });
        }
        Task.remove({_id: req.body.id}, function (err) {
            if (err) {
                res.status(500).json({id: doc.project});
            }
            else {
                res.status(200).json({id: doc.project});
            }
        })

    });
});
router.post('/removeProject', (req, res) => {
    "use strict";
    if (!req.body.id) res.sendStatus(400);
    Project.findById(req.body.id, function (err, doc) {
        console.log(doc.cover);
        console.log('/images/dc.png');
        if (doc.cover == 'images/dc.png') {
            Project.remove({_id: req.body.id}, function (err) {
                if (err) {
                    res.status(500).json({id: doc.project});
                }
                else {
                    res.status(200).json({id: doc.project});
                }
            });
        }
        else {
            fs.unlink(path.join(__dirname, '../public/') + doc.cover, (err) => {
                Project.remove({_id: req.body.id}, function (err) {
                    if (err) {
                        res.status(500).json({id: doc.project});
                    }
                    else {
                        res.status(200).json({id: doc.project});
                    }
                })
            });
        }
    });
});


module.exports = router;