const db = require('../db/mysql2')
require('dotenv').config() //加载配置环境
// 1.响应订单商品
exports.checkoutOrderhandle = async (req, res) => {
    try {
        // 从token中拿到用户id
        const userId = req.auth.id

        const mode = req.query.mode || req.body.mode
        /* 客户端需要携带 购物车id/商品id(取决于mode类型是buyNow,cart) 
            buyNow: 需要携带参数: userId goodsId 商品规格，商品数量
            cart: 需要携带参数 ： userid cartId  
        */

        if (mode === 'buyNow') {
            const goodsId = parseInt(req.query.goodsId) || parseInt(req.body.goodsId)
            const specValueIds = JSON.stringify(req.query.specValueIds) || JSON.stringify(req.body.specValueIds)
            const quantity = parseInt(req.query.quantity) || parseInt(req.body.quantity)

            //用户端携带立即购买相应的商品参数响应对应的商品信息 （mode,goodsId,规格，数量）
            if (!specValueIds) return res.cc('请选择规格')
            const getBuyNowDataDql = `
                select
                    g.id as 'goods_id',
                    g.title as 'goods_title',
                    gi.url as 'goods_coverImg',
                    gs.image_url 'color_image',
                (SELECT value FROM goods_specs
                    WHERE goods_id = g.id
                        AND spec_id = 1
                        AND id = JSON_UNQUOTE(JSON_EXTRACT('${specValueIds}', '$.color'))) AS color_name,
                (SELECT value FROM goods_specs
                    WHERE goods_id = g.id
                        AND spec_id = 2
                        AND id = JSON_UNQUOTE(JSON_EXTRACT('${specValueIds}', '$.memory'))) AS memory_name,
                (SELECT image_url FROM goods_specs
                    WHERE goods_id = g.id
                        AND spec_id = 1
                        AND id = JSON_UNQUOTE(JSON_EXTRACT('${specValueIds}', '$.color'))) AS color_image,
                (SELECT price FROM goods_specs
                    WHERE goods_id = g.id
                        AND spec_id = 2
                        AND id = JSON_UNQUOTE(JSON_EXTRACT('${specValueIds}', '$.memory'))) AS price,
                (SELECT price FROM goods_specs
                    WHERE goods_id = g.id
                        AND spec_id = 2
                        AND id = JSON_UNQUOTE(JSON_EXTRACT('${specValueIds}', '$.memory'))) * ${quantity} AS total_price
                    from
                    goods g
                left join goods_images gi on g.id = gi.goods_id
                left join goods_specs gs on g.id = gs.goods_id
                where g.id = ? and gi.type = 'cover'
                group by g.id
            `
            const [results] = await db.query(getBuyNowDataDql, [goodsId])
            results.forEach(item => {
                item.quantity = quantity
            })
            res.send({
                status: 0,
                mode: 'buyNow',
                data: results
            })


        } else if (mode === 'cart') {
            // 如果是通过购物车结算,这订单信息内容直接从carts表中获取并响应
            // 1.获取携带的参数
            const cartIds = req.body.cartIds || req.query.cartIds
            // 1.1占位符数量 (根据数组长度也就是需查看cartId的个数生成对应的占位符)
            if (!Array.isArray(cartIds)) return res.cc('获取失败，请重试')
            const placeholders = cartIds.map(() => '?').join(',')

            const getCarDatatDql = `
            SELECT
                c.id AS cart_id,
                c.goods_id,
                g.title AS goods_title,
                c.quantity,
                g.main_image goods_coverImg,
                color_gs.image_url AS color_image,
                color_gs.value AS color_name,
                memory_gs.value AS memory_name,
                memory_gs.price * c.quantity AS total_price,
                (SELECT price FROM goods_specs
                WHERE goods_id = c.goods_id
                AND spec_id = 2
                AND id = JSON_UNQUOTE(JSON_EXTRACT(c.specs, '$.memory'))) AS price
                FROM carts c
                JOIN goods g ON c.goods_id = g.id
                LEFT JOIN goods_specs color_gs
                ON color_gs.id = JSON_UNQUOTE(JSON_EXTRACT(c.specs, '$.color'))
                AND color_gs.goods_id = c.goods_id
                AND color_gs.spec_id = 1
                LEFT JOIN goods_specs memory_gs
                ON memory_gs.id = JSON_UNQUOTE(JSON_EXTRACT(c.specs, '$.memory'))
                AND memory_gs.goods_id = c.goods_id
                AND memory_gs.spec_id = 2
                WHERE c.user_id = ? AND c.id in (${placeholders})
                ORDER BY c.id DESC
            `
            const [results] = await db.query(getCarDatatDql, [userId, ...cartIds])
            results.forEach(item => item.goods_coverImg = process.env.baseUrl + item.goods_coverImg)
            res.send({
                status: 0,
                mode: 'cart',
                data: results
            })

        } else {
            return res.cc('请选择商品')
        }

    } catch (error) {
        console.error('数据库错误详情:', error)
        res.cc('获取失败，请重试')
    }
}
exports.handelPayMode = async (req, res) => {
    try {
        const userId = req.auth.id

        // 1.查询支付类型
        const getPayModeDql = ` SELECT * FROM pay_mode;`
        const [results1] = await db.query(getPayModeDql)

        // 2.查询用户余额
        const balanceDql = `
            SELECT
                ub.user_id,
                pm.id as 'pay_mode_id',
                ub.balance AS 'balance'
            FROM
                user_balances ub
                JOIN users u ON ub.user_id = u.id
                JOIN pay_mode pm ON ub.pay_mode_id = pm.id
            WHERE
                ub.user_id = ?;
            `

        const [results2] = await db.query(balanceDql, userId)

        // 3.1将数组装换为对象
        const obj = results2.find(item => item.user_id === userId)
        // 3.2获取支付方式的索引（将查询出来的用户余额里的pay_mode_id与支付方式里的id进行比较）
        const index = results1.findIndex(item => item.id === obj.pay_mode_id)

        // 3.3将余额赋值到对应的支付方式低下
        results1[index].balance = obj.balance

        results1.forEach(item => item.type_image = process.env.baseUrl + item.type_image)

        res.send({
            status: 0,
            data: results1
        })
    } catch (error) {
        console.error('数据库错误详情:', error)
    }
}

exports.handleSubmit = async (req, res) => {
    try {
        const userId = req.auth.id
        const mode = req.query.mode || req.body.mode
        const payModeId = req.body.pay_mode_id

        // 获取用户余额
        const dql4 = `SELECT * FROM user_balances WHERE user_id = ?`
        const [user_balance] = await db.query(dql4, [userId])
        user_balance.forEach(item => item.balance = parseFloat(item.balance))
        const obj = user_balance.find(item => item.user_id === userId)

        // 如果客户端选择的支付方式不等1（余额支付），则结束程序（因为其它支付方式暂未开通，只支持余额支付）
        if(payModeId !== obj.pay_mode_id) return res.cc('暂未开通')

        // 处理不同类型订单支付场景
        if (mode === 'cart') {
            const { cartIds, quantitys } = req.body || req.query
            // 数据验证
            if (!Array.isArray(cartIds)) return res.cc('获取失败，请重试')
            for (const item of quantitys) {
                if (!item.id || item.quantity === undefined || item.quantity < 0) return res.cc('Invalid item data')
            }

            const placeholders = cartIds.map(() => '?').join(',')
            // 提取所有 id 和生成 CASE WHEN 条件
            const ids = quantitys.map(item => item.id)
            const cases = quantitys.map(item => `WHEN ${item.id} THEN ${item.quantity}`).join(' ')

            // 动态生成 SQL
            const sql = `
                UPDATE carts
                SET quantity = CASE id ${cases} END,
                status = 1,deleted_at = NOW()
                WHERE id IN (?) AND user_id = ?
                `
            // 执行批量更新
            await db.query(sql, [ids, userId])

            const dql1 = `
                    SELECT
                    c.id AS cart_id,
                    c.goods_id,
                    c.quantity,
                    memory_gs.price * c.quantity AS total_price,
                    (
                        SELECT
                        price
                        FROM
                        goods_specs
                        WHERE
                        goods_id = c.goods_id
                        AND spec_id = 2
                        AND id = JSON_UNQUOTE(JSON_EXTRACT(c.specs, '$.memory'))
                    ) AS price
                    FROM
                    carts c
                    JOIN goods g ON c.goods_id = g.id
                    LEFT JOIN goods_specs color_gs ON color_gs.id = JSON_UNQUOTE(JSON_EXTRACT(c.specs, '$.color'))
                    AND color_gs.goods_id = c.goods_id
                    AND color_gs.spec_id = 1
                    LEFT JOIN goods_specs memory_gs ON memory_gs.id = JSON_UNQUOTE(JSON_EXTRACT(c.specs, '$.memory'))
                    AND memory_gs.goods_id = c.goods_id
                    AND memory_gs.spec_id = 2
                    WHERE
                    c.user_id = ?
                    AND c.id IN (${placeholders})
            `
            const [results1] = await db.query(dql1, [userId, ...cartIds])
            const totalAmount = results1.reduce((sum, item) => sum + parseFloat(item.total_price), 0)
            // 后续如果添加优惠券等金额，直接拿toatalAmount 进行计算

            // 3记录用户下单信息 (用户id 全部金额)
            const dql2 = `insert into orders (user_id, total_amount) values (?,?)`
            const [newRows] = await db.query(dql2, [userId, totalAmount])
            const orderId = newRows.insertId

            const dql3 = `insert into order_items (order_id, goods_id, pay_price, mode, mode_id) values ? `
            await db.query(dql3, [results1.map(item => [orderId, item.goods_id, item.price, mode, item.cart_id])])

            // 4.结算操作（后续添加密码功能）
            if (payModeId === obj.pay_mode_id) {
                if (obj.balance < totalAmount) return res.cc('余额不足')
                // 4.3
                await db.query(
                    'UPDATE user_balances SET balance = balance - ? WHERE user_id = ?',
                    [totalAmount, userId]
                )

                // 4.4
                const dql5 = `update orders set status = 'paid' where id = ?`
                await db.query(dql5, [orderId])

                res.send({
                    status: 0,
                    message: '扣款成功'
                })
            }
        } else if (mode === 'buyNow') {
            // 获取客户端携带的表单信息
            const goodsId = parseInt(req.body.goodsId)
            const specValueIds = JSON.stringify(req.body.specValueIds)
            const quantity = parseInt(req.body.quantity)
            // 校验
            if (!specValueIds) return res.cc('请选择规格')

            // 新增
            const [newRows] = await db.query(`insert into buynow (goods_id, user_id, quantity, specs) values (?,?,?,?)`, [goodsId, userId, quantity, specValueIds])
            const buyNowId = newRows.insertId

            const dql1 = `
                    select
                    b.id as 'buynow_id',
                    g.id as 'goods_id',
                (SELECT price FROM goods_specs
                    WHERE goods_id = g.id
                        AND spec_id = 2
                        AND id = JSON_UNQUOTE(JSON_EXTRACT(b.specs, '$.memory'))) AS price,
                (SELECT price FROM goods_specs
                    WHERE goods_id = g.id
                        AND spec_id = 2
                        AND id = JSON_UNQUOTE(JSON_EXTRACT(b.specs, '$.memory'))) * b.quantity AS total_price
                    from
                    buynow b
                left join goods g on b.goods_id = g.id
                left join goods_specs gs on g.id = gs.goods_id
                where b.id = ? and b.user_id = ?
                group by b.id
            `
            const [results1] = await db.query(dql1, [buyNowId, userId])
            const total_amount = results1.find(item => item.buynow_id === buyNowId).total_price

            // 记录用户下单信息
            const [newRows2] = await db.query(`insert into orders (user_id, total_amount) values (?,?)`, [userId, total_amount])
            const orderId = newRows2.insertId

            // 记录订单表下的商品信息
            await db.query(`insert into order_items (order_id, goods_id, pay_price, mode, mode_id) values ?`, [results1.map(item => [orderId, item.goods_id, item.price, mode, item.buynow_id])])

            // 3.支付操作（处理余额支付场景）
            if (payModeId === obj.pay_mode_id) {
                if (obj.balance < total_amount) return res.cc('余额不足')
                await db.query(
                    'UPDATE user_balances SET balance = balance - ? WHERE user_id = ?',
                    [total_amount, userId]
                )

                await db.query(`update orders set status = 'paid' where id = ?`, [orderId])

                res.send({
                    status: 0,
                    message: '扣款成功'
                })
            }
        } else {
            return res.cc('请选择商品')
        }
    } catch (error) {
        console.error('数据库错误详情:', error)
    }
}