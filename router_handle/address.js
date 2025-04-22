const db = require('../db/mysql2')
const time = require('../utils/dateFormat')
// 获取省份数据
exports.handleProvinceData = async (req, res) => {
    try {
        const provinceDql = `select region_id,region_name,region_type from ch_region where  region_type = 1;`
        const [results] = await db.query(provinceDql)
        res.send({
            status: 0,
            data: results
        })
    } catch (error) {
        console.error('数据库错误详情:', error)
    }
}

// 获取市
exports.handleCityData = async (req, res) => {
    try {
        // 通过params可以拿到动态参数region_id
        // res.send(req.params)
        const regionId = parseInt(req.params.region_id)
        const cityDql = `
            select c.region_id as 'region_id',c.region_name as 'region_name',c.region_type
                from ch_region p
                join ch_region c on p.id = c.parent_id
                where p.region_id = ?
                `
        const [results] = await db.query(cityDql, regionId)
        res.send({
            status: 0,
            data: results
        })
    } catch (error) {
        console.error('数据库错误详情:', error)
    }
}

exports.handleCountyData = async (req, res) => {
    try {
        const regionId = parseInt(req.params.region_id)
        const countyDql = `
            select q.region_id as 'region_id',q.region_name as 'region_name',q.region_type
                from ch_region q
                join ch_region c on q.parent_id = c.id
                where c.region_id = ? and q.region_type = 3
            `
        const [results] = await db.query(countyDql, regionId)
        res.send({
            status: 0,
            data: results
        })
    } catch {
        console.error('数据库错误详情:', error)

    }
}

exports.handleAddressList = async (req, res) => {
    try {
        // 获取用户id
        const userId = req.auth.id
        // 获取收货地址列表
        const getAddressDql = `
                 select
                    ua.id as 'user_address_id',
                    ua.delivery_name,
                    ua.delivery_phone,
                    ua.delivery_address,
                    ua.detail_address,
                    ua.is_default
                    from user_address_info ua
                    join users u on ua.user_id = u.id
                    where ua.user_id = ? and ua.status = 0
                    order by ua.created_at desc 
        `
        const [results] = await db.query(getAddressDql, [userId])
        res.send({
            status: 0,
            data: results
        })
    } catch (error) {
        console.error('数据库错误详情:', error)
    }
}

// 添加地址
exports.handleAddAddress = async (req, res) => {
    try {
        const userId = req.auth.id
        const { name, tel, address, fieldValue } = req.body.form || {}

        const addAddressDql = `
            insert into user_address_info (user_id, delivery_name, delivery_phone, delivery_address, detail_address)
            values (?,?,?,?,?)
        `
        const [results] = await db.query(addAddressDql, [userId, name, tel, fieldValue, address])
        if (results.affectedRows !== 1) return res.cc('添加失败，请重试')

        res.send({
            status: 0,
            message: '添加成功'
        })
    } catch (error) {
        console.error('数据库错误详情：', error)
    }
}

// 逻辑删除用户地址
exports.handleClearAddress = async (req, res) => {
    try {
        const userId = req.auth.id
        const address_id = req.body.addressId

        const clearDql = `
            update user_address_info set status = 1 where id = ? and user_id = ?
        `
        await db.query(clearDql, [address_id, userId])

        res.send({
            status: 0,
            message: '删除成功'
        })
    } catch (error) {
        console.error('数据库错误详情：', error)
    }
}

// 更新修改地址
exports.handleUpdateAddress = async (req, res) => {
    try {
        const userId = req.auth.id
        const address_id = req.body.addressId
        const { name:delivery_name, tel:delivery_phone, address:detail_address, fieldValue:delivery_address } = req.body.form || {}
        const newObj ={
            delivery_name,
            delivery_phone,
            delivery_address,
            detail_address,
            created_at: time.dateFormat(new Date())
        }

        const updateDql = `update user_address_info set ? where user_id = ? and id = ?`
        await db.query(updateDql,[newObj,userId,address_id])
        res.send({
            status:0,
            message:'修改成功'
                })

    } catch (error) {
        console.error('数据库错误详情：', error)
    }
}

// 设置默认地址
exports.handleDefaultAddress =async (req,res) => {
    try{
        const userId = req.auth.id
        const {addressId} = req.body

       const defaultAddressDql = `
        update user_address_info
        set is_default = case
            when id = ? then 1
            else 0
            end
            where user_id = ?
        `
        await db.query(defaultAddressDql,[addressId,userId])

        res.send({
            status:0,
            message:'设置成功'
        })
        
        
    }catch(error){
        console.error('数据库错误详情：', error)
    }
} 