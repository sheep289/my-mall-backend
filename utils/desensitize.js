const { emit } = require("../db")

// 脱敏函数模块
function desensitizePhone(username){
    const reg = /^(.{3}).*(.{4})$/
    return username.replace(reg,'\$1****\$2')
}
function desensitizeEmail(email){
    const reg = /^(.).+?(?=@)/
    return email ?  email.replace(reg,'\$1***') : null
}

module.exports = {
    desensitizePhone,
    desensitizeEmail
}