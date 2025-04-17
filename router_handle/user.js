// 导入数据库操作模块
const db = require('../db/index')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

require('dotenv').config() //加载配置环境
// 注册路由处理函数
exports.register = (req, res) => {
    const userInfo = req.body
    const nickname = req.body.nickname || null
    const sql = 'select * from users where username=?'
    db.query(sql, [userInfo.username], (err, results) => {
        if (err) return res.cc(err)
        // 判断数据库又没有重复的用户名
        // if (results.length > 0) return res.cc('用户名被占用，请更换其他用户名！')
        if(results.length > 0) return res.cc('注册失败，该手机号已注册！')

        // 用户名可以用，则对密码进行加密存储到数据库中 将加密好的密码重新挂载到userInfo.password身上
        userInfo.password = bcrypt.hashSync(userInfo.password, 10)

        // 将合法的用户信息插入到数据库中
        const insertSql = 'insert into users set ?'
        db.query(insertSql, { username: userInfo.username, password: userInfo.password, nickname }, (err, results) => {
            if (err) return res.cc(err)

            // 判断影响行数是否为 1 
            if (results.affectedRows !== 1) return res.cc('注册用户失败失败')

            res.cc('注册成功！', 0)
        })
    })


}

// 抽离用户登录路由模块中的处理函数
exports.login = (req, res) => {
    const userInfo = req.body
    const sql = 'select * from users where username = ?'
    db.query(sql, userInfo.username, (err, results) => {
        if (err) return res.cc(err)

        if (results.length !== 1) return res.cc('该手机号未注册！')

        // 判断该用户账号密码是否正确 对比客户端输入密码与数据库的密码是否一致
        const comparePwd = bcrypt.compareSync(userInfo.password, results[0].password)
        if (!comparePwd) return res.cc('用户名或密码错误')

        // 通过 ES6 的高级语法，快速剔除 除了 用户唯一标识与 用户角色 的其他值：
        const user = { ...results[0], password: '', avatar: '', created_time: '', username: '', email: '' }
        // 当密码密码正确，则登录成功，需响应对象的数据，如Token鉴权
        const token = jwt.sign(user, process.env.JWT_PRIVATEKEY, { expiresIn: process.env.EXPIRESIN })

        res.send({
            status: 0,
            message: '登录成功',
            // 为了方便客户端使用 Token，在服务器端直接拼接上 Bearer 的前缀
            data: {
                token: 'Bearer ' + token,
                userId: user.id
            }
        })
    })

}