/**
 * Created by alexey-dev on 23.10.16.
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
import fs from "fs";
import path from "path";

const TaskModel = new Schema({
    project: {type: Schema.Types.ObjectId, ref: 'Project'},
    executant_id: {type: Schema.Types.ObjectId, ref: 'User'},
    description: String,
    priority: String,
    images: {type: Array, default: []},
    status: {type: String, default: 'waiting'},
    dateOfcreation: {type: Date, default: Date.now},
    number: Number
});

const UserModel = new Schema({
    name: String,
    surname: String,
    avatar: {type: String, default: '/images/avatars/no-avatar_jpg.jpg'},
    email: String,
    tel: String,
    skype: String,
    password: String,
    tasks: [{type: Schema.Types.ObjectId, ref: 'Task'}],
    projects: [{type: Schema.Types.ObjectId, ref: 'Project'}]
});

UserModel.statics.findByEmail = (email, cb) => {
    return this.find({email: email}, cb);
};

const ProjectModel = new Schema({
    owner_id: {type: Schema.Types.ObjectId, ref: 'User'},
    name: String,
    cover: {type: String, default: '/images/dc.png'},
    dateOfcreation: {type: Date, default: Date.now},
    description: String,
    tasks: [{type: Schema.Types.ObjectId, ref: 'Task'}],
    users: [{type: Schema.Types.ObjectId, ref: 'User'}],
    taskcounter: {type: Number, default: 0}
});
//removing Task with Project and personal Task from Users
ProjectModel.pre('remove', function (next) {
    this.tasks.forEach((id)=> {
        Task.findById(id,(err, doc) => {
            var filesArray = doc.images;
            for (var i = 0; i < filesArray.length; i++) {
                fs.unlink(path.join(__dirname, '../public/') + filesArray[i], (err) => {
                });
            }
            Task.remove({_id: id},(err) => {
                Project.findByIdAndUpdate(doc.project, {$pull: {tasks: doc._id}},(err) => {
                    if (doc.executant_id) {
                        User.findByIdAndUpdate(doc.executant_id, {$pull: {tasks: doc._id}},(err) => {
                            })
                        }
                    })
                })
            })

        });
    next();
});
//removing Users from project
ProjectModel.pre('remove', function (next) {
    console.log(this);
    for(var i = 0; i < this.users.length; i++){
        User.findByIdAndUpdate(this.users[i], {$pull: {projects: this._id}},(err)=>{});
    }
    next();
});
const connection = mongoose.createConnection('mongodb://localhost:27017/taskboard');

const Task = connection.model('Task', TaskModel),
    User = connection.model('User', UserModel),
    Project = connection.model('Project', ProjectModel);
module.exports = {
    Task: Task,
    User: User,
    Project: Project
};