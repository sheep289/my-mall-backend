// 导入定义规则包
const joi = require('joi')

// 定义用户名和密码的验证规则
const username = joi.string().pattern(/^1[3-9]\d{9}$/).required()

// 密码验证规则
const  password = joi.string().pattern(/^[\S]{6,12}$/).required()

// 注册和登录表单的验证规则
exports.user_schema = {
    body:{
        username,
        password
    }
}
