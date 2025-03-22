/**
 * Notes: 设置管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2021-07-11 07:48:00 
 */

const BaseAdminService = require('./base_admin_service.js');
const cloudBase = require('../../../framework/cloud/cloud_base.js');
const cloudUtil = require('../../../framework/cloud/cloud_util.js');
const SetupModel = require('../../model/setup_model.js');
const config = require('../../../config/config.js');

class AdminSetupService extends BaseAdminService {


	/** 关于我们 */
	async setupAbout({
		about,
		aboutPic
	}) {
    // 参数校验
    if (typeof about !== 'string' || about.trim().length === 0) {
        throw new Error('关于我们内容不能为空');
    }

    // 构建更新数据
    const data = {
        SETUP_ABOUT: about.trim(),
        SETUP_ABOUT_PIC: aboutPic,
        SETUP_EDIT_TIME: Date.now()
    };

    // 更新数据库中的第一条记录
    return await SetupModel.edit({}, data);
	}

	/** 联系我们设置 */
	async setupContact({
    phone,
    address,
    servicePic,
		officePic
	}) {
		// 校验参数
		if (typeof address !== 'string' || typeof phone !== 'string' || 
			!Array.isArray(officePic) || !Array.isArray(servicePic)) {
			throw new Error('参数格式不正确');
		}

		// 构建更新数据
		const data = {
			SETUP_ADDRESS: address,
			SETUP_PHONE: phone,
			SETUP_OFFICE_PIC: officePic,
			SETUP_SERVICE_PIC: servicePic,
			SETUP_EDIT_TIME: Date.now()
		};

		// 更新数据库
		return await SetupModel.edit({}, data);
	}

	/** 小程序码 */
	async genMiniQr() {
		//生成小程序qr buffer
		let cloud = cloudBase.getCloud();

		let page = "projects/" + this.getProjectId() + "/default/index/default_index";
		console.log(page);

		let result = await cloud.openapi.wxacode.getUnlimited({
			scene: 'qr',
			width: 280,
			check_path: false,
			env_version: 'release', //trial,develop
			page
		});

		let upload = await cloud.uploadFile({
			cloudPath: config.SETUP_PATH + 'qr.png',
			fileContent: result.buffer,
		});

		if (!upload || !upload.fileID) return;

		return upload.fileID;
	}

}

module.exports = AdminSetupService;