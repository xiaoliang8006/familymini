/**
 * Notes: 预约后台管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY www.code3721.com
 * Date: 2021-12-08 07:48:00 
 */

const BaseAdminService = require('./base_admin_service.js');
const MeetService = require('../meet_service.js');
const dataUtil = require('../../../framework/utils/data_util.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const util = require('../../../framework/utils/util.js');
const cloudUtil = require('../../../framework/cloud/cloud_util.js');
const cloudBase = require('../../../framework/cloud/cloud_base.js');

const MeetModel = require('../../model/meet_model.js');
const JoinModel = require('../../model/join_model.js');
const DayModel = require('../../model/day_model.js');
const config = require('../../../config/config.js');

class AdminMeetService extends BaseAdminService {

	/** 预约数据列表 */
	async getDayList(meetId, start, end) {
		let where = {
			DAY_MEET_ID: meetId,
			day: ['between', start, end]
		}
		let orderBy = {
			day: 'asc'
		}
		return await DayModel.getAllBig(where, 'day,times,dayDesc', orderBy);
	}

	// 按项目统计人数
	async statJoinCntByMeet(meetId) {
		let today = timeUtil.time('Y-M-D');
		let where = {
			day: ['>=', today],
			DAY_MEET_ID: meetId
		}

		let meetService = new MeetService();
		let list = await DayModel.getAllBig(where, 'DAY_MEET_ID,times', {}, 1000);
		for (let k in list) {
			let meetId = list[k].DAY_MEET_ID;
			let times = list[k].times;

			for (let j in times) {
				let timeMark = times[j].mark;
				meetService.statJoinCnt(meetId, timeMark);
			}
		}
	}

	/** 自助签到码 */
	async genSelfCheckinQr(page, timeMark) {
		this.AppError('此功能暂不开放2，如有需要请加作者微信：cclinux0730');
	}

	/** 管理员按钮核销 */
	async checkinJoin(joinId, flag) {
		this.AppError('此功能暂不开放3，如有需要请加作者微信：cclinux0730');
	}

	/** 管理员扫码核销 */
	async scanJoin(meetId, code) {
		this.AppError('此功能暂不开放4，如有需要请加作者微信：cclinux0730');
	}

	/**
	 * 判断本日是否有预约记录
	 * @param {*} daySet daysSet的节点
	 */
	checkHasJoinCnt(times) {
		if (!times) return false;
		for (let k in times) {
			if (times[k].stat.succCnt) return true;
		}
		return false;
	}

	// 判断含有预约的日期
	getCanModifyDaysSet(daysSet) {
		let now = timeUtil.time('Y-M-D');

		for (let k in daysSet) {
			if (daysSet[k].day < now) continue;
			daysSet[k].hasJoin = this.checkHasJoinCnt(daysSet[k].times);
		}

		return daysSet;
	}

	/** 取消某个时间段的所有预约记录 */
	async cancelJoinByTimeMark(admin, meetId, timeMark, reason) {
		this.AppError('此功能暂不开放5，如有需要请加作者微信：cclinux0730');
	}


	/**添加 */
	async insertMeet(adminId, {
		title,
		order,
		typeId,
		typeName,
		daysSet,
		isShowLimit,
		formSet,
	}) {
    // 校验必填字段
    if (!title || !typeId || !typeName) {
      throw new Error('标题、类型ID和类型名称不能为空');
    }

    // 构建项目数据
    const data = {
        MEET_ID: this.generateTId(), // 使用类方法生成时间戳作为ID
        MEET_TITLE: title,
        MEET_ORDER: order || 0,
        MEET_TYPE_ID: typeId,
        MEET_TYPE_NAME: typeName,
        MEET_DAYS: daysSet || [],
        MEET_IS_SHOW_LIMIT: isShowLimit || false,
        MEET_FORM_SET: formSet || {},
        MEET_ADD_TIME: timeUtil.time(),
        MEET_EDIT_TIME: timeUtil.time(),
        MEET_STATUS: 1, // 默认状态为启用
        MEET_ADMIN_ID: adminId
    };

    // 插入数据库
    return await MeetModel.insert(data);
	}

	/**删除数据 */
	async delMeet(id) {
    // 校验参数
    if (!id) {
      throw new Error('项目ID不能为空');
    }

    // 检查项目是否存在
    const meet = await MeetModel.getOne({ _id: id });
    if (!meet) {
        throw new Error('项目不存在');
    }

    // 删除项目
    await MeetModel.del(id);

    // 删除与项目相关的预约记录
    await JoinModel.del({ JOIN_MEET_ID: id });

    // 删除与项目相关的日期设置
    await DayModel.del({ DAY_MEET_ID: id });

    return true;
	}

	/**获取信息 */
	async getMeetDetail(id) {
		let fields = '*';

		let where = {
			_id: id
		}
		let meet = await MeetModel.getOne(where, fields);
		if (!meet) return null;

		let meetService = new MeetService();
		meet.MEET_DAYS_SET = await meetService.getDaysSet(id, timeUtil.time('Y-M-D')); //今天及以后

		return meet;
	}

	/**
	 * 更新富文本详细的内容及图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateMeetContent({
		meetId,
		content // 富文本数组
	}) {
    // 校验参数
    if (!meetId || !content) {
      throw new Error('项目ID和富文本内容不能为空');
    }

    // 获取项目信息
    const meet = await MeetModel.getOne({ _id: meetId });
    if (!meet) {
        throw new Error('项目不存在');
    }

    // 提取富文本中的图片URL
    const urls = [];
    content.forEach(item => {
        if (item.type === 'image' && item.url) {
            urls.push(item.url);
        }
    });

    // 更新富文本内容
    const data = {
        MEET_CONTENT: content,
        MEET_EDIT_TIME: timeUtil.time(),
    };

    // 保存更新
    await MeetModel.edit(meetId, data);

    return urls;
	}

	/**
	 * 更新封面内容及图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateMeetStyleSet({
		meetId,
		styleSet
	}) {
    // 校验参数
    if (!meetId || !styleSet) {
      throw new Error('项目ID和封面设置不能为空');
    }

    // 获取项目信息
    const meet = await MeetModel.getOne({ _id: meetId });
    if (!meet) {
        throw new Error('项目不存在');
    }

    // 提取封面设置中的图片URL
    const urls = [];
    if (styleSet.coverImage) {
        urls.push(styleSet.coverImage);
    }
    if (styleSet.backgroundImage) {
        urls.push(styleSet.backgroundImage);
    }

    // 更新封面设置
    const data = {
        MEET_STYLE_SET: styleSet,
        MEET_EDIT_TIME: timeUtil.time(),
    };

    // 保存更新
    await MeetModel.edit(meetId, data);

    return urls;
	}

	/** 更新日期设置 */
	async _editDays(meetId, nowDay, daysSetData) {
    // 校验参数
    if (!meetId || !nowDay || !daysSetData) {
      throw new Error('项目ID、当前日期和日期设置数据不能为空');
    }

    // 获取项目信息
    const meet = await MeetModel.getOne({ _id: meetId });
    if (!meet) {
        throw new Error('项目不存在');
    }

    // 更新日期设置
    const data = {
        MEET_DAYS_SET: daysSetData,
        MEET_EDIT_TIME: timeUtil.time(),
    };

    // 保存更新
    return await MeetModel.edit(meetId, data);
	}

	/**更新数据 */
	async editMeet({
		id,
		title,
		typeId,
		typeName,
		order,
		daysSet,
		isShowLimit,
		formSet
	}) {
    // 校验参数
    if (!id || !title || !typeId || !typeName) {
      throw new Error('项目ID、标题、类型ID和类型名称不能为空');
    }

    // 获取项目信息
    const meet = await MeetModel.getOne({ _id: id });
    if (!meet) {
        throw new Error('项目不存在');
    }

    // 构建更新数据
    const data = {
        MEET_TITLE: title,
        MEET_TYPE_ID: typeId,
        MEET_TYPE_NAME: typeName,
        MEET_ORDER: order || 0,
        MEET_DAYS: daysSet || [],
        MEET_IS_SHOW_LIMIT: isShowLimit || false,
        MEET_FORM_SET: formSet || {},
        MEET_EDIT_TIME: timeUtil.time(),
    };

    // 保存更新
    return await MeetModel.edit(id, data);
	}

	/**预约名单分页列表 */
	async getJoinList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		meetId,
		mark,
		page,
		size,
		isTotal = true,
		oldTotal
	}) {

		orderBy = orderBy || {
			'JOIN_EDIT_TIME': 'desc'
		};
		let fields = 'JOIN_IS_CHECKIN,JOIN_CODE,JOIN_ID,JOIN_REASON,JOIN_USER_ID,JOIN_MEET_ID,JOIN_MEET_TITLE,JOIN_MEET_DAY,JOIN_MEET_TIME_START,JOIN_MEET_TIME_END,JOIN_MEET_TIME_MARK,JOIN_FORMS,JOIN_STATUS,JOIN_EDIT_TIME';

		let where = {
			JOIN_MEET_ID: meetId,
			JOIN_MEET_TIME_MARK: mark
		};
		if (util.isDefined(search) && search) {
			where['JOIN_FORMS.val'] = {
				$regex: '.*' + search,
				$options: 'i'
			};
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status':
					// 按类型
					sortVal = Number(sortVal);
					if (sortVal == 1099) //取消的2种
						where.JOIN_STATUS = ['in', [10, 99]]
					else
						where.JOIN_STATUS = Number(sortVal);
					break;
				case 'checkin':
					// 签到
					where.JOIN_STATUS = JoinModel.STATUS.SUCC;
					if (sortVal == 1) {
						where.JOIN_IS_CHECKIN = 1;
					} else {
						where.JOIN_IS_CHECKIN = 0;
					}
					break;
			}
		}

		return await JoinModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/**预约项目分页列表 */
	async getMeetList({
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
			'MEET_ORDER': 'asc',
			'MEET_ADD_TIME': 'desc'
		};
		let fields = 'MEET_TYPE,MEET_TYPE_NAME,MEET_TITLE,MEET_STATUS,MEET_DAYS,MEET_ADD_TIME,MEET_EDIT_TIME,MEET_ORDER';

		let where = {};
		if (util.isDefined(search) && search) {
			where.MEET_TITLE = {
				$regex: '.*' + search,
				$options: 'i'
			};
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status':
					// 按类型
					where.MEET_STATUS = Number(sortVal);
					break;
				case 'typeId':
					// 按类型
					where.MEET_TYPE_ID = sortVal;
					break;
				case 'sort':
					// 排序
					if (sortVal == 'view') {
						orderBy = {
							'MEET_VIEW_CNT': 'desc',
							'MEET_ADD_TIME': 'desc'
						};
					}

					break;
			}
		}

		return await MeetModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/** 删除 */
	async delJoin(joinId) {
    // 校验参数
    if (!joinId) {
      throw new Error('预约记录ID不能为空');
    }

    // 检查预约记录是否存在
    const join = await JoinModel.getOne({ _id: joinId });
    if (!join) {
        throw new Error('预约记录不存在');
    }

    // 删除预约记录
    await JoinModel.del(joinId);

    return true;
	}

	/**修改报名状态 
	 * 特殊约定 99=>正常取消 
	 */
	async statusJoin(admin, joinId, status, reason = '') {
      // 校验参数
      if (!joinId || !status) {
          throw new Error('报名记录ID和目标状态不能为空');
      }

      // 获取报名记录
      const join = await JoinModel.getOne({ _id: joinId });
      if (!join) {
          throw new Error('报名记录不存在');
      }

      // 更新状态
      const data = {
          JOIN_STATUS: status,
          JOIN_EDIT_TIME: timeUtil.time(),
      };

      // 如果是取消状态，记录原因
      if (status === 99 && reason) {
          data.JOIN_REASON = reason;
      }

      // 保存更新
      return await JoinModel.edit(joinId, data);
	}

	/**修改项目状态 */
	async statusMeet(id, status) {
      // 校验参数
      if (!id || !status) {
          throw new Error('项目ID和目标状态不能为空');
      }

      // 获取项目信息
      const meet = await MeetModel.getOne({ _id: id });
      if (!meet) {
          throw new Error('项目不存在');
      }

      // 更新状态
      const data = {
          MEET_STATUS: status,
          MEET_EDIT_TIME: timeUtil.time(),
      };

      // 保存更新
      return await MeetModel.edit(id, data);
	}

	/**置顶排序设定 */
	async sortMeet(id, sort) {
      // 校验参数
      // if (!id || !sort) {
      //     throw new Error('项目ID和排序值不能为空');
      // }

      // 获取项目信息
      const meet = await MeetModel.getOne({ _id: id });
      if (!meet) {
          throw new Error('项目不存在');
      }

      // 更新排序值
      const data = {
          MEET_ORDER: sort,
          MEET_EDIT_TIME: timeUtil.time(),
      };

      // 保存更新
      return await MeetModel.edit(id, data);
	}
}

module.exports = AdminMeetService;