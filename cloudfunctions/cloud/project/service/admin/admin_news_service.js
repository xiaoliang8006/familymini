/**
 * Notes: 资讯后台管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2021-07-11 07:48:00 
 */

const BaseAdminService = require('./base_admin_service.js');

const dataUtil = require('../../../framework/utils/data_util.js');
const util = require('../../../framework/utils/util.js');
const cloudUtil = require('../../../framework/cloud/cloud_util.js');

const NewsModel = require('../../model/news_model.js');

class AdminNewsService extends BaseAdminService {
  generateTId() {
    const now = new Date();
    
    // 获取日期部分 YYYYMMDD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    // 获取时间部分 HHmmss
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // 获取毫秒部分的后三位
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0').slice(0, 3);
    
    // 拼接成完整的时间戳
    return `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;
  }
  
	/**添加资讯 */
	async insertNews(adminId, {
		title,
		cateId, //分类
		cateName,
    order,
    desc = '',
		type = 0, //类型 
		url = '' //外部链接
	}) {
		// 校验必填字段
		if (!title || !cateId || !cateName) {
			throw new Error('标题、分类ID和分类名称不能为空');
		}

		// 构建资讯数据
		const data = {
      NEWS_ID: this.generateTId(), // 使用类方法生成时间戳作为ID
			NEWS_TITLE: title,
			NEWS_CATE_ID: cateId,
			NEWS_CATE_NAME: cateName,
			NEWS_ORDER: order || 0,
			NEWS_TYPE: type,
			NEWS_DESC: desc,
			NEWS_URL: url,
			NEWS_ADD_TIME: Date.now(),
			NEWS_EDIT_TIME: Date.now(),
      NEWS_STATUS: 1,
      NEWS_ADMIN_ID: adminId // 添加管理员ID字段
		};

		// 插入数据库
		return await NewsModel.insert(data);
	}

	/**删除资讯数据 */
	async delNews(id) {
		if (!id) {
			throw new Error('资讯ID不能为空');
		}

		// 检查资讯是否存在
		const news = await NewsModel.getOne({ _id: id });
		if (!news) {
			throw new Error('资讯不存在');
		}

		// 执行删除
		return await NewsModel.del({ _id: id });
	}

	/**获取资讯信息 */
	async getNewsDetail(id) {
		let fields = '*';

		let where = {
			_id: id
		}
		let news = await NewsModel.getOne(where, fields);
		if (!news) return null;

		return news;
	}

	/**
	 * 更新富文本详细的内容及图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateNewsContent({
		newsId,
		content // 富文本数组
	}) {
		if (!newsId) {
			throw new Error('资讯ID不能为空');
		}
		if (!Array.isArray(content)) {
			throw new Error('内容必须是数组');
		}

		// 从富文本内容中提取所有图片URL
		const imgUrls = [];
		content.forEach(item => {
			if (item.type === 'image' && item.url) {
				imgUrls.push(item.url);
			}
		});

		// 更新数据库中的内容
		await NewsModel.edit({ _id: newsId }, {
			NEWS_CONTENT: content,
			NEWS_EDIT_TIME: Date.now()
		});

		return imgUrls;
	}

	/**
	 * 更新资讯图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateNewsPic({
		newsId,
		imgList // 图片数组
	}) {
		if (!newsId) {
			throw new Error('资讯ID不能为空');
		}
		if (!Array.isArray(imgList)) {
			throw new Error('图片列表必须是数组');
		}

		// 过滤出有效的图片URL
		const validUrls = imgList.filter(url => typeof url === 'string' && url.trim());

		// 更新数据库中的图片信息
		await NewsModel.edit({ _id: newsId }, {
			NEWS_PIC: validUrls,
			NEWS_EDIT_TIME: Date.now()
		});

		return validUrls;
	}


	/**更新资讯数据 */
	async editNews({
		id,
		title,
		cateId, //分类
		cateName,
		order,
		type = 0, //类型 
		desc = '',
		url = '', //外部链接
	}) {

		if (!id) {
			throw new Error('资讯ID不能为空');
		}

		// 构建更新数据
		const data = {
			NEWS_TITLE: title,
			NEWS_CATE_ID: cateId,
			NEWS_CATE_NAME: cateName,
			NEWS_ORDER: order,
			NEWS_TYPE: type,
			NEWS_DESC: desc,
			NEWS_URL: url,
			NEWS_EDIT_TIME: Date.now()
		};

		// 执行更新
		return await NewsModel.edit({ _id: id }, data);
	}

	/**取得资讯分页列表 */
	async getNewsList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		whereEx, //附加查询条件
		page,
		size,
		isTotal = true,
		oldTotal
	}) {

		orderBy = orderBy || {
			'NEWS_ORDER': 'asc',
			'NEWS_ADD_TIME': 'desc'
		};
		let fields = 'NEWS_TYPE,NEWS_URL,NEWS_TITLE,NEWS_DESC,NEWS_CATE_ID,NEWS_EDIT_TIME,NEWS_ADD_TIME,NEWS_ORDER,NEWS_STATUS,NEWS_CATE_NAME,NEWS_HOME';

		let where = {};

		if (util.isDefined(search) && search) {
			where.or = [{
				NEWS_TITLE: ['like', search]
			}, ];

		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'cateId':
					// 按类型
					where.NEWS_CATE_ID = sortVal;
					break;
				case 'status':
					// 按类型
					where.NEWS_STATUS = Number(sortVal);
					break;
				case 'home':
					// 按类型
					where.NEWS_HOME = Number(sortVal);
					break;
				case 'sort':
					// 排序
					if (sortVal == 'view') {
						orderBy = {
							'NEWS_VIEW_CNT': 'desc',
							'NEWS_ADD_TIME': 'desc'
						};
					}
					if (sortVal == 'new') {
						orderBy = {
							'NEWS_ADD_TIME': 'desc'
						};
					}
					break;
			}
		}

		return await NewsModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/**修改资讯状态 */
	async statusNews(id, status) {
		if (!id || status === undefined) {
			throw new Error('资讯ID和状态不能为空');
		}

		// 检查状态值是否合法
		if (status !== 0 && status !== 1) {
			throw new Error('状态值不合法');
		}

		// 执行更新
		return await NewsModel.edit({ _id: id }, { NEWS_STATUS: status });
	}

	/**资讯置顶排序设定 */
	async sortNews(id, sort) {
		if (!id || sort === undefined) {
			throw new Error('资讯ID和排序值不能为空');
		}

		// 执行更新
		return await NewsModel.edit({ _id: id }, { NEWS_ORDER: sort });
	}
}

module.exports = AdminNewsService;