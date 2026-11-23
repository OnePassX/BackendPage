/**
 * 快捷创建表单共用的下拉选项。
 *
 * 取值与 `src/app/device/index.tsx`、`src/app/exhibition/code.tsx` 保持一致，
 * 单独放一份是为了**不修改**这些管理页（它们的常量未导出）。
 */

export const ShowItems = [
    { label: '显示', value: '1' },
    { label: '隐藏', value: '2' },
];

export const StatusItems = [
    { label: '启用', value: '1' },
    { label: '禁用', value: '2' },
];

export const AreaItems = [
    { label: '无绑定', value: '0' },
    { label: '展项设备', value: '1' },
    { label: '展厅设备', value: '2' },
];

export const DeviceTypeItems = [
    { label: '继电器', value: '1' }, { label: '串口服务器', value: '2' }, { label: '电脑主机', value: '3' },
    { label: '一体机', value: '4' }, { label: 'LED屏幕', value: '5' }, { label: '拼接屏幕', value: '6' },
    { label: '投影机', value: '7' }, { label: '窗帘控制器', value: '8' }, { label: '电动门控制器', value: '9' },
    { label: '照明灯光', value: '10' }, { label: '氛围灯光', value: '11' }, { label: 'PDU', value: '12' },
    { label: '空调设备', value: '13' }, { label: '监控设备', value: '14' }, { label: '其他', value: '15' },
];

export const ProbeItems = [
    { label: '不启用', value: '0' },
    { label: '启用探活', value: '1' },
];

export const CodeTypeItems = [
    { label: '设备开机', value: '1' }, { label: '设备关机', value: '2' }, { label: '电动门开启', value: '3' },
    { label: '电动门关闭', value: '4' }, { label: '灯光开启', value: '5' }, { label: '灯光关闭', value: '6' },
    { label: '灯光场景', value: '7' }, { label: '投影开启', value: '8' }, { label: '投影关闭', value: '9' },
    { label: '其他', value: '10' },
];

export const CodeFormatItems = [
    { label: '字符串', value: '1' }, { label: '16进制', value: '2' }, { label: '网络唤醒', value: '3' }, { label: '远程关机', value: '4' },
];

export const CodeProtocalItems = [
    { label: 'TCP Client', value: '1' }, { label: 'TCP Server', value: '2' }, { label: 'UDP Client', value: '3' }, { label: 'UDP Server', value: '4' },
    { label: 'HTTP POST', value: '5' }, { label: 'HTTP GET', value: '6' }, { label: 'HTTP Server', value: '7' }, { label: 'IO Server', value: '8' },
    { label: '其他', value: '9' },
];

/** 内容文件状态：1 中控服务器存储 / 2 展项客户端存储 / 3 其他 */
export const FileStatusItems = [
    { label: '中控服务器存储', value: '1' },
    { label: '展项客户端存储', value: '2' },
    { label: '其他', value: '3' },
];

export const FileTypeItems = [
    { label: '程序文件', value: '1' },
    { label: '视频文件', value: '2' },
    { label: '图片文件', value: '3' },
    { label: '文档文件', value: '4' },
    { label: '网页地址', value: '5' },
    { label: '其他', value: '6' },
];

/** 只有「电脑主机(3)」「一体机(4)」支持探活，规则同设备管理页 */
export const PROBE_ENABLED_DTYPES = [3, 4];
