import axios from 'axios';

/**
 * 整馆控制接口（/main/api/*）专用的 axios 实例。
 *
 * 注意：这里**不能**用 `axios.defaults.baseURL = ...` 全局赋值 ——
 * `apiClient.js` 里的 `axios.create({...})` 没有显式 baseURL，会继承全局默认值；
 * 一旦本模块比 apiClient 先加载，全站 /api/* 请求都会被指向这个硬编码地址。
 */
const quickClient = axios.create({
  baseURL: 'http://192.168.4.43:8004',
});

// 整馆信息接口
export const getEhMessage = () => {
  return quickClient({
    url:'/main/api/eh_message',
    method:'post',
  });
}


// 登录接口
export const getLogin = (params) => {
  return quickClient({
    url:'/main/api/login',
    method:'post',
    data:JSON.stringify(params),
    headers:{
      'Content-Type':'application/form-data'
    }
  });
}

// 获取激活信息接口
export const getActiveInfo = () => {
  return quickClient({
    url:'/main/api/ehActive',
    method:'get',
  });
}

// 修改激活信息接口
export const updateActiveInfo = (params) => {
  return quickClient({
    url:'/main/api/ehActive',
    method:'post',
    data:params,
    headers:{
      'Content-Type':'application/form-data'
    }
  });
}

// 获取欢迎词
export const get_Welcome = () => {
  return quickClient({
    url:'/main/api/get_welcome_txt',
    method:'get',
  });
}

// 修改欢迎词
export const set_Welcome = (msg) => {
  const formData = new FormData();
  formData.append('msg',msg)
  return quickClient({
    url:'/main/api/get_welcome_txt',
    method:'post',
    data:formData,
    headers:{
      'Content-Type':'application/form-data'
    }
  });
}

//获取整馆软件模式
export const get_Model_List = () => {
  return quickClient({
    url:'/main/api/getModelList',
    method:'post',
    headers:{
      'Content-Type':'application/json'
    }
  });
}

//获取整馆硬件模式
export const get_HwModel_List = () => {
  return quickClient({
    url:'/main/api/getHwModelList',
    method:'post',
    headers:{
      'Content-Type':'application/form-data'
    }
  });
}

// 获取当前硬件模式
export const get_Now_HwModel = () => {
  return quickClient({
    url:'/main/api/getNowHwModel',
    method:'post',
    headers:{
      'Content-Type':'application/form-data'
    }
  });
}

// 切换整馆硬件模式
export const change_Global_HwModel = (model_id) => {
  const formData = new FormData();
  formData.append('modelId',Number(model_id))
  return quickClient({
    url:'/main/api/changeGlobalHwModel',
    method:'post',
    data:formData,
    headers:{
      'Content-Type':'application/form-data'
    }
  });
}

//获取展项列表
export const get_List = () => {
  return quickClient({
    url:'/main/api/getList',
    method:'post',
    headers:{
      'Content-Type':'application/json'
    }
  });
}

// 根据展项ID获取内容列表
export const get_Content_List = (id) => {
  const formData = new FormData();
  formData.append('id',Number(id))
  return quickClient({
    url:'/main/api/getContent',
    method:'post',
    data:formData,
    headers:{
      'Content-Type':'application/form-data'
    }
  });
}

// 根据展项ID,修改讲解词
export const update_Note = (id,note) => {
  const formData = new FormData();
  formData.append('id',Number(id))
  formData.append('note',note)
  return quickClient({
    url:'/main/api/updateNote',
    method:'post',
    data:formData,
    headers:{
      'Content-Type':'application/form-data'
    }
  });
}

// 根据模式ID，展项ID获取绑定内容列表
export const get_Model_Bind_Content = (model_id,m_id,e_id) => {
  return quickClient({
    url:'/main/api/getModelBindContent',
    method:'post',
    data:{
      "model_id": Number(model_id),
      "m_id": Number(m_id),
      "e_id": Number(e_id),
    },
    headers:{
      'Content-Type':'application/json'
    }
  });
}

// 内容切换接口
export const change_Content = (params) => {
  return quickClient({
    url:'/main/api/changeContent',
    method:'post',
    data:params,
    headers:{
      'Content-Type':'application/json'
    }
  });
}

// 展项音频控制接口
export const change_Volume = (params) => {
  return quickClient({
    url:'/main/api/changeVolume',
    method:'post',
    data:params,
    headers:{
      'Content-Type':'application/json'
    }
  });
}

// 内容控制接口
export const message_To_Client = (params) => {
  return quickClient({
    url:'/main/api/messageToClient',
    method:'post',
    data:params,
    headers:{
      'Content-Type':'application/json'
    }
  });
}

// 硬件控制接口
export const code_To_Client = (code_id) => {
  const formData = new FormData();
  formData.append('codeId',Number(code_id))
  return quickClient({
    url:'/main/api/codeToClient',
    method:'post',
    data:formData,
    headers:{
      'Content-Type':'application/form-data'
    }
  });
}

// 改变整馆软件模式
export const change_Global_Model = (model_id) => {
  const formData = new FormData();
  formData.append('modelId',Number(model_id))
  return quickClient({
    url:'/main/api/changeGlobalModel',
    method:'post',
    data:formData,
    headers:{
      'Content-Type':'application/form-data'
    }
  });
}

// 图片上传
export const uploadimg = (file) => { 
  const formData = new FormData();
  formData.append('file',file)
  return quickClient({
    url:'/main/api/uploadimg',
    method:'post',
    data:formData,
    headers:{
      'Content-Type':'multipart/form-data'
    }
  });
}


// 展项硬件列表
export const get_Device = (id) => {
  const formData = new FormData();
  formData.append('id',Number(id))
  return quickClient({
    url:'/main/api/getDevice',
    method:'post',
    data:formData,
    headers:{
      'Content-Type':'application/form-data'
    }
  });
}

// 整馆设备及命令接口
export const get_Global_Device = () => {
  return quickClient({
    url:'/main/api/getGlobalDevice',
    method:'post',
    headers:{
      'Content-Type':'application/form-data'
    }
  });
}

// 根据设备ID查询设备控制命令
export const get_Device_Code = (id) => {
  const formData = new FormData();
  formData.append('id',Number(id))
  return quickClient({
    url:'/main/api/getDeviceCode',
    method:'post',
    data:formData,
    headers:{
      'Content-Type':'application/form-data'
    }
  });
}