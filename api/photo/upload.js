/**
 * 照片上传API
 * 
 * 此文件用于模拟照片上传API的行为
 * 实际项目中应替换为真实的API调用
 */

// 照片上传API
export async function uploadPhoto(file, size) {
    // 模拟API延迟
    return new Promise((resolve) => {
        setTimeout(() => {
            // 生成唯一ID
            const photoId = 'photo_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            
            // 在实际环境中，这里会是服务器返回的URL
            // 在前端模拟中，我们使用createObjectURL创建临时URL
            const photoUrl = URL.createObjectURL(file);
            
            // 返回模拟的响应数据
            resolve({
                success: true,
                data: {
                    id: photoId,
                    url: photoUrl,
                    name: file.name,
                    size: size
                },
                message: '上传成功'
            });
        }, 800); // 模拟网络延迟
    });
}

// 删除照片API
export async function deletePhoto(photoId) {
    // 模拟API延迟
    return new Promise((resolve) => {
        setTimeout(() => {
            // 返回模拟的响应数据
            resolve({
                success: true,
                message: '删除成功'
            });
        }, 300); // 模拟网络延迟
    });
} 