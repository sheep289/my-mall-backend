const db = require('../db/index')
// 将商品添加到购物车接口
exports.cartHandle = async (req, res) => {
    try {
        // const { goodsId, specValueIds, quantity } = req.body
        const goodsId = parseInt(req.body.goodsId)
        const specValueIds = JSON.stringify(req.body.specValueIds)
        const quantity = parseInt(req.body.quantity)
        // console.log(specValueIds)
        // 从token权证中拿到用户id
        const userId = req.auth.id

        // 3.1 对数据进行校验
        if (!goodsId || isNaN(goodsId)) return res.cc('NaN或者NULL，请输入正确的goodsId')
        if (!specValueIds || typeof !specValueIds === 'object') return res.cc('需要传入对象{color: id值}')
        if (isNaN(quantity)) return res.cc('NaN,该数据类型需为Number')

        // 当用户点击添加购物车时，需在数据库中记录该用户的添加的商品
        // 1.写入购物车表(cart) dql语句 （跟carts里的status状态关联）
        const addDql = `
            INSERT INTO carts (user_id, goods_id, specs, quantity)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            quantity = CASE WHEN status = 1 THEN VALUES(quantity) ELSE quantity + VALUES(quantity) END,
            status = 0,
            deleted_at = NULL
        `
        //     const addDql2 = `
        //     insert into cart_specs (cart_id, spec_value_id,spec_quantity) 
        //     values ? 
        //     on DUPLICATE KEY UPDATE spec_quantity = spec_quantity + 1;
        // `
        // 2.查询用户的购物车所有商品数量 
        const addDql2 = `
            select
            sum(c.quantity) as 'cart_total'
            from carts c
            join users u on c.user_id = u.id
            where u.id = ? and c.status = 0
        `
        await db.query(addDql, [userId, goodsId, specValueIds, quantity, quantity], (err, results) => {
            if (err) return res.cc(err)
            // if (results.affectedRows !== 1) return res.cc('添加购物车失败')
            // db.query(addDql2, [specValueIds.map(specId => [results.insertId, specId, 1])], (err) => {
            //     if (err) return res.cc(err)
            //     res.send({
            //         status: 0,
            //         msg: '添加成功',
            //     })
            // })

            db.query(addDql2, userId, (err, results2) => {
                if (err) return res.cc(err)
                let handleData = {
                    ...results2[0]
                }
                res.send({
                    status: 0,
                    message: '添加成功',
                    data: handleData
                })
            })
        })

    } catch (err) {
        console.log('数据库错误详情:', err)
        res.cc(err)
    }
}
// 获取用户的购物车商品列表接口
exports.cartListHandle = async (req, res) => {
    try {
        const userId = req.auth.id
        // 优化后的 SQL 查询（动态处理规格名称和价格）
        const sql = `
            SELECT
            c.id AS cart_id,
            c.goods_id,
            g.title AS goods_title,
            c.quantity,
            gi.url goods_coverImg,
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
            JOIN goods_images gi ON g.id = gi.goods_id
            AND gi.type = 'cover'
            WHERE c.user_id = ? AND c.status = 0
            ORDER BY c.id DESC
      `

        // 执行查询
        await db.query(sql, [userId], (err, results) => {
            if (err) return res.cc(err)

            res.send({
                status: 0,
                data: results
            })
        })
    } catch (error) {
        console.error('数据库错误详情:', error)
        res.send({ status: 1, message: '服务器错误' })
    }
}

//更新购物车商品数量
exports.cartUpdateHandle = async (req, res) => {
    try {
        // 获取用户携带过来的购物车id与修改数量
        const cartId = parseInt(req.body.cartId)
        const quantity = parseInt(req.body.quantity)

        // 校验
        if (!cartId || isNaN(cartId)) return res.cc("请传入合法的购物车id")
        if (!quantity || isNaN(quantity)) return res.cc('数据类型错误，需为Number')
        // 用户id
        const userId = req.auth.id

        const dql = 'update carts set quantity = ? where id = ? and user_id = ?'
        await db.query(dql, [quantity, cartId, userId], err => {
            if (err) return res.cc('err')
            res.send({
                status: 0,
                message: "succeed"
            })
        })
    } catch (error) {
        console.error('数据库错误详情:', error)
        res.cc('服务器错误')
    }
}

// 删除购物车对应商品
exports.cartClearHandle = async (req, res) => {
    try {
        // 获取需要删除cartid(是一个数组)
        const cartIds = req.body.cartIds
        const userId = req.auth.id

        if(!Array.isArray(cartIds)) return res.cc('数据类型需为数组Array')

        // 占位符数量
        const placeholders  = cartIds.map(() => '?').join(',')
        // 这里不使用物理删除（直接删除） 而是逻辑删除（通过status标记）
        const dql = `update carts set status = 1,deleted_at = NOW()
                    where user_id = ? and id in (${placeholders}) `

        await db.query(dql, [userId,...cartIds], (err) => {
            if (err) return res.cc(err)
            res.send({
                status: 0,
                message: 'succeed'
            })
        })
    } catch (error) {
        console.error('数据库错误详情', error)
        res.cc('服务器错误')
    }
}