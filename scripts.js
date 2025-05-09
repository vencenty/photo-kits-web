// 照片上传API
async function uploadPhoto(file, size) {
    try {
        // 创建FormData对象
        const formData = new FormData();
        formData.append('file', file);

        // 添加头信息
        const headers = {
            'Country': 'DE',
            'Lang': 'en',
            'X-Sign': 'apikey'
        };

        // 调用实际API
        const response = await fetch('http://localhost:8888/api/photo/upload', {
            method: 'POST',
            headers: headers,
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // 如果API返回格式不同，请根据实际情况调整
        return {
            success: true,
            data: {
                id: 'photo_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                url: data.url || URL.createObjectURL(file), // 使用服务器返回的URL或本地URL
                name: file.name,
                size: size
            },
            message: '上传成功'
        };
    } catch (error) {
        console.error('上传失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// 删除照片API
async function apiDeletePhoto(photoId) {
    // 实际项目中可能需要调用真实的删除API
    // 这里暂时使用模拟API
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                message: '删除成功'
            });
        }, 300);
    });
}

// 订单提交API
async function submitOrder(orderData) {
    try {
        // 转换数据格式为API要求的格式
        const apiData = {
            order_sn: orderData.order_sn,
            remark: orderData.remark,
            receiver: orderData.receiver,
            photos: []
        };

        // 按照API要求的格式组织照片数据
        // 首先按照尺寸分组
        const photosBySize = {};

        orderData.photos.forEach(photo => {
            // 从尺寸值（如"3寸-满版"）中提取数字部分
            const sizeMatch = photo.size.match(/(\d+)/);
            if (!sizeMatch) return;

            const sizeNumber = parseInt(sizeMatch[1]);
            const isFull = photo.size.includes('满版');
            const unit = 'inch'; // 使用inch作为单位

            // 创建尺寸键
            const sizeKey = `${sizeNumber}_${unit}_${isFull ? 'full' : 'space'}`;

            if (!photosBySize[sizeKey]) {
                photosBySize[sizeKey] = {
                    size: sizeNumber,
                    unit: unit,
                    urls: []
                };
            }

            // 添加URL到对应尺寸组
            photosBySize[sizeKey].urls.push(photo.url);
        });

        // 将分组后的数据添加到API数据中
        apiData.photos = Object.values(photosBySize);

        // 添加头信息
        const headers = {
            'Country': 'DE',
            'Lang': 'en',
            'X-Sign': 'apikey',
            'Content-Type': 'application/json'
        };

        // 调用实际API
        const response = await fetch('http://localhost:8888/api/photo/submit', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(apiData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // 返回处理后的响应
        return {
            success: true,
            data: {
                order_sn: orderData.order_sn,
                total: orderData.photos.length, // 如果API不返回总数，使用本地计算的总数
                receiver: orderData.receiver,
                timestamp: Date.now()
            },
            message: '订单提交成功'
        };
    } catch (error) {
        console.error('提交失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // 照片数据存储
    const photoData = {
        sizes: {},
        totalCount: 0
    };

    // 获取DOM元素
    const checkboxes = document.querySelectorAll('input[name="sizes"]');
    const uploadSection = document.getElementById('upload-section');
    const totalPhotoCount = document.getElementById('total-photo-count');
    const submitButton = document.getElementById('submit-button');

    // 确认弹窗相关元素
    const confirmModal = document.getElementById('confirm-modal');
    const confirmDetails = document.getElementById('confirm-details');
    const confirmSubmit = document.getElementById('confirm-submit');
    const cancelSubmit = document.getElementById('cancel-submit');
    const closeButtons = document.querySelectorAll('.close');

    // 结果弹窗相关元素
    const resultModal = document.getElementById('result-modal');
    const resultDetails = document.getElementById('result-details');
    const closeResult = document.getElementById('close-result');

    // 初始化尺寸数据
    checkboxes.forEach(checkbox => {
        const sizeValue = checkbox.value;
        photoData.sizes[sizeValue] = {
            photos: [],
            count: 0
        };
    });

    // 选择尺寸时的处理
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateUploadSection();
        });
    });

    // 更新上传区域
    function updateUploadSection() {
        uploadSection.innerHTML = '';

        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const sizeValue = checkbox.value;
                const uploadContainer = createUploadContainer(sizeValue);
                uploadSection.appendChild(uploadContainer);
            }
        });
    }

    // 创建上传容器
    function createUploadContainer(sizeValue) {
        const container = document.createElement('div');
        container.className = 'upload-container';
        container.id = `upload-container-${sizeValue.replace(/[^a-zA-Z0-9]/g, '-')}`;

        const title = document.createElement('h3');
        title.textContent = `${sizeValue} 照片上传`;

        const uploadArea = document.createElement('div');
        uploadArea.className = 'upload-area';

        const uploadLabel = document.createElement('span');
        uploadLabel.className = 'upload-label';
        uploadLabel.textContent = '点击或拖拽照片到此处上传';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = 'image/*';
        fileInput.setAttribute('data-size', sizeValue);
        fileInput.addEventListener('change', handleFileUpload);

        const previewContainer = document.createElement('div');
        previewContainer.className = 'photo-preview';
        previewContainer.id = `preview-${sizeValue.replace(/[^a-zA-Z0-9]/g, '-')}`;

        // 添加已有照片的预览
        if (photoData.sizes[sizeValue] && photoData.sizes[sizeValue].photos.length > 0) {
            photoData.sizes[sizeValue].photos.forEach(photo => {
                const photoItem = createPhotoItem(photo, sizeValue);
                previewContainer.appendChild(photoItem);
            });
        }

        uploadArea.appendChild(uploadLabel);
        uploadArea.appendChild(fileInput);

        container.appendChild(title);
        container.appendChild(uploadArea);
        container.appendChild(previewContainer);

        return container;
    }

    // 处理文件上传
    async function handleFileUpload(event) {
        const files = event.target.files;
        const sizeValue = event.target.getAttribute('data-size');

        if (files.length === 0) return;

        const sizeData = photoData.sizes[sizeValue];
        const previewContainer = document.getElementById(`preview-${sizeValue.replace(/[^a-zA-Z0-9]/g, '-')}`);

        // 上传到服务器
        for (const file of Array.from(files)) {
            // 检查文件是否为图片
            if (!file.type.match('image.*')) {
                alert('请选择图片文件！');
                continue;
            }

            try {
                // 调用上传API
                const response = await uploadPhoto(file, sizeValue);

                if (response.success) {
                    const photoInfo = response.data;

                    // 将照片添加到数据中
                    sizeData.photos.push(photoInfo);
                    sizeData.count = sizeData.photos.length;

                    // 更新计数
                    updatePhotoCount(sizeValue);

                    // 添加预览
                    const photoItem = createPhotoItem(photoInfo, sizeValue);
                    previewContainer.appendChild(photoItem);
                } else {
                    alert(`上传失败: ${response.message || '未知错误'}`);
                }
            } catch (error) {
                console.error('上传出错:', error);
                alert('上传过程中发生错误，请重试！');
            }
        }

        // 清空文件输入，以便可以上传相同的文件
        event.target.value = null;
    }

    // 创建照片预览项
    function createPhotoItem(photoData, sizeValue) {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.id = photoData.id;

        const img = document.createElement('img');
        img.src = photoData.url;
        img.alt = photoData.name;

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-photo';
        deleteButton.innerHTML = '&times;';
        deleteButton.addEventListener('click', function() {
            deletePhoto(photoData.id, sizeValue);
        });

        photoItem.appendChild(img);
        photoItem.appendChild(deleteButton);

        return photoItem;
    }

    // 删除照片
    async function deletePhoto(photoId, sizeValue) {
        const sizeData = photoData.sizes[sizeValue];
        const photoIndex = sizeData.photos.findIndex(photo => photo.id === photoId);

        if (photoIndex !== -1) {
            try {
                // 调用删除API
                const response = await apiDeletePhoto(photoId);

                if (response.success) {
                    // 从数组中移除照片
                    sizeData.photos.splice(photoIndex, 1);
                    sizeData.count = sizeData.photos.length;

                    // 移除预览
                    const photoItem = document.getElementById(photoId);
                    if (photoItem) {
                        photoItem.remove();
                    }

                    // 更新计数
                    updatePhotoCount(sizeValue);
                } else {
                    alert(`删除失败: ${response.message || '未知错误'}`);
                }
            } catch (error) {
                console.error('删除出错:', error);
                alert('删除过程中发生错误，请重试！');
            }
        }
    }

    // 更新照片计数
    function updatePhotoCount(sizeValue) {
        const sizeData = photoData.sizes[sizeValue];
        const countElement = document.getElementById(`count-${sizeValue.replace(/[^a-zA-Z0-9]/g, '-')}`);

        if (countElement) {
            countElement.textContent = `${sizeData.count}张`;
        }

        // 更新总计数
        updateTotalCount();
    }

    // 更新总照片计数
    function updateTotalCount() {
        let total = 0;

        Object.values(photoData.sizes).forEach(sizeData => {
            total += sizeData.count;
        });

        photoData.totalCount = total;
        totalPhotoCount.textContent = total;
    }

    // 提交按钮点击事件
    submitButton.addEventListener('click', function() {
        // 检查是否有上传的照片
        if (photoData.totalCount === 0) {
            alert('请至少上传一张照片！');
            return;
        }

        // 准备确认弹窗内容
        confirmDetails.innerHTML = '';

        // 添加表单信息
        const orderSn = document.getElementById('order_sn').value;
        const receiver = document.getElementById('receiver').value;

        if (!orderSn || !receiver) {
            alert('请填写订单号和收货人信息！');
            return;
        }

        const formInfo = document.createElement('div');
        formInfo.innerHTML = `
            <p><strong>订单号：</strong>${orderSn}</p>
            <p><strong>收货人：</strong>${receiver}</p>
        `;
        confirmDetails.appendChild(formInfo);

        // 添加尺寸信息
        const sizeInfo = document.createElement('div');
        sizeInfo.className = 'size-summary';
        sizeInfo.innerHTML = '<h3>照片尺寸与数量：</h3>';

        const sizeList = document.createElement('ul');

        Object.entries(photoData.sizes).forEach(([size, data]) => {
            if (data.count > 0) {
                const listItem = document.createElement('li');
                listItem.textContent = `${size}: ${data.count}张`;
                sizeList.appendChild(listItem);
            }
        });

        sizeInfo.appendChild(sizeList);
        confirmDetails.appendChild(sizeInfo);

        // 添加总数
        const totalInfo = document.createElement('p');
        totalInfo.className = 'total-summary';
        totalInfo.innerHTML = `<strong>总计：</strong>${photoData.totalCount}张照片`;
        confirmDetails.appendChild(totalInfo);

        // 显示确认弹窗
        confirmModal.style.display = 'block';
    });

    // 确认提交事件
    confirmSubmit.addEventListener('click', async function() {
        // 关闭确认弹窗
        confirmModal.style.display = 'none';

        // 获取表单数据
        const orderSn = document.getElementById('order_sn').value;
        const receiver = document.getElementById('receiver').value;
        const remark = document.getElementById('remark').value;

        // 准备要提交的数据
        const submitData = {
            order_sn: orderSn,
            receiver: receiver,
            remark: remark,
            photos: []
        };

        // 添加照片数据
        Object.entries(photoData.sizes).forEach(([size, data]) => {
            if (data.count > 0) {
                data.photos.forEach(photo => {
                    submitData.photos.push({
                        size: size,
                        url: photo.url,
                        id: photo.id
                    });
                });
            }
        });

        try {
            // 显示加载中状态
            const loadingMessage = document.createElement('div');
            loadingMessage.className = 'loading-message';
            loadingMessage.textContent = '提交中，请稍候...';
            document.body.appendChild(loadingMessage);

            // 调用提交API
            const response = await submitOrder(submitData);

            // 移除加载中状态
            document.body.removeChild(loadingMessage);

            if (response.success) {
                // 显示结果弹窗
                resultDetails.innerHTML = `
                    <p>您的订单已成功提交！</p>
                    <p>总共上传了 ${response.data.total} 张照片。</p>
                `;
                resultModal.style.display = 'block';
            } else {
                alert(`提交失败: ${response.message || '未知错误'}`);
            }
        } catch (error) {
            console.error('提交出错:', error);
            alert('提交过程中发生错误，请重试！');
        }
    });

    // 取消提交事件
    cancelSubmit.addEventListener('click', function() {
        confirmModal.style.display = 'none';
    });

    // 关闭结果弹窗事件
    closeResult.addEventListener('click', function() {
        resultModal.style.display = 'none';
    });

    // 关闭按钮事件
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // 点击模态框背景时关闭
    window.addEventListener('click', function(event) {
        if (event.target === confirmModal) {
            confirmModal.style.display = 'none';
        } else if (event.target === resultModal) {
            resultModal.style.display = 'none';
        }
    });
});
