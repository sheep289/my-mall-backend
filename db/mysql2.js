// 新模块：mysql2/promise（异步）
const mysqlAsync = require('mysql2/promise');
require('dotenv').config() //加载配置环境
const db = mysqlAsync.createPool({
    host:process.env.DB_HOST,
    user:process.env.DB_USER,
    password:process.env.DB_PASSWORD,
    database:process.env.DB_NAME,
    connectionLimit: 10,  //限制最大连数
    connectTimeout: 10000,   //10秒连接超时
    queueLimit: 0,    //不限制排队请求
})

module.exports = db