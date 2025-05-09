/**
 * 订单提交API
 * 
 * 此文件用于模拟订单提交API的行为
 * 实际项目中应替换为真实的API调用
 */

// 订单提交API
export async function submitOrder(orderData) {
    // 模拟API延迟
    return new Promise((resolve) => {
        setTimeout(() => {
            // 计算照片总数
            const totalPhotos = orderData.photos.length;
            
            // 返回模拟的响应数据
            resolve({
                success: true,
                data: {
                    order_sn: orderData.order_sn,
                    total: totalPhotos,
                    receiver: orderData.receiver,
                    timestamp: Date.now()
                },
                message: '订单提交成功'
            });
        }, 1200); // 模拟网络延迟
    });
} 