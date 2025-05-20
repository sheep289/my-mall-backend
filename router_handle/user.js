// 导入数据库操作模块
const db = require("../db/index")
const db2 = require("../db/mysql2")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

require("dotenv").config() //加载配置环境
// 注册路由处理函数
exports.register = async (req, res) => {
  const userInfo = req.body
  const nickname = req.body.nickname || null
  try {
    const [results] = await db2.query(`select * from users where username=?`, [
      userInfo.username,
    ])
    if (results.length > 0) return res.cc("注册失败，该手机号已注册！")
    // 用户名可以用，则对密码进行加密存储到数据库中 将加密好的密码重新挂载到userInfo.password身上
    userInfo.password = bcrypt.hashSync(userInfo.password, 10)

    // 将合法的用户信息插入到数据库中
    const [newRows] = await db2.query(`insert into users set ?`, {
      username: userInfo.username,
      password: userInfo.password,
      nickname,
    })
    const userId = newRows.insertId
    //    新增账户余额
    await db2.query(`insert into user_balances (user_id) values (?)`, [userId])
    res.send({
      status: 0,
      message: "注册成功",
    })
  } catch (error) {
    console.error("数据库错误详情:", error)
  }
}

// 抽离用户登录路由模块中的处理函数
exports.login = (req, res) => {
  const userInfo = req.body
  const sql = "select * from users where username = ?"
  db.query(sql, userInfo.username, (err, results) => {
    if (err) return res.cc(err)

    if (results.length !== 1) return res.cc("该手机号未注册！")

    // 判断该用户账号密码是否正确 对比客户端输入密码与数据库的密码是否一致
    const comparePwd = bcrypt.compareSync(
      userInfo.password,
      results[0].password
    )
    if (!comparePwd) return res.cc("用户名或密码错误")

    // 通过 ES6 的高级语法，快速剔除 除了 用户唯一标识与 用户角色 的其他值：
    const user = {
      ...results[0],
      password: "",
      avatar: "",
      created_time: "",
      username: "",
      email: "",
    }
    // 当密码密码正确，则登录成功，需响应对象的数据，如Token鉴权
    const token = jwt.sign(user, process.env.JWT_PRIVATEKEY, {
      expiresIn: process.env.EXPIRESIN,
    })

    res.send({
      status: 0,
      message: "登录成功",
      // 为了方便客户端使用 Token，在服务器端直接拼接上 Bearer 的前缀
      data: {
        token: "Bearer " + token,
        userId: user.id,
      },
    })
  })
}

// 获取我的界面 订单状态等其它功能数据
exports.handleUserIndex = async (req, res) => {
  try {
    const [results1] = await db2.query(`select * from  order_status`)
    const handelData = {
      types: results1,
    }
    res.send({
      status: 0,
      data: handelData,
    })
    //   types: results1
  } catch (error) {
    console.error("数据库错误详情:", error)
  }
}
